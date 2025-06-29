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

      // Ensure config is a string (encrypted)
      let configToSave = connectionData.config;
      if (typeof configToSave !== 'string') {
        configToSave = JSON.stringify(configToSave);
      }

      const connection = await this.prisma.cloudConnection.create({
        data: {
          ...connectionData,
          config: configToSave,
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

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findFirst({
        where: { 
          id: projectId,
          userId,
        },
        include: {
          repositories: true,
          cloudConnections: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching project', error);
      throw error;
    }
  }

  async getProjectById(projectId: string, userId: string): Promise<Project | null> {
    try {
      return await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId: userId,
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
        },
      });
    } catch (error) {
      logger.error('Error fetching project by ID', error);
      throw error;
    }
  }

  async updateProjectGitHubToken(projectId: string, encryptedToken: string): Promise<Project> {
    try {
      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          githubToken: encryptedToken,
          githubTokenUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      logger.info('Project GitHub token updated successfully', { projectId });
      return project;
    } catch (error) {
      logger.error('Error updating project GitHub token', error);
      throw error;
    }
  }

  async removeProjectGitHubToken(projectId: string): Promise<Project> {
    try {
      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          githubToken: null,
          githubTokenUpdatedAt: null,
          updatedAt: new Date(),
        },
      });
      logger.info('Project GitHub token removed successfully', { projectId });
      return project;
    } catch (error) {
      logger.error('Error removing project GitHub token', error);
      throw error;
    }
  }

  async updateProjectSettings(projectId: string, settings: Partial<Project>): Promise<Project> {
    try {
      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          ...settings,
          updatedAt: new Date(),
        },
      });
      logger.info('Project settings updated successfully', { projectId });
      return project;
    } catch (error) {
      logger.error('Error updating project settings', error);
      throw error;
    }
  }

  async getProjectGitHubToken(projectId: string): Promise<string | null> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { githubToken: true },
      });
      return project?.githubToken || null;
    } catch (error) {
      logger.error('Error fetching project GitHub token', error);
      throw error;
    }
  }

  async getCloudConnections(projectId: string): Promise<CloudConnection[]> {
    try {
      return await this.prisma.cloudConnection.findMany({
        where: { projectId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (error) {
      logger.error('Error fetching cloud connections', error);
      throw error;
    }
  }

  async getCloudConnection(connectionId: string): Promise<CloudConnection | null> {
    try {
      return await this.prisma.cloudConnection.findUnique({
        where: { id: connectionId },
      });
    } catch (error) {
      logger.error('Error fetching cloud connection', error);
      throw error;
    }
  }

  async updateCloudConnection(connectionId: string, updateData: any): Promise<CloudConnection> {
    try {
      // If this is set as default, unset other defaults for this project/provider
      if (updateData.isDefault) {
        const connection = await this.prisma.cloudConnection.findUnique({
          where: { id: connectionId },
        });
        
        if (connection) {
          await this.prisma.cloudConnection.updateMany({
            where: {
              projectId: connection.projectId,
              provider: connection.provider,
              id: { not: connectionId },
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      // Ensure config is a string (encrypted)
      if (updateData.config && typeof updateData.config !== 'string') {
        updateData.config = JSON.stringify(updateData.config);
      }

      const updatedConnection = await this.prisma.cloudConnection.update({
        where: { id: connectionId },
        data: updateData,
      });
      
      logger.info('Cloud connection updated', { 
        connectionId,
        fieldsUpdated: Object.keys(updateData)
      });
      return updatedConnection;
    } catch (error) {
      logger.error('Error updating cloud connection', error);
      throw error;
    }
  }

  async deleteCloudConnection(connectionId: string): Promise<void> {
    try {
      await this.prisma.cloudConnection.delete({
        where: { id: connectionId },
      });
      
      logger.info('Cloud connection deleted', { connectionId });
    } catch (error) {
      logger.error('Error deleting cloud connection', error);
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
          project: true, // Include project info
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching user repositories', error);
      throw error;
    }
  }

  async findRepositoryById(id: string): Promise<Repository | null> {
    try {
      return await this.prisma.repository.findUnique({
        where: { id },
        include: {
          project: true,
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error finding repository by ID', error);
      throw error;
    }
  }

  async getProjectRepositories(projectId: string): Promise<Repository[]> {
    try {
      return await this.prisma.repository.findMany({
        where: { 
          projectId,
          isActive: true,
        },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          deployments: {
            where: { status: { in: ['deployed', 'deploying'] } },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          _count: {
            select: {
              deployments: true,
              infrastructures: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching project repositories', error);
      throw error;
    }
  }

  async addRepositoryToProject(repositoryId: string, projectId: string): Promise<Repository> {
    try {
      const repository = await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { projectId },
        include: {
          project: true,
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      logger.info('Repository added to project', { 
        repositoryId, 
        projectId,
        repositoryName: repository.fullName 
      });
      return repository;
    } catch (error) {
      logger.error('Error adding repository to project', error);
      throw error;
    }
  }

  async removeRepositoryFromProject(repositoryId: string): Promise<Repository> {
    try {
      const repository = await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { projectId: null },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      logger.info('Repository removed from project', { 
        repositoryId,
        repositoryName: repository.fullName 
      });
      return repository;
    } catch (error) {
      logger.error('Error removing repository from project', error);
      throw error;
    }
  }

  async getUnassignedRepositories(userId: string): Promise<Repository[]> {
    try {
      return await this.prisma.repository.findMany({
        where: { 
          userId,
          projectId: null, // Not assigned to any project
          isActive: true,
        },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching unassigned repositories', error);
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
    cloudConnectionId?: string;
    infrastructureId?: string;
    name: string;
    environment: string;
    provider?: string;
    gitCommitSha?: string;
  }): Promise<Deployment> {
    try {
      const deployment = await this.prisma.deployment.create({
        data: deploymentData,
        include: {
          repository: true,
          cloudConnection: true,
        },
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

  async getDeploymentById(deploymentId: string): Promise<Deployment | null> {
    try {
      return await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: {
          repository: true,
          cloudConnection: true,
        },
      });
    } catch (error) {
      logger.error('Error getting deployment by ID', error);
      throw error;
    }
  }

  async getUserDeployments(userId: string): Promise<Deployment[]> {
    try {
      return await this.prisma.deployment.findMany({
        where: { userId },
        include: {
          repository: true,
          cloudConnection: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting user deployments', error);
      throw error;
    }
  }

  async updateDeploymentStatus(
    deploymentId: string, 
    status: string, 
    additionalData?: {
      deploymentUrl?: string | null;
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
        if (typeof additionalData.deploymentUrl === 'string' && additionalData.deploymentUrl) {
          updateData.deploymentUrl = additionalData.deploymentUrl;
        } else if (additionalData.deploymentUrl === null) {
          updateData.deploymentUrl = null;
        }
        if (typeof additionalData.errorMessage === 'string') {
          updateData.errorMessage = additionalData.errorMessage;
        }
        if (typeof additionalData.logs === 'string') {
          updateData.logs = additionalData.logs;
        }
      }

      const deployment = await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: updateData,
        include: {
          repository: true,
          cloudConnection: true,
        },
      });

      logger.info('Deployment status updated', { 
        deploymentId, 
        status,
        deploymentUrl: updateData.deploymentUrl 
      });
      return deployment;
    } catch (error) {
      logger.error('Error updating deployment status', error);
      throw error;
    }
  }

  // Cloud connection operations
  async getCloudConnectionById(connectionId: string): Promise<CloudConnection | null> {
    try {
      return await this.prisma.cloudConnection.findUnique({
        where: { id: connectionId },
      });
    } catch (error) {
      logger.error('Error getting cloud connection by ID', error);
      throw error;
    }
  }

  async getUserCloudConnections(userId: string): Promise<CloudConnection[]> {
    try {
      return await this.prisma.cloudConnection.findMany({
        where: {
          project: {
            userId: userId,
          },
        },
        include: {
          project: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting user cloud connections', error);
      throw error;
    }
  }

  // Repository operations
  async getRepositoryById(repositoryId: string): Promise<Repository | null> {
    try {
      return await this.prisma.repository.findUnique({
        where: { id: repositoryId },
      });
    } catch (error) {
      logger.error('Error getting repository by ID', error);
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

  /**
   * Import a cloud object into a repository
   * @param params { repoId, cloudConnectionId, objectType, objectId, userId }
   */
  async importCloudObjectToRepository({ repoId, cloudConnectionId, objectType, objectId, userId }: {
    repoId: string;
    cloudConnectionId: string;
    objectType: string;
    objectId: string;
    userId: string;
  }): Promise<any> {
    // Fetch repository and cloud connection
    const repository = await this.getRepositoryById(repoId);
    if (!repository) throw new Error('Repository not found');

    const cloudConnection = await this.getCloudConnection(cloudConnectionId);
    if (!cloudConnection) throw new Error('Cloud connection not found');

    // Optionally: verify user has access to both (left as an exercise)

    // For now, just store a reference to the imported object in the repository's metadata (as a placeholder)
    // In a real implementation, you would fetch the object from the cloud provider and associate/copy it as needed
    const updatedRepository = await this.prisma.repository.update({
      where: { id: repoId },
      data: {
        // Assuming you have a metadata or cloudObjects field (array of objects)
        // Here we use a JSON field called cloudObjects for demonstration
        cloudObjects: {
          push: {
            cloudConnectionId,
            objectType,
            objectId,
            importedAt: new Date(),
          }
        }
      }
    });
    // Track analytics event
    await this.trackEvent(userId, repoId, 'imported_cloud_object', {
      cloudConnectionId,
      objectType,
      objectId
    });
    return updatedRepository;
  }
}

export default new DatabaseService(); 