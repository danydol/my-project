import { Router } from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';

const jwt = require('jsonwebtoken');

const router = Router();

// GitHub OAuth initiation
router.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'repo', 'admin:repo_hook']
}));

// GitHub OAuth callback
router.get('/github/callback', 
  passport.authenticate('github', { session: false }),
  (req: any, res) => {
    try {
      const user = req.user;
      
      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      
    } catch (error) {
      logger.error('GitHub OAuth callback error', error);
      res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/auth/error`);
    }
  }
);

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), (req: any, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh token
router.post('/refresh', passport.authenticate('jwt', { session: false }), (req: any, res) => {
  try {
    const user = req.user;
    
    // Generate new JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token
    });
  } catch (error) {
    logger.error('Token refresh error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

export default router; 