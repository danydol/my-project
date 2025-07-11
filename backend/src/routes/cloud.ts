import { Router } from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';
import databaseService from '../services/databaseService';
import { 
  validateAWSCredentials, 
  validateGCPCredentials, 
  validateAzureCredentials,
  encryptCredentials,
  decryptCredentials 
} from '../services/cloudService';

const router = Router();

// Middleware to authenticate all cloud routes
router.use(passport.authenticate('jwt', { session: false }));

// Get all cloud connections for a project
router.get('/connections/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    // Verify user has access to the project
    const project = await databaseService.getProject(projectId, user.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const connections = await databaseService.getCloudConnections(projectId);
    
    // Remove sensitive config data from response
    const sanitizedConnections = connections.map(conn => ({
      ...conn,
      config: undefined // Don't send encrypted config to frontend
    }));

    return res.json({
      success: true,
      connections: sanitizedConnections
    });
  } catch (error: any) {
    logger.error('Error fetching cloud connections', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch cloud connections'
    });
  }
});

// Create new cloud connection
router.post('/connections', async (req: any, res) => {
  try {
    const { projectId, provider, name, config, region, description } = req.body;
    const user = req.user;

    if (!projectId || !provider || !name || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, provider, name, config'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(projectId, user.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Validate credentials based on provider
    let validationResult;
    switch (provider.toLowerCase()) {
      case 'aws':
        validationResult = await validateAWSCredentials(config);
        break;
      case 'gcp':
        validationResult = await validateGCPCredentials(config);
        break;
      case 'azure':
        validationResult = await validateAzureCredentials(config);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported provider. Supported providers: aws, gcp, azure'
        });
    }

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials',
        details: validationResult.error
      });
    }

    // Encrypt credentials before storing
    const encryptedConfig = await encryptCredentials(config);

    // Create cloud connection
    const connection = await databaseService.createCloudConnection({
      projectId,
      provider: provider.toLowerCase(),
      name,
      config: encryptedConfig,
      region,
      description
    });

    // Update status to connected since validation passed
    await databaseService.updateCloudConnectionStatus(connection.id, 'connected');

    return res.status(201).json({
      success: true,
      connection: {
        ...connection,
        status: 'connected',
        config: undefined // Don't return encrypted config
      }
    });
  } catch (error: any) {
    logger.error('Error creating cloud connection', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to create cloud connection'
    });
  }
});

// Test cloud connection
router.post('/connections/:connectionId/test', async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const user = req.user;

    const connection = await databaseService.getCloudConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Cloud connection not found'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(connection.projectId, user.id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Decrypt credentials and test connection
    const decryptedConfig = await decryptCredentials(connection.config as string);
    
    let validationResult;
    switch (connection.provider) {
      case 'aws':
        validationResult = await validateAWSCredentials(decryptedConfig);
        break;
      case 'gcp':
        validationResult = await validateGCPCredentials(decryptedConfig);
        break;
      case 'azure':
        validationResult = await validateAzureCredentials(decryptedConfig);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported provider'
        });
    }

    // Update connection status
    const status = validationResult.valid ? 'connected' : 'error';
    const updateData: any = {
      status,
      lastValidated: new Date()
    };

    if (!validationResult.valid) {
      updateData.errorMessage = validationResult.error;
    } else {
      updateData.errorMessage = null;
    }

    await databaseService.updateCloudConnection(connectionId, updateData);

    return res.json({
      success: true,
      valid: validationResult.valid,
      error: validationResult.error,
      details: validationResult.details
    });
  } catch (error: any) {
    logger.error('Error testing cloud connection', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to test cloud connection'
    });
  }
});

