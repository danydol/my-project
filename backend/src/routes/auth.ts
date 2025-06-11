import { Router } from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const jwt = require('jsonwebtoken');

const router = Router();

// GitHub OAuth initiation
router.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'repo', 'admin:repo_hook']
}));

// GitHub OAuth re-authentication (forces fresh consent)
router.get('/github/reauth', async (req: any, res) => {
  try {
    const user = req.user;
    
    // Clear GitHub tokens from database first
    if (user) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          githubAccessToken: null,
          githubRefreshToken: null
        }
      });
      
      await prisma.$disconnect();
      logger.info('GitHub tokens cleared for re-authentication', { userId: user.id });
    }
    
    // Force fresh GitHub OAuth flow
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.GITHUB_CALLBACK_URL!);
    const scopes = encodeURIComponent('user:email repo admin:repo_hook');
    const state = Math.random().toString(36).substring(7); // random state for security
    
    // GitHub OAuth URL with force approval
    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `prompt=consent&` +         // Force consent screen
      `allow_signup=true`;
    
    logger.info('Redirecting to GitHub for fresh authentication', { userId: user?.id || 'unknown' });
    res.redirect(githubAuthUrl);
    
  } catch (error) {
    logger.error('Error during GitHub re-authentication', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate re-authentication'
    });
  }
});

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

// Clear GitHub token and force re-authentication
router.post('/github/disconnect', passport.authenticate('jwt', { session: false }), async (req: any, res) => {
  try {
    const user = req.user;
    
    // Clear GitHub tokens from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubAccessToken: null,
        githubRefreshToken: null
      }
    });
    
    await prisma.$disconnect();
    
    logger.info('GitHub tokens cleared for re-authentication', { userId: user.id });
    
    res.json({
      success: true,
      message: 'GitHub tokens cleared. Please re-authenticate.'
    });
  } catch (error) {
    logger.error('Error clearing GitHub tokens', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear GitHub tokens'
    });
  }
});

// Generate SSH key for user
router.get('/ssh-key', passport.authenticate('jwt', { session: false }), (req: any, res) => {
  try {
    const user = req.user;
    
    // Generate SSH key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Create SSH public key in the format GitHub expects
    const sshPublicKey = `ssh-rsa ${Buffer.from(publicKey).toString('base64')} deployai-${user.username}@${new Date().toISOString().split('T')[0]}`;
    
    // Store the private key securely (encrypted) for future use
    // For now, we'll just return the public key
    // In production, you'd want to encrypt and store the private key
    
    logger.info('SSH key generated for user', { userId: user.id, username: user.username });
    
    res.json({
      success: true,
      sshKey: sshPublicKey,
      message: 'SSH key generated successfully. Copy this key and add it to your GitHub account.'
    });
  } catch (error) {
    logger.error('Error generating SSH key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SSH key'
    });
  }
});

export default router; 