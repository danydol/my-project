import { PrismaClient, User, Repository, Deployment, Analytics, Project, CloudConnection } from '@prisma/client';
import { logger } from '../utils/logger';
import { decryptCredentials } from './cloudService';

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
    projectId?: string;
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
        projectId: deploymentData.projectId,
      });

      logger.info('Deployment created', { 
        deploymentId: deployment.id, 
        environment: deployment.environment,
        projectId: deploymentData.projectId
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
   * Import a cloud object into a repository using Terraform import
   * @param params { repoId, cloudConnectionId, objectType, objectId, userId, resourceType, resourceName }
   */
  async importCloudObjectToRepository({ 
    repoId, 
    cloudConnectionId, 
    objectType, 
    objectId, 
    userId,
    resourceType,
    resourceName 
  }: {
    repoId: string;
    cloudConnectionId: string;
    objectType: string;
    objectId: string;
    userId: string;
    resourceType: string;
    resourceName: string;
  }): Promise<any> {
    try {
      // Fetch repository and cloud connection
      const repository = await this.getRepositoryById(repoId);
      if (!repository) throw new Error('Repository not found');

      const cloudConnection = await this.getCloudConnection(cloudConnectionId);
      if (!cloudConnection) throw new Error('Cloud connection not found');

      // Create a temporary directory for Terraform operations
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');

      const tempDir = path.join(os.tmpdir(), `terraform-import-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      const logs: string[] = [];
      const addLog = (message: string) => {
        logs.push(`[${new Date().toISOString()}] ${message}`);
        logger.info(`Terraform Import: ${message}`);
      };

      // Variables for main.tf handling
      let mainTfExists = false;
      let originalMainTf = '';
      const mainTfPath = path.join(tempDir, 'main.tf');

      try {
        addLog('Starting Terraform import process...');
        addLog(`Repository: ${repository.fullName}`);
        addLog(`Cloud Connection: ${cloudConnection.name} (${cloudConnection.provider})`);
        addLog(`Object Type: ${objectType}`);
        addLog(`Object ID: ${objectId}`);
        addLog(`Resource Type: ${resourceType}`);
        addLog(`Resource Name: ${resourceName}`);

        // Clean up resource type and name to prevent shell syntax errors
        const cleanResourceType = resourceType.replace(/[()\s]/g, '').trim();
        const cleanResourceName = resourceName.replace(/[()\s]/g, '').trim();
        
        if (cleanResourceType !== resourceType) {
          addLog(`Cleaned resource type from "${resourceType}" to "${cleanResourceType}"`);
        }
        if (cleanResourceName !== resourceName) {
          addLog(`Cleaned resource name from "${resourceName}" to "${cleanResourceName}"`);
        }

        // Clone the repository to temp directory
        addLog('Cloning repository...');
        // Use authenticated URL with token for clone and push
        let authenticatedUrl = repository.cloneUrl;
        if (repository.cloneUrl.startsWith('https://') && repository.userId) {
          // Fetch the user to get the GitHub access token
          const user = await this.findUserById(repository.userId);
          if (user && user.githubAccessToken) {
            // Insert token into the URL
            authenticatedUrl = repository.cloneUrl.replace('https://', `https://${user.githubAccessToken}@`);
          }
        }
        const cloneCommand = `git clone ${authenticatedUrl} ${tempDir}`;
        await execAsync(cloneCommand);
        addLog('Repository cloned successfully');

        // Ensure .gitignore exists to prevent committing large or sensitive files
        const gitignorePath = path.join(tempDir, '.gitignore');
        const gitignoreContent = `.terraform/
*.tfstate
*.tfstate.*
crash.log
`; 
        await fs.writeFile(gitignorePath, gitignoreContent);
        addLog('Created .gitignore to exclude .terraform and state files');

        // Set up cloud credentials based on provider
        const env: any = { ...process.env };
        
        if (cloudConnection.provider === 'aws') {
          const decryptedConfig = await decryptCredentials(cloudConnection.config as string);
          env.AWS_ACCESS_KEY_ID = decryptedConfig.accessKeyId;
          env.AWS_SECRET_ACCESS_KEY = decryptedConfig.secretAccessKey;
          env.AWS_DEFAULT_REGION = cloudConnection.region || 'us-east-1';
          if (decryptedConfig.sessionToken) {
            env.AWS_SESSION_TOKEN = decryptedConfig.sessionToken;
          }
          addLog('AWS credentials configured');
        } else if (cloudConnection.provider === 'gcp') {
          const decryptedConfig = await decryptCredentials(cloudConnection.config as string);
          env.GOOGLE_APPLICATION_CREDENTIALS = decryptedConfig.serviceAccountKey;
          env.GOOGLE_CLOUD_PROJECT = decryptedConfig.projectId;
          addLog('GCP credentials configured');
        } else if (cloudConnection.provider === 'azure') {
          const decryptedConfig = await decryptCredentials(cloudConnection.config as string);
          env.AZURE_CLIENT_ID = decryptedConfig.clientId;
          env.AZURE_CLIENT_SECRET = decryptedConfig.clientSecret;
          env.AZURE_TENANT_ID = decryptedConfig.tenantId;
          env.AZURE_SUBSCRIPTION_ID = decryptedConfig.subscriptionId;
          addLog('Azure credentials configured');
        }

        // Initialize Terraform
        addLog('Initializing Terraform...');
        const initCommand = `cd ${tempDir} && terraform init`;
        try {
          await execAsync(initCommand, { env });
          addLog('Terraform initialized successfully');
        } catch (initError) {
          let errorMessage = 'Unknown error';
          if (initError && typeof initError === 'object' && 'message' in initError) {
            errorMessage = (initError as any).message;
          } else if (typeof initError === 'string') {
            errorMessage = initError;
          }
          addLog(`Terraform init failed: ${errorMessage}`);
          logger.error('Terraform init failed', initError);
          throw new Error(`Terraform initialization failed: ${errorMessage}`);
        }

        // Create or update Terraform configuration file
        const importedResourcesPath = path.join(tempDir, 'imported_resources.tf');
        
        // Ensure main.tf exists with only the provider block for terraform init
        if (!mainTfExists) {
          const providerBlock = cloudConnection.provider === 'aws'
            ? `provider "aws" {\n  region = \"${cloudConnection.region}\"\n}\n`
            : cloudConnection.provider === 'gcp'
            ? `provider "google" {\n  region = \"${cloudConnection.region}\"\n}\n`
            : cloudConnection.provider === 'azure'
            ? `provider "azurerm" {\n  features {}\n}\n`
            : '';
          await fs.writeFile(mainTfPath, providerBlock);
          addLog('Created minimal main.tf with provider block for terraform init');
        }

        // Generate minimal resource block with dummy values for required arguments
        let resourceConfig = '';
        if (cloudConnection.provider === 'aws') {
          if (cleanResourceType === 'aws_instance') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  ami           = "ami-dummy"
  instance_type = "t2.micro"
  
  # Import will populate the actual values
}`;
          } else if (cleanResourceType === 'aws_security_group') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  name_prefix = "dummy-"
  
  # Import will populate the actual values
}`;
          } else if (cleanResourceType === 'aws_vpc') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  cidr_block = "10.0.0.0/16"
  
  # Import will populate the actual values
}`;
          } else if (cleanResourceType === 'aws_subnet') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  vpc_id     = "vpc-dummy"
  cidr_block = "10.0.1.0/24"
  
  # Import will populate the actual values
}`;
          } else {
            // Generic AWS resource
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Import will populate the actual values
}`;
          }
        } else if (cloudConnection.provider === 'gcp') {
          if (cleanResourceType === 'google_compute_instance') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  name         = "dummy-instance"
  machine_type = "e2-micro"
  zone         = "us-central1-a"
  
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }
  
  # Import will populate the actual values
}`;
          } else {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Import will populate the actual values
}`;
          }
        } else if (cloudConnection.provider === 'azure') {
          if (cleanResourceType === 'azurerm_virtual_machine') {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Dummy values for import - will be replaced with actual values after import
  name                  = "dummy-vm"
  location              = "East US"
  resource_group_name   = "dummy-rg"
  vm_size               = "Standard_DS1_v2"
  
  # Import will populate the actual values
}`;
          } else {
            resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Import will populate the actual values
}`;
          }
        } else {
          // Generic resource for other providers
          resourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {
  # Import will populate the actual values
}`;
        }
        
        await fs.writeFile(importedResourcesPath, resourceConfig);
        addLog(`Terraform configuration created: ${importedResourcesPath}`);

        // Run terraform init again after writing/updating configuration
        addLog('Re-initializing Terraform after config update...');
        try {
          await execAsync(initCommand, { env });
          addLog('Terraform re-initialized successfully after config update');
        } catch (initError) {
          let errorMessage = 'Unknown error';
          if (initError && typeof initError === 'object' && 'message' in initError) {
            errorMessage = (initError as any).message;
          } else if (typeof initError === 'string') {
            errorMessage = initError;
          }
          addLog(`Terraform re-init after config update failed: ${errorMessage}`);
          logger.error('Terraform re-init after config update failed', initError);
          throw new Error(`Terraform re-initialization after config update failed: ${errorMessage}`);
        }

        // Run terraform import
        addLog(`Running terraform import for ${cleanResourceType}.${cleanResourceName}...`);
        const importCommand = `cd ${tempDir} && terraform import ${cleanResourceType}.${cleanResourceName} ${objectId}`;
        await execAsync(importCommand, { env });
        addLog('Terraform import completed successfully');

        // After successful import, fetch the real values and update the resource block
        addLog('Fetching real resource values...');
        const showCommand = `cd ${tempDir} && terraform show -json`;
        const showResult = await execAsync(showCommand, { env });
        const terraformState = JSON.parse(showResult.stdout);
        
        // Find our imported resource in the state
        let importedResource = null;
        if (terraformState.values && terraformState.values.root_module) {
          const resources = terraformState.values.root_module.resources || [];
          importedResource = resources.find((r: any) => 
            r.type === cleanResourceType && r.name === cleanResourceName
          );
        }
        
        if (importedResource) {
          addLog('Found imported resource in state, updating configuration...');
          // Utility function to check required arguments
          function hasAllRequiredArgs(obj: any, requiredArgs: string[]): boolean {
            return requiredArgs.every(arg => obj[arg] !== undefined && obj[arg] !== null);
          }
          // Allowed arguments for each resource type
          const allowedArgs: Record<string, string[]> = {
            aws_vpc: [
              'cidr_block',
              'instance_tenancy',
              'enable_dns_support',
              'enable_dns_hostnames',
              'enable_classiclink',
              'enable_classiclink_dns_support',
              'assign_generated_ipv6_cidr_block',
              'ipv4_ipam_pool_id',
              'ipv4_netmask_length',
              'tags',
              // Add more as needed
            ],
            aws_instance: [
              'ami',
              'instance_type',
              'availability_zone',
              'key_name',
              'subnet_id',
              'vpc_security_group_ids',
              'associate_public_ip_address',
              'private_ip',
              'iam_instance_profile',
              'user_data',
              'tags',
              // Add more as needed
            ],
            // Add more resource types as needed
          };
          // Start the resource block
          let updatedResourceConfig = `resource "${cleanResourceType}" "${cleanResourceName}" {\n`;
          if (importedResource.values) {
            Object.entries(importedResource.values).forEach(([key, value]) => {
              if (key !== 'id' && key !== 'arn' && key !== 'tags_all') {
                // Only include allowed arguments for this resource type
                if (allowedArgs[cleanResourceType] && !allowedArgs[cleanResourceType].includes(key)) {
                  return;
                }
                // List of block keys and their required arguments
                const blockKeysWithRequiredArgs: Record<string, string[]> = {
                  ebs_block_device: ['device_name'],
                  ephemeral_block_device: ['device_name'],
                  network_interface: ['device_index', 'network_interface_id'],
                  // ... add more as needed
                };
                // List of block keys
                const blockKeys = Object.keys(blockKeysWithRequiredArgs);
                if (blockKeys.includes(key)) {
                  if (Array.isArray(value)) {
                    value.forEach((blockValue: any) => {
                      if (hasAllRequiredArgs(blockValue, blockKeysWithRequiredArgs[key])) {
                        updatedResourceConfig += `  ${key} {\n`;
                        Object.entries(blockValue).forEach(([blockKey, blockVal]) => {
                          if (typeof blockVal === 'string') {
                            updatedResourceConfig += `    ${blockKey} = \"${blockVal}\"\n`;
                          } else if (typeof blockVal === 'number' || typeof blockVal === 'boolean') {
                            updatedResourceConfig += `    ${blockKey} = ${blockVal}\n`;
                          }
                        });
                        updatedResourceConfig += `  }\n`;
                      }
                    });
                  }
                  // Skip writing if array is empty or no valid blocks
                } else if (Array.isArray(value)) {
                  // Only write non-empty arrays for non-block keys
                  if (value.length > 0) {
                    updatedResourceConfig += `  ${key} = ${JSON.stringify(value)}\n`;
                  }
                } else if (typeof value === 'string') {
                  updatedResourceConfig += `  ${key} = \"${value}\"\n`;
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                  updatedResourceConfig += `  ${key} = ${value}\n`;
                }
              }
            });
          }
          updatedResourceConfig += '}\n'; // Properly close the block with a newline
          // Update the imported_resources.tf file with real values
          await fs.writeFile(importedResourcesPath, updatedResourceConfig);
          addLog('Updated resource configuration with real values');
        } else {
          addLog('Warning: Could not find imported resource in state');
        }

        // Run terraform plan to see what would be created
        addLog('Running terraform plan...');
        const planCommand = `cd ${tempDir} && terraform plan -out=tfplan`;
        const { stdout: planOutput, stderr: planError } = await execAsync(planCommand, { env });
        
        if (planError && !planError.includes('No changes')) {
          addLog(`Plan error: ${planError}`);
        } else {
          addLog('Terraform plan completed successfully');
        }

        // Get the current state
        addLog('Getting Terraform state...');
        const stateCommand = `cd ${tempDir} && terraform show -json`;
        const { stdout: stateOutput } = await execAsync(stateCommand, { env });
        const state = JSON.parse(stateOutput);
        addLog('Terraform state retrieved successfully');

        // Push changes back to the repository
        addLog('Pushing changes to repository...');
        // Set remote URL with token for push
        if (repository.cloneUrl.startsWith('https://') && repository.userId) {
          const user = await this.findUserById(repository.userId);
          if (user && user.githubAccessToken) {
            const setUrlCommand = `cd ${tempDir} && git remote set-url origin ${repository.cloneUrl.replace('https://', `https://${user.githubAccessToken}@`)}`;
            await execAsync(setUrlCommand, { env });
          }
        }
        // Only add .tf and .tfvars files (revert to git add . and rely on .gitignore for safety)
        const gitCommands = [
          `cd ${tempDir} && git add .`,
          `cd ${tempDir} && git config user.email "deployai@example.com"`,
          `cd ${tempDir} && git config user.name "DeployAI"`,
          `cd ${tempDir} && git commit -m "Import cloud object: ${objectType} ${objectId}"`,
          `cd ${tempDir} && git push origin ${repository.defaultBranch}`
        ];

        for (const command of gitCommands) {
          await execAsync(command, { env });
        }
        addLog('Changes pushed to repository successfully');

        // Store import metadata in database
        const updatedRepository = await this.prisma.repository.update({
          where: { id: repoId },
          data: {
            cloudObjects: {
              push: {
                cloudConnectionId,
                objectType,
                objectId,
                resourceType,
                resourceName,
                importedAt: new Date(),
                terraformState: state,
                importLogs: logs
              }
            }
          }
        });

        // Track analytics event
        await this.trackEvent(userId, repoId, 'imported_cloud_object', {
          cloudConnectionId,
          objectType,
          objectId,
          resourceType,
          resourceName,
          provider: cloudConnection.provider
        });

        addLog('Import process completed successfully');

        return {
          success: true,
          repository: updatedRepository,
          logs,
          stateFilePath: path.join(tempDir, 'terraform.tfstate'),
          terraformConfig: resourceConfig
        };

      } finally {
        // Clean up temp directory only if there was no error
        if (!logs.some(log => log.includes('Terraform init failed') || log.includes('Error importing cloud object') || log.includes('Terraform import failed'))) {
          try {
            // Restore original main.tf if it was modified
            if (mainTfExists && originalMainTf) {
              const backupPath = mainTfPath + '.backup';
              try {
                await fs.access(backupPath);
                addLog('Restoring original main.tf from backup');
                await fs.writeFile(mainTfPath, originalMainTf);
                await fs.unlink(backupPath);
                addLog('Original main.tf restored and backup removed');
              } catch (backupError) {
                addLog(`Warning: Could not restore main.tf backup: ${backupError}`);
              }
            }
            await fs.rm(tempDir, { recursive: true, force: true });
            addLog('Temporary directory cleaned up');
          } catch (cleanupError) {
            addLog(`Warning: Failed to cleanup temp directory: ${cleanupError}`);
          }
        } else {
          addLog(`Temporary directory retained for debugging: ${tempDir}`);
        }
      }

    } catch (error) {
      logger.error('Error importing cloud object', error);
      throw error;
    }
  }

  /**
   * Generate Terraform configuration for imported resources
   */
  private generateTerraformConfig(provider: string, resourceType: string, resourceName: string, objectId: string, mainTfExists: boolean): string {
    let config = `# Imported resource: ${resourceType}.${resourceName}
# Object ID: ${objectId}
# Provider: ${provider}
# Generated by DeployAI on ${new Date().toISOString()}

`;

    // Only include required_providers if main.tf doesn't exist
    if (!mainTfExists) {
      config += `terraform {
  required_providers {
`;

      let providerConfig = '';

      switch (provider.toLowerCase()) {
        case 'aws':
          providerConfig = `    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }`;
          break;

        case 'gcp':
          providerConfig = `    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }`;
          break;

        case 'azure':
          providerConfig = `    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }`;
          break;

        default:
          providerConfig = `    # Unknown provider: ${provider}`;
      }

      config += `
${providerConfig}
  }
}

`;
    }

    // Add the resource configuration
    let resourceConfig = '';

    switch (provider.toLowerCase()) {
      case 'aws':
        resourceConfig = `resource "${resourceType}" "${resourceName}" {
  # This resource was imported from existing infrastructure
  # Object ID: ${objectId}
  # 
  # You may need to add additional configuration based on your specific resource type
  # Common attributes for AWS resources:
  # - tags
  # - name
  # - description
  # 
  # Example for S3 bucket:
  # bucket = "${resourceName}"
  # 
  # Example for EC2 instance:
  # instance_type = "t3.micro"
  # ami           = "ami-12345678"
}`;
        break;

      case 'gcp':
        resourceConfig = `resource "${resourceType}" "${resourceName}" {
  # This resource was imported from existing infrastructure
  # Object ID: ${objectId}
  # 
  # You may need to add additional configuration based on your specific resource type
  # Common attributes for GCP resources:
  # - project
  # - region
  # - zone
  # - labels
  # 
  # Example for GCS bucket:
  # name = "${resourceName}"
  # location = "US"
  # 
  # Example for Compute Engine instance:
  # name = "${resourceName}"
  # machine_type = "e2-micro"
  # zone = "us-central1-a"`;
        break;

      case 'azure':
        resourceConfig = `resource "${resourceType}" "${resourceName}" {
  # This resource was imported from existing infrastructure
  # Object ID: ${objectId}
  # 
  # You may need to add additional configuration based on your specific resource type
  # Common attributes for Azure resources:
  # - location
  # - resource_group_name
  # - tags
  # 
  # Example for Storage Account:
  # name = "${resourceName}"
  # resource_group_name = "my-resource-group"
  # location = "East US"
  # 
  # Example for Virtual Machine:
  # name = "${resourceName}"
  # resource_group_name = "my-resource-group"
  # location = "East US"
  # vm_size = "Standard_DS1_v2"`;
        break;

      default:
        resourceConfig = `resource "${resourceType}" "${resourceName}" {
  # This resource was imported from existing infrastructure
  # Object ID: ${objectId}
  # Provider: ${provider}
  # 
  # Please configure this resource according to your provider's documentation
}`;
    }

    config += resourceConfig;

    // Add output
    config += `

# Output the imported resource information
output "${resourceName}_info" {
  description = "Information about the imported ${resourceType}"
  value = {
    id = ${resourceType}.${resourceName}.id
    object_id = "${objectId}"
    resource_type = "${resourceType}"
    imported_at = "${new Date().toISOString()}"
  }
}`;

    return config;
  }

  async getProjectByRepository(owner: string, repository: string): Promise<Project | null> {
    try {
      const repo = await this.prisma.repository.findFirst({
        where: { 
          fullName: `${owner}/${repository}`,
          isActive: true,
        },
        include: {
          project: true,
        },
      });

      return repo?.project || null;
    } catch (error) {
      logger.error('Error fetching project by repository', error);
      throw error;
    }
  }

  // Get all cloud connections for all projects the user has access to
  async getAllCloudConnectionsForUser(userId: string): Promise<CloudConnection[]> {
    try {
      // Get all projects for the user
      const projects = await this.prisma.project.findMany({
        where: { userId },
        select: { id: true }
      });
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      // Get all cloud connections for these projects
      return await this.prisma.cloudConnection.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error fetching all cloud connections for user', error);
      throw error;
    }
  }
}

export default new DatabaseService(); 