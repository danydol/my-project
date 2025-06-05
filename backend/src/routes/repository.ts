import express from 'express';
import { query, validationResult } from 'express-validator';
import passport from 'passport';
import databaseService from '../services/databaseService';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware to ensure user authentication
const requireAuth = passport.authenticate('jwt', { session: false });

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

/**
 * @swagger
 * /api/repositories:
 *   get:
 *     summary: Get user's repositories
 *     tags: [Repositories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unassigned
 *         schema:
 *           type: boolean
 *         description: Only return repositories not assigned to any project
 *     responses:
 *       200:
 *         description: User repositories retrieved successfully
 */
router.get('/', 
  requireAuth,
  [query('unassigned').optional().isBoolean().withMessage('unassigned must be a boolean')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const unassignedOnly = req.query.unassigned === 'true';
      
      let repositories;
      if (unassignedOnly) {
        repositories = await databaseService.getUnassignedRepositories(req.user.id);
      } else {
        repositories = await databaseService.getUserRepositories(req.user.id);
      }

      res.json({
        success: true,
        repositories
      });
    } catch (error) {
      logger.error('Error fetching repositories', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repositories'
      });
    }
  }
);

// Placeholder for repository analysis routes
router.get('/analyze/:owner/:repo', (req, res) => {
  res.json({ success: true, message: 'Repository analysis routes ready' });
});

export default router; 