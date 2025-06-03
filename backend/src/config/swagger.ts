import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Deploy.AI Backend API',
      version,
      description: 'AI-powered CI/CD platform backend API for deploying applications from MVP to production',
      contact: {
        name: 'Deploy.AI Support',
        email: 'support@deploy-ai.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3005',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user_123' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'john@example.com' },
            displayName: { type: 'string', example: 'John Doe' },
            avatar: { type: 'string', example: 'https://avatar.url' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Repository: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'repo_123' },
            name: { type: 'string', example: 'my-awesome-app' },
            fullName: { type: 'string', example: 'johndoe/my-awesome-app' },
            description: { type: 'string', example: 'An awesome web application' },
            isPrivate: { type: 'boolean', example: false },
            defaultBranch: { type: 'string', example: 'main' },
            cloneUrl: { type: 'string', example: 'https://github.com/johndoe/my-awesome-app.git' },
            lastAnalyzed: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ChatSession: {
          type: 'object',
          properties: {
            chatId: { type: 'string', example: 'chat_123456789_abc123' },
            title: { type: 'string', example: 'Deploy React App' },
            status: { type: 'string', enum: ['active', 'completed', 'archived'], example: 'active' },
            lastActivity: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'assistant', 'system'], example: 'user' },
            content: { type: 'string', example: 'How do I deploy my React app?' },
            messageType: { type: 'string', enum: ['text', 'plan', 'terminal', 'code', 'error'], example: 'text' },
            metadata: {
              type: 'object',
              properties: {
                planSteps: { type: 'array', items: { type: 'string' } },
                terminalCommands: { type: 'array', items: { type: 'string' } },
                codeBlocks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      language: { type: 'string', example: 'javascript' },
                      code: { type: 'string', example: 'console.log("Hello World");' },
                      filename: { type: 'string', example: 'app.js' },
                    },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Deployment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'deploy_123' },
            name: { type: 'string', example: 'production-deployment' },
            status: { type: 'string', enum: ['pending', 'deploying', 'deployed', 'failed', 'destroyed'], example: 'deployed' },
            environment: { type: 'string', example: 'production' },
            deploymentUrl: { type: 'string', example: 'https://my-app.example.com' },
            deployedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Something went wrong' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string', example: '1.0.0' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', example: 'connected' },
                mongodb: { type: 'string', example: 'connected' },
                redis: { type: 'string', example: 'configured' },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Repositories',
        description: 'GitHub repository management',
      },
      {
        name: 'Chat',
        description: 'AI-powered chat assistance',
      },
      {
        name: 'Deployments',
        description: 'Application deployment management',
      },
      {
        name: 'Analytics',
        description: 'Platform usage analytics',
      },
      {
        name: 'Health',
        description: 'Service health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options); 