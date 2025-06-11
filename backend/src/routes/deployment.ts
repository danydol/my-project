import { Router, Response } from 'express';
import passport from 'passport';
import { body, param, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import deploymentService from '../services/deploymentService';
import databaseService from '../services/databaseService';

const router = Router();

// Middleware to authenticate all deployment routes
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /api/deployments:
 *   get:
 *     summary: Get user deployments
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user deployments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deployments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Deployment'
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const deployments = await deploymentService.getUserDeployments(req.user.id);
    
    res.json({
      success: true,
      deployments
    });
  } catch (error) {
    logger.error('Error getting deployments', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deployments'
    });
  }
});

/**
 * @swagger
 * /api/deployments:
 *   post:
 *     summary: Create a new deployment
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryId
 *               - cloudConnectionId
 *               - environment
 *               - region
 *             properties:
 *               repositoryId:
 *                 type: string
 *                 example: "repo_123"
 *               cloudConnectionId:
 *                 type: string
 *                 example: "cloud_456"
 *               environment:
 *                 type: string
 *                 example: "production"
 *               region:
 *                 type: string
 *                 example: "us-east-1"
 *               terraformVersion:
 *                 type: string
 *                 example: "1.0.0"
 *               variables:
 *                 type: object
 *                 example: {"instance_type": "t3.large"}
 *     responses:
 *       201:
 *         description: Deployment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deployment:
 *                   $ref: '#/components/schemas/Deployment'
 */
router.post('/', [
  body('repositoryId').notEmpty().withMessage('Repository ID is required'),
  body('cloudConnectionId').notEmpty().withMessage('Cloud connection ID is required'),
  body('environment').isIn(['dev', 'staging', 'production']).withMessage('Environment must be dev, staging, or production'),
  body('region').notEmpty().withMessage('Region is required'),
  body('terraformVersion').optional().isString(),
  body('variables').optional().isObject()
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const deployment = await deploymentService.createDeployment(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      deployment
    });
  } catch (error: any) {
    logger.error('Error creating deployment', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create deployment'
    });
  }
});

/**
 * @swagger
 * /api/deployments/{deploymentId}:
 *   get:
 *     summary: Get deployment status
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: deploymentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "deploy_123"
 *     responses:
 *       200:
 *         description: Deployment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deployment:
 *                   $ref: '#/components/schemas/Deployment'
 */
router.get('/:deploymentId', [
  param('deploymentId').notEmpty().withMessage('Deployment ID is required')
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deploymentId } = req.params;
    const deployment = await deploymentService.getDeploymentStatus(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Check if user owns this deployment
    if (deployment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    return res.json({
      success: true,
      deployment
    });
  } catch (error) {
    logger.error('Error getting deployment status', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get deployment status'
    });
  }
  // Fallback safeguard
  return res.status(500).json({
    success: false,
    error: 'Unknown error occurred'
  });
});

/**
 * @swagger
 * /api/deployments/{deploymentId}/destroy:
 *   post:
 *     summary: Destroy deployment
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: deploymentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "deploy_123"
 *     responses:
 *       200:
 *         description: Deployment destroyed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Deployment destroyed successfully"
 */
router.post('/:deploymentId/destroy', [
  param('deploymentId').notEmpty().withMessage('Deployment ID is required')
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deploymentId } = req.params;
    
    // Check if deployment exists and user owns it
    const deployment = await deploymentService.getDeploymentStatus(deploymentId);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    if (deployment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await deploymentService.destroyDeployment(deploymentId);
    
    return res.json({
      success: true,
      message: 'Deployment destroyed successfully'
    });
  } catch (error: any) {
    logger.error('Error destroying deployment', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to destroy deployment'
    });
  }
});

/**
 * @swagger
 * /api/deployments/available-resources:
 *   get:
 *     summary: Get available resources for deployment
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Available repositories and cloud connections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 repositories:
 *                   type: array
 *                   items:
 *                     type: object
 *                 cloudConnections:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/available-resources', async (req: any, res: Response) => {
  try {
    // Get user's repositories
    const repositories = await databaseService.getUserRepositories(req.user.id);
    
    // Get user's cloud connections
    const cloudConnections = await databaseService.getUserCloudConnections(req.user.id);
    
    res.json({
      success: true,
      repositories,
      cloudConnections
    });
  } catch (error) {
    logger.error('Error getting available resources', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available resources'
    });
  }
});

export default router; 