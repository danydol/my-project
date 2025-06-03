import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Middleware to authenticate all AWS routes
router.use(passport.authenticate('jwt', { session: false }));

// Placeholder for AWS routes
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'AWS routes ready' });
});

export default router; 