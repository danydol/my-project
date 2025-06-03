import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { logger } from '../utils/logger';
import databaseService from '../services/databaseService';

interface GitHubProfile {
  id: string;
  username?: string;
  displayName?: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  _json: {
    login: string;
    avatar_url: string;
    email?: string;
    name?: string;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export const setupPassport = (): void => {
  // GitHub OAuth Strategy
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL!,
    scope: ['user:email', 'repo', 'admin:repo_hook']
  },
  async (accessToken: string, refreshToken: string, profile: GitHubProfile, done: Function) => {
    try {
      logger.info('GitHub OAuth callback received', { username: profile.username });
      
      const githubId = profile.id;
      const username = profile.username || profile._json.login;
      const email = profile.emails?.[0]?.value || profile._json.email;
      const displayName = profile.displayName || profile._json.name;
      const avatar = profile.photos?.[0]?.value || profile._json.avatar_url;

      if (!email) {
        logger.error('GitHub profile missing email', { username });
        return done(new Error('GitHub profile must have a public email address'), null);
      }

      // Check if user already exists
      let user = await databaseService.findUserByGithubId(githubId);
      
      if (user) {
        // Update existing user's tokens and profile info
        user = await databaseService.updateUser(user.id, {
          githubAccessToken: accessToken,
          githubRefreshToken: refreshToken,
          avatar,
          displayName,
          isActive: true,
        });
        
        // Track login event
        await databaseService.trackEvent(user.id, null, 'user_login', {
          method: 'github_oauth',
          username: user.username,
        });
        
        logger.info('Existing user logged in', { userId: user.id, username: user.username });
      } else {
        // Create new user
        user = await databaseService.createUser({
          username,
          email,
          githubId,
          displayName,
          avatar,
          githubAccessToken: accessToken,
          githubRefreshToken: refreshToken,
        });
        
        // Track registration event
        await databaseService.trackEvent(user.id, null, 'user_registered', {
          method: 'github_oauth',
          username: user.username,
        });
        
        logger.info('New user registered', { userId: user.id, username: user.username });
      }
      
      return done(null, user);
    } catch (error) {
      logger.error('GitHub OAuth error', error);
      return done(error, null);
    }
  }));

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!,
    algorithms: ['HS256']
  },
  async (payload: JwtPayload, done: Function) => {
    try {
      // Fetch user from database using payload.id
      const user = await databaseService.findUserById(payload.id);
      
      if (!user) {
        logger.warn('JWT token valid but user not found', { userId: payload.id });
        return done(null, false);
      }

      if (!user.isActive) {
        logger.warn('JWT token valid but user is inactive', { userId: payload.id });
        return done(null, false);
      }
      
      // Track API access event (only periodically to avoid spam)
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Only track if no recent API access events (throttle analytics)
      const recentAccess = await databaseService.getUserAnalytics(user.id, 1);
      const hasRecentApiAccess = recentAccess.some(
        event => event.event === 'api_access' && event.timestamp > lastHour
      );
      
      if (!hasRecentApiAccess) {
        await databaseService.trackEvent(user.id, null, 'api_access', {
          endpoint: 'jwt_auth',
        });
      }
      
      return done(null, user);
    } catch (error) {
      logger.error('JWT Strategy error', error);
      return done(error, null);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done: Function) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done: Function) => {
    try {
      const user = await databaseService.findUserById(id);
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user', error);
      done(error, null);
    }
  });
}; 