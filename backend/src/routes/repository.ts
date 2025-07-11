import express from 'express';
import { query, body, param, validationResult } from 'express-validator';
import passport from 'passport';
import databaseService from '../services/databaseService';
import { repositoryAnalyzerService, RepositoryAnalysisRequest } from '../services/repositoryAnalyzerService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import deploymentService from '../services/deploymentService';

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

/**
 * @swagger
 * /api/repositories/analyze:
 *   post:
 *     summary: Start repository analysis
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repoUrl
 *             properties:
 *               repoUrl:
 *                 type: string
 *                 description: GitHub repository URL
 *     responses:
 *       200:
 *         description: Analysis started successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/analyze',
  requireAuth,
  [body('repoUrl').isString().notEmpty().withMessage('Repository URL is required')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
              const { repoUrl } = req.body;
        const analysisId = uuidv4();

        // Find the project this repository belongs to by parsing the repo from URL
        const repoPath = repoUrl.replace('https://github.com/', '');
        const repositories = await databaseService.getUserRepositories(req.user.id);
        const repository = repositories.find(r => r.fullName === repoPath);
        const projectId = repository?.projectId || undefined;

        const analysisRequest: RepositoryAnalysisRequest = {
          repoUrl,
          userId: req.user.id,
          analysisId,
          projectId
        };
        
        const analysis = await repositoryAnalyzerService.startAnalysis(analysisRequest);

      res.json({
        success: true,
        analysis: {
          analysisId: analysis.analysisId,
          repoId: analysis.repoId,
          status: analysis.status,
          progress: analysis.progress,
          currentStep: analysis.currentStep,
          startedAt: analysis.startedAt
        }
      });
    } catch (error) {
      logger.error('Error starting repository analysis', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start analysis'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/analysis/{analysisId}:
 *   get:
 *     summary: Get analysis status
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis status retrieved successfully
 *       404:
 *         description: Analysis not found
 */
