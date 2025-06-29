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
    
    return res.status(201).json({
      success: true,
      deployment
    });
  } catch (error: any) {
    logger.error('Error creating deployment', error);
    return res.status(500).json({
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

/**
 * @swagger
 * /api/deployments/{id}/progress:
 *   get:
 *     summary: Get deployment progress with detailed steps
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment ID
 *     responses:
 *       200:
 *         description: Deployment progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deployment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, deploying, deployed, failed, cancelled]
 *                     environment:
 *                       type: string
 *                     repository:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         owner:
 *                           type: string
 *                         branch:
 *                           type: string
 *                         commitSha:
 *                           type: string
 *                     cloudConnection:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         provider:
 *                           type: string
 *                         region:
 *                           type: string
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, running, completed, failed, skipped]
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                           duration:
 *                             type: number
 *                           error:
 *                             type: string
 *                     currentStep:
 *                       type: number
 *                     progress:
 *                       type: number
 *                     startTime:
 *                       type: string
 *                     estimatedEndTime:
 *                       type: string
 *                     deploymentUrl:
 *                       type: string
 *                     githubActionsUrl:
 *                       type: string
 *                     terraformLogs:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Deployment not found
 *       500:
 *         description: Server error
 */
router.get('/:id/progress', async (req: any, res: Response) => {
  try {
    const deploymentId = req.params.id;
    const deployment = await databaseService.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Get repository and cloud connection details
    const repository = await databaseService.getRepositoryById(deployment.repositoryId);
    const cloudConnection = await databaseService.getCloudConnectionById(deployment.cloudConnectionId);

    if (!repository || !cloudConnection) {
      return res.status(404).json({
        success: false,
        error: 'Repository or cloud connection not found'
      });
    }

    // Calculate progress based on deployment status
    let progress = 0;
    let currentStep = 0;
    let estimatedEndTime = null;

    switch (deployment.status) {
      case 'pending':
        progress = 0;
        currentStep = 0;
        break;
      case 'deploying':
        progress = 50;
        currentStep = 2;
        // Estimate 10 minutes from start
        estimatedEndTime = new Date(new Date(deployment.createdAt).getTime() + 10 * 60 * 1000).toISOString();
        break;
      case 'deployed':
        progress = 100;
        currentStep = 4;
        break;
      case 'failed':
        progress = 50;
        currentStep = 2;
        break;
      default:
        progress = 0;
        currentStep = 0;
    }

    // Define deployment steps
    const steps = [
      {
        id: 'init',
        name: 'Initialize Deployment',
        status: deployment.status === 'pending' ? 'pending' : 'completed',
        startTime: deployment.createdAt,
        endTime: deployment.status !== 'pending' ? new Date(new Date(deployment.createdAt).getTime() + 30 * 1000).toISOString() : undefined,
        duration: deployment.status !== 'pending' ? 30 : undefined
      },
      {
        id: 'clone',
        name: 'Clone Repository',
        status: ['pending'].includes(deployment.status) ? 'pending' : 
               ['deploying', 'deployed', 'failed'].includes(deployment.status) ? 'completed' : 'skipped',
        startTime: deployment.status !== 'pending' ? new Date(new Date(deployment.createdAt).getTime() + 30 * 1000).toISOString() : undefined,
        endTime: deployment.status !== 'pending' ? new Date(new Date(deployment.createdAt).getTime() + 60 * 1000).toISOString() : undefined,
        duration: deployment.status !== 'pending' ? 30 : undefined
      },
      {
        id: 'terraform',
        name: 'Terraform Infrastructure',
        status: deployment.status === 'pending' ? 'pending' : 
               deployment.status === 'deploying' ? 'running' :
               deployment.status === 'deployed' ? 'completed' :
               deployment.status === 'failed' ? 'failed' : 'skipped',
        startTime: deployment.status !== 'pending' ? new Date(new Date(deployment.createdAt).getTime() + 60 * 1000).toISOString() : undefined,
        endTime: deployment.status === 'deployed' ? deployment.deployedAt : undefined,
        duration: deployment.status === 'deployed' && deployment.deployedAt ? 
          Math.floor((new Date(deployment.deployedAt).getTime() - new Date(deployment.createdAt).getTime() - 60000) / 1000) : undefined,
        error: deployment.errorMessage
      },
      {
        id: 'deploy',
        name: 'Deploy Application',
        status: deployment.status === 'deployed' ? 'completed' : 'pending',
        startTime: deployment.status === 'deployed' ? deployment.deployedAt : undefined,
        endTime: deployment.status === 'deployed' ? new Date(new Date(deployment.deployedAt!).getTime() + 120 * 1000).toISOString() : undefined,
        duration: deployment.status === 'deployed' ? 120 : undefined
      }
    ];

    // Generate GitHub Actions URL
    const githubActionsUrl = `https://github.com/${repository.owner}/${repository.name}/actions`;

    // Mock Terraform logs (in real implementation, this would come from actual Terraform execution)
    const terraformLogs = deployment.status === 'deploying' || deployment.status === 'deployed' ? [
      'Initializing Terraform...',
      'Downloading provider plugins...',
      'Creating VPC...',
      'Creating security groups...',
      'Creating EC2 instance...',
      'Configuring application...',
      'Deployment completed successfully!'
    ] : [];

    const progressData = {
      id: deployment.id,
      name: deployment.name,
      status: deployment.status,
      environment: deployment.environment,
      repository: {
        name: repository.name,
        owner: repository.owner,
        branch: 'main', // This should come from the actual deployment
        commitSha: 'abc12345' // This should come from the actual deployment
      },
      cloudConnection: {
        name: cloudConnection.name,
        provider: cloudConnection.provider,
        region: cloudConnection.region
      },
      steps,
      currentStep,
      progress,
      startTime: deployment.createdAt,
      estimatedEndTime,
      deploymentUrl: deployment.deploymentUrl,
      githubActionsUrl,
      terraformLogs,
      errorMessage: deployment.errorMessage
    };

    return res.json({
      success: true,
      deployment: progressData
    });
  } catch (error: any) {
    logger.error('Error getting deployment progress', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get deployment progress'
    });
  }
});

/**
 * @swagger
 * /api/deployments/{id}/cancel:
 *   post:
 *     summary: Cancel a deployment
 *     tags: [Deployments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment ID
 *     responses:
 *       200:
 *         description: Deployment cancelled successfully
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
 *                   example: Deployment cancelled successfully
 *       404:
 *         description: Deployment not found
 *       400:
 *         description: Deployment cannot be cancelled
 *       500:
 *         description: Server error
 */
router.post('/:id/cancel', async (req: any, res: Response) => {
  try {
    const deploymentId = req.params.id;
    const deployment = await databaseService.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    if (deployment.status !== 'deploying' && deployment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Deployment cannot be cancelled in its current state'
      });
    }

    // Update deployment status to cancelled
    await databaseService.updateDeploymentStatus(deploymentId, 'cancelled', {
      errorMessage: 'Deployment cancelled by user'
    });

    return res.json({
      success: true,
      message: 'Deployment cancelled successfully'
    });
  } catch (error: any) {
    logger.error('Error cancelling deployment', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel deployment'
    });
  }
});

export default router; 