// Update cloud connection
router.put('/connections/:connectionId', async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const { name, config, region, description, isDefault } = req.body;
    const user = req.user;

    const connection = await databaseService.getCloudConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Cloud connection not found'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(connection.projectId, user.id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (region) updateData.region = region;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // If config is provided, validate and encrypt it
    if (config) {
      let validationResult;
      switch (connection.provider) {
        case 'aws':
          validationResult = await validateAWSCredentials(config);
          break;
        case 'gcp':
          validationResult = await validateGCPCredentials(config);
          break;
        case 'azure':
          validationResult = await validateAzureCredentials(config);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Unsupported provider'
          });
      }

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid credentials',
          details: validationResult.error
        });
      }

      updateData.config = await encryptCredentials(config);
      updateData.status = 'connected';
      updateData.lastValidated = new Date();
      updateData.errorMessage = null;
    }

    const updatedConnection = await databaseService.updateCloudConnection(connectionId, updateData);

    return res.json({
      success: true,
      connection: {
        ...updatedConnection,
        config: undefined // Don't return encrypted config
      }
    });
  } catch (error: any) {
    logger.error('Error updating cloud connection', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to update cloud connection'
    });
  }
});

// Delete cloud connection
router.delete('/connections/:connectionId', async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const user = req.user;

    const connection = await databaseService.getCloudConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Cloud connection not found'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(connection.projectId, user.id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await databaseService.deleteCloudConnection(connectionId);

    return res.json({
      success: true,
      message: 'Cloud connection deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting cloud connection', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete cloud connection'
    });
  }
});

// Get supported regions for a provider
router.get('/providers/:provider/regions', async (req: any, res) => {
  try {
    const { provider } = req.params;

    const regions: { [key: string]: Array<{id: string, name: string}> } = {
      aws: [
        { id: 'us-east-1', name: 'US East (N. Virginia)' },
        { id: 'us-east-2', name: 'US East (Ohio)' },
        { id: 'us-west-1', name: 'US West (N. California)' },
        { id: 'us-west-2', name: 'US West (Oregon)' },
        { id: 'eu-west-1', name: 'Europe (Ireland)' },
        { id: 'eu-west-2', name: 'Europe (London)' },
        { id: 'eu-central-1', name: 'Europe (Frankfurt)' },
        { id: 'il-central-1', name: 'Israel (Tel Aviv)' },
        { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
        { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
        { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' }
      ],
      gcp: [
        { id: 'us-central1', name: 'Iowa (us-central1)' },
        { id: 'us-east1', name: 'South Carolina (us-east1)' },
        { id: 'us-west1', name: 'Oregon (us-west1)' },
        { id: 'europe-west1', name: 'Belgium (europe-west1)' },
        { id: 'europe-west2', name: 'London (europe-west2)' },
        { id: 'asia-east1', name: 'Taiwan (asia-east1)' },
        { id: 'asia-southeast1', name: 'Singapore (asia-southeast1)' }
      ],
      azure: [
        { id: 'eastus', name: 'East US' },
        { id: 'eastus2', name: 'East US 2' },
        { id: 'westus', name: 'West US' },
        { id: 'westus2', name: 'West US 2' },
        { id: 'centralus', name: 'Central US' },
        { id: 'northeurope', name: 'North Europe' },
        { id: 'westeurope', name: 'West Europe' },
        { id: 'eastasia', name: 'East Asia' },
        { id: 'southeastasia', name: 'Southeast Asia' }
      ]
    };

    if (!regions[provider.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported provider'
      });
    }

    return res.json({
      success: true,
      regions: regions[provider.toLowerCase()]
    });
  } catch (error: any) {
    logger.error('Error fetching regions', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch regions'
    });
  }
});

// Test route for cloud validation (no auth required for testing)
router.post('/test-validation', async (req: any, res) => {
  try {
    const { provider, config } = req.body;

    if (!provider || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing provider or config'
      });
    }

    let validationResult;
    switch (provider.toLowerCase()) {
      case 'aws':
        validationResult = await validateAWSCredentials(config);
        break;
      case 'gcp':
        validationResult = await validateGCPCredentials(config);
        break;
      case 'azure':
        validationResult = await validateAzureCredentials(config);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported provider. Supported providers: aws, gcp, azure'
        });
    }

    return res.json({
      success: true,
      valid: validationResult.valid,
      error: validationResult.error,
      details: validationResult.details
    });
  } catch (error: any) {
    logger.error('Error testing cloud validation', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to test cloud validation'
    });
  }
});

