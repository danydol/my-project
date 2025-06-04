import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import githubRoutes from './routes/github';
import awsRoutes from './routes/aws';
import repositoryRoutes from './routes/repository';
import projectRoutes from './routes/project';
import deploymentRoutes from './routes/deployment';
import infrastructureRoutes from './routes/infrastructure';
import analyticsRoutes from './routes/analytics';
import chatRoutes from './routes/chat';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { setupPassport } from './config/passport';
import { swaggerSpec } from './config/swagger';
import databaseService from './services/databaseService';
import chatService from './services/chatService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (needed for ngrok and reverse proxies)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());
setupPassport();

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Deploy.AI API Documentation'
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await databaseService.healthCheck();
    const mongoHealthy = await chatService.healthCheck();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        mongodb: mongoHealthy ? 'connected' : 'disconnected',
        redis: process.env.REDIS_URL ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/aws', awsRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Serve static files from frontend build (for production)
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Error handling middleware (must be last)
app.use(errorHandler);

// Serve frontend for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve frontend for API routes that don't exist
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl
    });
    return;
  }
  
  // Serve frontend index.html for all other routes
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Deploy.AI Backend server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app; 