router.get('/analysis/:analysisId',
  requireAuth,
  [param('analysisId').isUUID().withMessage('Invalid analysis ID')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { analysisId } = req.params;
      const analysis = repositoryAnalyzerService.getAnalysisStatus(analysisId);

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
        return;
      }

      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      logger.error('Error fetching analysis status', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analysis status'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/analyses:
 *   get:
 *     summary: Get all user analyses
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analyses retrieved successfully
 */
router.get('/analyses',
  requireAuth,
  async (req: any, res: express.Response) => {
    try {
      const analyses = repositoryAnalyzerService.getAllAnalyses();
      
      res.json({
        success: true,
        analyses
      });
    } catch (error) {
      logger.error('Error fetching analyses', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analyses'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/{repoId}/summary:
 *   get:
 *     summary: Get repository analysis summary
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository ID (owner/repo)
 *     responses:
 *       200:
 *         description: Repository summary retrieved successfully
 *       404:
 *         description: Repository analysis not found
 */
router.get('/:repoId/summary',
  requireAuth,
  async (req: any, res: express.Response) => {
    try {
      const repoId = decodeURIComponent(req.params.repoId);
      const summary = await repositoryAnalyzerService.getRepositorySummary(repoId);

      if (!summary) {
        res.status(404).json({
          success: false,
          error: 'Repository analysis not found'
        });
        return;
      }

      res.json({
        success: true,
        summary
      });
    } catch (error) {
      logger.error('Error fetching repository summary', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repository summary'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/{repoId}/search:
 *   post:
 *     summary: Search repository code
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository ID (owner/repo)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               limit:
 *                 type: integer
 *                 default: 10
 *                 description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.post('/:repoId/search',
  requireAuth,
  [
    body('query').isString().notEmpty().withMessage('Search query is required'),
    body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const repoId = decodeURIComponent(req.params.repoId);
      const { query, limit = 10 } = req.body;

      const results = await repositoryAnalyzerService.searchRepository(repoId, query, limit);

      res.json({
        success: true,
        results
      });
    } catch (error) {
      logger.error('Error searching repository', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to search repository'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/analysis/{analysisId}:
 *   delete:
 *     summary: Delete analysis
 *     tags: [Repository Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis deleted successfully
 *       404:
 *         description: Analysis not found
 */
router.delete('/analysis/:analysisId',
  requireAuth,
  [param('analysisId').isUUID().withMessage('Invalid analysis ID')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { analysisId } = req.params;
      await repositoryAnalyzerService.deleteAnalysis(analysisId);

      res.json({
        success: true,
        message: 'Analysis deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting analysis', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to delete analysis'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/imported-cloud-objects:
 *   get:
 *     summary: List all imported cloud objects across all repositories for the authenticated user
 *     tags: [Repositories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of imported cloud objects
 *       500:
 *         description: Server error
 */
router.get('/imported-cloud-objects',
  requireAuth,
  async (req: any, res: express.Response) => {
    try {
      const repositories = await databaseService.getUserRepositories(req.user.id);
      const importedObjects = [];
      for (const repo of repositories) {
        if (Array.isArray(repo.cloudObjects)) {
          for (const obj of repo.cloudObjects) {
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
              importedObjects.push({
                repositoryId: repo.id,
                repositoryName: repo.name,
                ...obj
              });
            }
          }
        }
      }
      res.json({
        success: true,
        importedObjects
      });
    } catch (error) {
      logger.error('Error listing imported cloud objects', { error, userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list imported cloud objects'
      });
    }
  }
);

/**
 * @swagger
 * /api/repositories/{repoId}/import-cloud-object:
 *   post:
 *     summary: Import a cloud object into a repository using Terraform import
 *     tags: [Repositories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cloudConnectionId
 *               - objectType
 *               - objectId
 *               - resourceType
 *               - resourceName
 *             properties:
 *               cloudConnectionId:
 *                 type: string
 *                 description: ID of the cloud connection to use
 *               objectType:
 *                 type: string
 *                 description: Type of cloud object (e.g., S3 Bucket, EC2 Instance)
 *               objectId:
 *                 type: string
 *                 description: ID of the cloud object to import
 *               resourceType:
 *                 type: string
 *                 description: Terraform resource type (e.g., aws_s3_bucket, aws_instance)
 *               resourceName:
 *                 type: string
 *                 description: Name for the Terraform resource
 *     responses:
 *       200:
 *         description: Cloud object imported successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
  '/:repoId/import-cloud-object',
  requireAuth,
  (req: express.Request, res: express.Response, next: express.NextFunction) => { req.setTimeout(300000); next(); }, // 5 minutes
  [
    param('repoId').isString().withMessage('Repository ID is required'),
    body('cloudConnectionId').isString().withMessage('Cloud connection ID is required'),
    body('objectType').isString().withMessage('Object type is required'),
    body('objectId').isString().withMessage('Object ID is required'),
    body('resourceType').isString().withMessage('Resource type is required'),
    body('resourceName').isString().withMessage('Resource name is required')
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const { repoId } = req.params;
      const { cloudConnectionId, objectType, objectId, resourceType, resourceName } = req.body;

      // Verify user has access to the repository
      const repositories = await databaseService.getUserRepositories(req.user.id);
      const repository = repositories.find(r => r.id === repoId);
      
      if (!repository) {
        return res.status(404).json({
          success: false,
          error: 'Repository not found'
        });
      }

      const result = await databaseService.importCloudObjectToRepository({
        repoId,
        cloudConnectionId,
        objectType,
        objectId,
        userId: req.user.id,
        resourceType,
        resourceName
      });

      return res.json({
        success: true,
        message: 'Cloud object imported successfully',
        logs: result.logs,
        stateFilePath: result.stateFilePath,
        terraformConfig: result.terraformConfig
      });
    } catch (error) {
      logger.error('Error importing cloud object', { error, userId: req.user?.id });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import cloud object'
      });
    }
  }
);

export default router; 