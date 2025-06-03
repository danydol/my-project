import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Middleware to authenticate all infrastructure routes
router.use(passport.authenticate('jwt', { session: false }));

// Placeholder for infrastructure routes
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Infrastructure routes ready' });
});

export default router; 