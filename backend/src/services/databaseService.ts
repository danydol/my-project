import { PrismaClient, User, Repository, Deployment, Analytics, Project, CloudConnection } from '@prisma/client';
import { logger } from '../utils/logger';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  // User operations
  async createUser(userData: {
    username: string;
    email?: string | null;
    githubId: string;
    displayName?: string;
    avatar?: string;
    githubAccessToken?: string;
    githubRefreshToken?: string;
  }): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          email: userData.email || undefined, // Convert null to undefined for Prisma
        },
      });
      
      // Create default user settings
      await this.prisma.userSettings.create({
        data: {
          userId: user.id,
          preferredRegion: 'us-east-1',
          defaultEnvironment: 'dev',
          theme: 'light',
        },
      });

      // Create default project for new user
      await this.createProject({
        userId: user.id,
        name: 'My First Project',
        description: 'Default project to get you started',
        slug: `${user.username}-default`,
      });

      logger.info('User created successfully', { userId: user.id, username: user.username });
      return user;
    } catch (error) {
      logger.error('Error creating user', error);
      throw error;
    }
  }

  async findUserByGithubId(githubId: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { githubId },
        include: {
          settings: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by GitHub ID', error);
      throw error;
    }
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
        include: {
          settings: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: userData,
      });
      logger.info('User updated successfully', { userId: id });
      return user;
    } catch (error) {
      logger.error('Error updating user', error);
      throw error;
    }
  }

  // Project operations
  async createProject(projectData: {
    userId: string;
    name: string;
    description?: string;
    slug: string;
    defaultEnvironments?: string[];
    multiCloud?: boolean;
    tags?: string[];
    icon?: string;
    color?: string;
  }): Promise<Project> {
    try {
      const project = await this.prisma.project.create({
        data: {
          ...projectData,
          defaultEnvironments: projectData.defaultEnvironments || ['dev', 'staging', 'prod'],
          tags: projectData.tags || [],
        },
      });

      // Track analytics event
      await this.trackEvent(projectData.userId, null, 'project_created', {
        projectId: project.id,
        projectName: project.name,
      }, undefined, undefined, project.id);

      logger.info('Project created successfully', { 
        projectId: project.id, 
        name: project.name,
        userId: projectData.userId 
      });
      return project;
    } catch (error) {
      logger.error('Error creating project', error);
      throw error;
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      return await this.prisma.project.findMany({
        where: { 
          userId,
          status: 'active',
        },
        include: {
          repositories: {
            include: {
              analyses: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          cloudConnections: true,
          deployments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              repositories: true,
              deployments: true,
              cloudConnections: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching user projects', error);
      throw error;
    }
  }

  async findProjectById(id: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { id },
        include: {
          repositories: true,
          cloudConnections: true,
          deployments: true,
        },
      });
    } catch (error) {
      logger.error('Error finding project by ID', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    try {
      const project = await this.prisma.project.update({
        where: { id },
        data: projectData,
      });
      logger.info('Project updated successfully', { projectId: id });
      return project;
    } catch (error) {
      logger.error('Error updating project', error);
      throw error;
    }
  }

  // Cloud Connection operations
  async createCloudConnection(connectionData: {
    projectId: string;
    provider: string;
    name: string;
    config: any;
    region?: string;
    description?: string;
    tags?: string[];
    isDefault?: boolean;
  }): Promise<CloudConnection> {
    try {
      // If this is set as default, unset other defaults for this project/provider
      if (connectionData.isDefault) {
        await this.prisma.cloudConnection.updateMany({
          where: {
            projectId: connectionData.projectId,
            provider: connectionData.provider,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const connection = await this.prisma.cloudConnection.create({
        data: {
          ...connectionData,
          tags: connectionData.tags || [],
          status: 'pending', // Will be validated after creation
        },
      });

      logger.info('Cloud connection created', { 
        connectionId: connection.id, 
        provider: connection.provider,
        projectId: connectionData.projectId 
      });
      return connection;
    } catch (error) {
      logger.error('Error creating cloud connection', error);
      throw error;
    }
  }

  async getProjectCloudConnections(projectId: string): Promise<CloudConnection[]> {
    try {
      return await this.prisma.cloudConnection.findMany({
        where: { projectId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      logger.error('Error fetching project cloud connections', error);
      throw error;
    }
  }

  async updateCloudConnectionStatus(
    id: string, 
    status: string, 
    errorMessage?: string
  ): Promise<CloudConnection> {
    try {
      const connection = await this.prisma.cloudConnection.update({
        where: { id },
        data: {
          status,
          errorMessage,
          lastValidated: new Date(),
        },
      });
      
      logger.info('Cloud connection status updated', { 
        connectionId: id, 
        status,
        hasError: !!errorMessage 
      });
      return connection;
    } catch (error) {
      logger.error('Error updating cloud connection status', error);
      throw error;
    }
  }

  // Repository operations
  async createRepository(repositoryData: {
    userId: string;
    githubId: string;
    name: string;
    fullName: string;
    description?: string;
    isPrivate: boolean;
    defaultBranch: string;
    cloneUrl: string;
    sshUrl?: string;
  }): Promise<Repository> {
    try {
      const repository = await this.prisma.repository.create({
        data: repositoryData,
      });
      
      // Track analytics event
      await this.trackEvent(repositoryData.userId, repository.id, 'repository_connected', {
        repositoryName: repository.fullName,
      });

      logger.info('Repository created successfully', { 
        repositoryId: repository.id, 
        fullName: repository.fullName 
      });
      return repository;
    } catch (error) {
      logger.error('Error creating repository', error);
      throw error;
    }
  }

  async getUserRepositories(userId: string): Promise<Repository[]> {
    try {
      return await this.prisma.repository.findMany({
        where: { 
          userId,
          isActive: true,
        },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          deployments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching user repositories', error);
      throw error;
    }
  }

  // Analytics operations
  async trackEvent(
    userId: string | null,
    repositoryId: string | null,
    event: string,
    metadata?: any,
    userAgent?: string,
    ipAddress?: string,
    projectId?: string
  ): Promise<void> {
    try {
      await this.prisma.analytics.create({
        data: {
          userId,
          repositoryId,
          event,
          metadata: metadata || {},
          userAgent,
          ipAddress,
          projectId,
        },
      });
    } catch (error) {
      logger.error('Error tracking analytics event', error);
      // Don't throw error for analytics - it shouldn't break the main flow
    }
  }

  async getUserAnalytics(userId: string, days: number = 30): Promise<Analytics[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      return await this.prisma.analytics.findMany({
        where: {
          userId,
          timestamp: {
            gte: since,
          },
        },
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching user analytics', error);
      throw error;
    }
  }

  // Repository analysis operations
  async saveRepositoryAnalysis(analysisData: {
    repositoryId: string;
    analysisType: string;
    techStack: any;
    microservices: any;
    dockerConfigs: any;
    ciWorkflows: any;
    infrastructureRecommendations: any;
    dependencies: any;
    analysisProvider: string;
    confidence: number;
    prompt?: string;
    rawResponse?: string;
    processingTime?: number;
  }) {
    try {
      const analysis = await this.prisma.repositoryAnalysis.create({
        data: analysisData,
      });

      // Update repository lastAnalyzed timestamp
      await this.prisma.repository.update({
        where: { id: analysisData.repositoryId },
        data: { lastAnalyzed: new Date() },
      });

      logger.info('Repository analysis saved', { 
        analysisId: analysis.id, 
        repositoryId: analysisData.repositoryId 
      });
      return analysis;
    } catch (error) {
      logger.error('Error saving repository analysis', error);
      throw error;
    }
  }

  // Deployment operations
  async createDeployment(deploymentData: {
    userId: string;
    repositoryId: string;
    infrastructureId?: string;
    name: string;
    environment: string;
    gitCommitSha?: string;
  }): Promise<Deployment> {
    try {
      const deployment = await this.prisma.deployment.create({
        data: deploymentData,
      });

      // Track analytics event
      await this.trackEvent(deploymentData.userId, deploymentData.repositoryId, 'deployment_started', {
        deploymentId: deployment.id,
        environment: deployment.environment,
      });

      logger.info('Deployment created', { 
        deploymentId: deployment.id, 
        environment: deployment.environment 
      });
      return deployment;
    } catch (error) {
      logger.error('Error creating deployment', error);
      throw error;
    }
  }

  async updateDeploymentStatus(
    deploymentId: string, 
    status: string, 
    additionalData?: {
      deploymentUrl?: string;
      errorMessage?: string;
      logs?: string;
    }
  ): Promise<Deployment> {
    try {
      const updateData: any = { 
        status,
        updatedAt: new Date(),
      };

      if (status === 'deployed') {
        updateData.deployedAt = new Date();
      } else if (status === 'destroyed') {
        updateData.destroyedAt = new Date();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const deployment = await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: updateData,
      });

      logger.info('Deployment status updated', { 
        deploymentId, 
        status,
        deploymentUrl: additionalData?.deploymentUrl 
      });
      return deployment;
    } catch (error) {
      logger.error('Error updating deployment status', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default new DatabaseService(); 