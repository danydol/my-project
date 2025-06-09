import express from 'express';
import { body, param, validationResult } from 'express-validator';
import passport from 'passport';
import databaseService from '../services/databaseService';
import { EncryptionService } from '../utils/encryption';
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
 * /api/projects/{projectId}/settings:
 *   get:
 *     summary: Get project settings
 *     tags: [Project Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project settings retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:projectId/settings',
  requireAuth,
  [param('projectId').isString().notEmpty().withMessage('Project ID is required')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { projectId } = req.params;
      
      const project = await databaseService.getProjectById(projectId, req.user.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Return settings without exposing the actual token
      const settings = {
        id: project.id,
        name: project.name,
        description: project.description,
        defaultEnvironments: project.defaultEnvironments,
        multiCloud: project.multiCloud,
        hasGitHubToken: !!project.githubToken,
        githubTokenUpdatedAt: project.githubTokenUpdatedAt,
        tags: project.tags,
        icon: project.icon,
        color: project.color
      };

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('Error fetching project settings', { error, projectId: req.params.projectId, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project settings'
      });
    }
  }
);

/**
 * @swagger
 * /api/projects/{projectId}/settings/github-token:
 *   post:
 *     summary: Set GitHub token for project
 *     tags: [Project Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: GitHub Personal Access Token
 *     responses:
 *       200:
 *         description: GitHub token updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Project not found
 */
router.post('/:projectId/settings/github-token',
  requireAuth,
  [
    param('projectId').isString().notEmpty().withMessage('Project ID is required'),
    body('token').isString().notEmpty().withMessage('GitHub token is required')
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { projectId } = req.params;
      const { token } = req.body;
      
      // Verify project exists and user has access
      const project = await databaseService.getProjectById(projectId, req.user.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Validate GitHub token format (should start with ghp_, gho_, ghu_, ghs_, or ghr_)
      if (!token.match(/^gh[pousr]_[A-Za-z0-9_]{36,255}$/)) {
        res.status(400).json({
          success: false,
          error: 'Invalid GitHub token format. Please provide a valid Personal Access Token.'
        });
        return;
      }

      // Encrypt the token
      const encryptedToken = EncryptionService.encryptGitHubToken(token);

      // Update project with encrypted token
      await databaseService.updateProjectGitHubToken(projectId, encryptedToken);

      res.json({
        success: true,
        message: 'GitHub token updated successfully',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating GitHub token', { error, projectId: req.params.projectId, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update GitHub token'
      });
    }
  }
);

/**
 * @swagger
 * /api/projects/{projectId}/settings/github-token:
 *   delete:
 *     summary: Remove GitHub token from project
 *     tags: [Project Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: GitHub token removed successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:projectId/settings/github-token',
  requireAuth,
  [param('projectId').isString().notEmpty().withMessage('Project ID is required')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { projectId } = req.params;
      
      // Verify project exists and user has access
      const project = await databaseService.getProjectById(projectId, req.user.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Remove GitHub token
      await databaseService.removeProjectGitHubToken(projectId);

      res.json({
        success: true,
        message: 'GitHub token removed successfully'
      });
    } catch (error) {
      logger.error('Error removing GitHub token', { error, projectId: req.params.projectId, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to remove GitHub token'
      });
    }
  }
);

/**
 * @swagger
 * /api/projects/{projectId}/settings:
 *   patch:
 *     summary: Update project settings
 *     tags: [Project Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultEnvironments:
 *                 type: array
 *                 items:
 *                   type: string
 *               multiCloud:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project settings updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Project not found
 */
router.patch('/:projectId/settings',
  requireAuth,
  [param('projectId').isString().notEmpty().withMessage('Project ID is required')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      
      // Verify project exists and user has access
      const project = await databaseService.getProjectById(projectId, req.user.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Filter allowed updates
      const allowedUpdates = {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.defaultEnvironments && { defaultEnvironments: updates.defaultEnvironments }),
        ...(updates.multiCloud !== undefined && { multiCloud: updates.multiCloud }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.icon !== undefined && { icon: updates.icon }),
        ...(updates.color !== undefined && { color: updates.color })
      };

      // Update project settings
      const updatedProject = await databaseService.updateProjectSettings(projectId, allowedUpdates);

      res.json({
        success: true,
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          defaultEnvironments: updatedProject.defaultEnvironments,
          multiCloud: updatedProject.multiCloud,
          tags: updatedProject.tags,
          icon: updatedProject.icon,
          color: updatedProject.color,
          hasGitHubToken: !!updatedProject.githubToken,
          githubTokenUpdatedAt: updatedProject.githubTokenUpdatedAt
        }
      });
    } catch (error) {
      logger.error('Error updating project settings', { error, projectId: req.params.projectId, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update project settings'
      });
    }
  }
);

export default router; 