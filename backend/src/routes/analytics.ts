import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Middleware to authenticate all analytics routes
router.use(passport.authenticate('jwt', { session: false }));

// Placeholder for analytics routes
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Analytics routes ready' });
});

export default router; 