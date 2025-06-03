import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Middleware to authenticate all repository routes
router.use(passport.authenticate('jwt', { session: false }));

// Placeholder for repository analysis routes
router.get('/analyze/:owner/:repo', (req, res) => {
  res.json({ success: true, message: 'Repository analysis routes ready' });
});

export default router; 