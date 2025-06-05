import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
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
 * /api/projects:
 *   get:
 *     summary: Get user's projects
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/', requireAuth, async (req: any, res: express.Response) => {
  try {
    const projects = await databaseService.getUserProjects(req.user.id);
    
    res.json({
      success: true,
      projects
    });
  } catch (error) {
    logger.error('Error fetching projects', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
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
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', 
  requireAuth,
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('slug').isLength({ min: 1, max: 50 }).matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
    body('defaultEnvironments').optional().isArray().withMessage('Default environments must be an array'),
    body('multiCloud').optional().isBoolean().withMessage('Multi-cloud must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const project = await databaseService.createProject({
        userId: req.user.id,
        ...req.body
      });

      res.status(201).json({
        success: true,
        project
      });
      return;
    } catch (error: any) {
      logger.error('Error creating project', { error, userId: req.user?.id });
      
      if (error.code === 'P2002') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Project slug already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create project'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', 
  requireAuth,
  [param('id').isString().withMessage('Invalid project ID')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const project = await databaseService.findProjectById(req.params.id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user owns the project
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        project
      });
      return;
    } catch (error) {
      logger.error('Error fetching project', { error, projectId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.put('/:id',
  requireAuth,
  [
    param('id').isString().withMessage('Invalid project ID'),
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
    body('defaultEnvironments').optional().isArray().withMessage('Default environments must be an array'),
    body('multiCloud').optional().isBoolean().withMessage('Multi-cloud must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      // Verify project ownership
      const existingProject = await databaseService.findProjectById(req.params.id);
      if (!existingProject || existingProject.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const project = await databaseService.updateProject(req.params.id, req.body);

      res.json({
        success: true,
        project
      });
      return;
    } catch (error) {
      logger.error('Error updating project', { error, projectId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update project'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}/cloud-connections:
 *   get:
 *     summary: Get project cloud connections
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cloud connections retrieved successfully
 */
router.get('/:id/cloud-connections', 
  requireAuth,
  [param('id').isString().withMessage('Invalid project ID')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      // Verify project ownership
      const project = await databaseService.findProjectById(req.params.id);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const connections = await databaseService.getProjectCloudConnections(req.params.id);

      res.json({
        success: true,
        connections
      });
      return;
    } catch (error) {
      logger.error('Error fetching cloud connections', { error, projectId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cloud connections'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}/cloud-connections:
 *   post:
 *     summary: Create cloud connection
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - name
 *               - config
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [aws, gcp, azure]
 *               name:
 *                 type: string
 *               config:
 *                 type: object
 *               region:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Cloud connection created successfully
 */
router.post('/:id/cloud-connections',
  requireAuth,
  [
    param('id').isString().withMessage('Invalid project ID'),
    body('provider').isIn(['aws', 'gcp', 'azure']).withMessage('Provider must be aws, gcp, or azure'),
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('config').isObject().withMessage('Config must be an object'),
    body('region').optional().isString().withMessage('Region must be a string'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      // Verify project ownership
      const project = await databaseService.findProjectById(req.params.id);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const connection = await databaseService.createCloudConnection({
        projectId: req.params.id,
        ...req.body
      });

      res.status(201).json({
        success: true,
        connection
      });
      return;
    } catch (error: any) {
      logger.error('Error creating cloud connection', { error, projectId: req.params.id });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Connection name already exists in this project'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create cloud connection'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}/repositories:
 *   get:
 *     summary: Get repositories in a project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project repositories retrieved successfully
 */
router.get('/:id/repositories', 
  requireAuth,
  [param('id').isString().withMessage('Invalid project ID')],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const project = await databaseService.findProjectById(req.params.id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user owns the project
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const repositories = await databaseService.getProjectRepositories(req.params.id);

      res.json({
        success: true,
        repositories
      });
      return;
    } catch (error) {
      logger.error('Error fetching project repositories', { error, projectId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project repositories'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}/repositories:
 *   post:
 *     summary: Add existing repository to project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryId
 *             properties:
 *               repositoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Repository added to project successfully
 */
router.post('/:id/repositories', 
  requireAuth,
  [
    param('id').isString().withMessage('Invalid project ID'),
    body('repositoryId').isString().withMessage('Repository ID is required')
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const project = await databaseService.findProjectById(req.params.id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user owns the project
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if repository exists and user owns it
      const repository = await databaseService.findRepositoryById(req.body.repositoryId);
      if (!repository) {
        return res.status(404).json({
          success: false,
          error: 'Repository not found'
        });
      }

      if (repository.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to repository'
        });
      }

      // Add repository to project
      const updatedRepository = await databaseService.addRepositoryToProject(
        req.body.repositoryId, 
        req.params.id
      );

      res.json({
        success: true,
        repository: updatedRepository
      });
      return;
    } catch (error: any) {
      logger.error('Error adding repository to project', { error, projectId: req.params.id });
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Repository is already in this project'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to add repository to project'
      });
      return;
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}/repositories/{repoId}:
 *   delete:
 *     summary: Remove repository from project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Repository removed from project successfully
 */
router.delete('/:id/repositories/:repoId', 
  requireAuth,
  [
    param('id').isString().withMessage('Invalid project ID'),
    param('repoId').isString().withMessage('Invalid repository ID')
  ],
  handleValidationErrors,
  async (req: any, res: express.Response) => {
    try {
      const project = await databaseService.findProjectById(req.params.id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user owns the project
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Remove repository from project (set projectId to null)
      const updatedRepository = await databaseService.removeRepositoryFromProject(req.params.repoId);

      res.json({
        success: true,
        repository: updatedRepository
      });
      return;
    } catch (error) {
      logger.error('Error removing repository from project', { error, projectId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to remove repository from project'
      });
      return;
    }
  }
);

export default router; 