// Update cloud connection credentials
router.put('/connections/:connectionId/credentials', async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const { config } = req.body;
    const user = req.user;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: config'
      });
    }

    const connection = await databaseService.getCloudConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Cloud connection not found'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(connection.projectId, user.id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Validate new credentials based on provider
    let validationResult;
    switch (connection.provider) {
      case 'aws':
        validationResult = await validateAWSCredentials(config);
        break;
      case 'gcp':
        validationResult = await validateGCPCredentials(config);
        break;
      case 'azure':
        validationResult = await validateAzureCredentials(config);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported provider'
        });
    }

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials',
        details: validationResult.error
      });
    }

    // Encrypt credentials before storing
    const encryptedConfig = await encryptCredentials(config);

    // Update cloud connection with new credentials
    const updateData = {
      config: encryptedConfig,
      status: 'connected',
      lastValidated: new Date(),
      errorMessage: null
    };

    await databaseService.updateCloudConnection(connectionId, updateData);

    return res.json({
      success: true,
      message: 'Credentials updated successfully',
      connection: {
        ...connection,
        status: 'connected',
        lastValidated: updateData.lastValidated,
        config: undefined // Don't return encrypted config
      }
    });
  } catch (error: any) {
    logger.error('Error updating cloud connection credentials', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to update credentials'
    });
  }
});

// Get EC2 instances for a cloud connection
router.get('/connections/:connectionId/ec2-instances', async (req: any, res) => {
  try {
    const { connectionId } = req.params;
    const user = req.user;

    const connection = await databaseService.getCloudConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Cloud connection not found'
      });
    }

    // Verify user has access to the project
    const project = await databaseService.getProject(connection.projectId, user.id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Only support AWS for now
    if (connection.provider !== 'aws') {
      return res.status(400).json({
        success: false,
        error: 'EC2 instances are only available for AWS connections'
      });
    }

    // Decrypt credentials
    const decryptedConfig = await decryptCredentials(connection.config as string);

    // Set up AWS credentials for the CLI command
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    // Set environment variables for AWS CLI
    const env: any = {
      ...process.env,
      AWS_ACCESS_KEY_ID: decryptedConfig.accessKeyId,
      AWS_SECRET_ACCESS_KEY: decryptedConfig.secretAccessKey,
      AWS_DEFAULT_REGION: connection.region || 'us-east-1',
      AWS_CONFIG_FILE: '/dev/null', // Prevent AWS CLI from looking for config files
      AWS_SHARED_CREDENTIALS_FILE: '/dev/null' // Prevent AWS CLI from looking for credentials files
    };

    if (decryptedConfig.sessionToken) {
      env.AWS_SESSION_TOKEN = decryptedConfig.sessionToken;
    }

    // Execute AWS CLI command
    const command = `aws ec2 describe-instances --filters "Name=instance-state-name,Values=running,stopped" --output json --no-cli-pager`;
    const { stdout, stderr } = await execAsync(command, { env });

    if (stderr) {
      logger.error('AWS CLI stderr:', stderr);
    }

    const instances = JSON.parse(stdout);
    
    // Transform the response to a simpler format
    const simplifiedInstances = instances.Reservations.flatMap((reservation: any) =>
      reservation.Instances.map((instance: any) => ({
        id: instance.InstanceId,
        name: instance.Tags?.find((tag: any) => tag.Key === 'Name')?.Value || 'Unnamed',
        state: instance.State.Name,
        type: instance.InstanceType,
        zone: instance.Placement.AvailabilityZone,
        privateIp: instance.PrivateIpAddress,
        publicIp: instance.PublicIpAddress,
        launchTime: instance.LaunchTime,
        platform: instance.Platform || 'linux',
        vpcId: instance.VpcId,
        subnetId: instance.SubnetId
      }))
    );

    return res.json({
      success: true,
      instances: simplifiedInstances
    });
  } catch (error: any) {
    logger.error('Error fetching EC2 instances', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch EC2 instances',
      details: error.message
    });
  }
});

// Get all cloud connections for the authenticated user
router.get('/connections', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Get all cloud connections for all projects the user has access to
    const connections = await databaseService.getAllCloudConnectionsForUser(user.id);
    return res.json({ success: true, connections });
  } catch (error: any) {
    logger.error('Error fetching cloud connections', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch cloud connections' });
  }
});

export default router; 