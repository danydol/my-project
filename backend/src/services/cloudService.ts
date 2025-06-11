import crypto from 'crypto';
import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { logger } from '../utils/logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-32-chars!';
const ALGORITHM = 'aes-256-gcm';

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

// AWS Credentials Validation
export async function validateAWSCredentials(config: any): Promise<ValidationResult> {
  try {
    const { accessKeyId, secretAccessKey, sessionToken, region = 'us-east-1' } = config;

    if (!accessKeyId || !secretAccessKey) {
      return {
        valid: false,
        error: 'Missing required fields: accessKeyId, secretAccessKey'
      };
    }

    // Build credentials object - include sessionToken if provided
    const credentials: any = {
      accessKeyId,
      secretAccessKey
    };

    // Add session token if provided (for temporary credentials)
    if (sessionToken && sessionToken.trim()) {
      credentials.sessionToken = sessionToken;
    }

    // Test AWS credentials by describing regions
    const ec2Client = new EC2Client({
      region,
      credentials
    });

    const command = new DescribeRegionsCommand({});
    const response = await ec2Client.send(command);

    return {
      valid: true,
      details: {
        regionsFound: response.Regions?.length || 0,
        testedRegion: region,
        credentialType: sessionToken ? 'temporary' : 'permanent'
      }
    };
  } catch (error: any) {
    logger.error('AWS credentials validation failed', { error: error.message });
    return {
      valid: false,
      error: error.message || 'Failed to validate AWS credentials'
    };
  }
}

// GCP Credentials Validation - Simplified for now
export async function validateGCPCredentials(config: any): Promise<ValidationResult> {
  try {
    const { projectId, serviceAccountKey } = config;

    if (!projectId || !serviceAccountKey) {
      return {
        valid: false,
        error: 'Missing required fields: projectId, serviceAccountKey'
      };
    }

    // Parse service account key to validate format
    try {
      const keyData = typeof serviceAccountKey === 'string' 
        ? JSON.parse(serviceAccountKey) 
        : serviceAccountKey;
      
      // Basic validation of service account key structure
      if (!keyData.type || !keyData.project_id || !keyData.private_key) {
        return {
          valid: false,
          error: 'Invalid service account key structure'
        };
      }

      return {
        valid: true,
        details: {
          projectId: keyData.project_id,
          keyType: keyData.type
        }
      };
    } catch (parseError) {
      return {
        valid: false,
        error: 'Invalid service account key format'
      };
    }
  } catch (error: any) {
    logger.error('GCP credentials validation failed', { error: error.message });
    return {
      valid: false,
      error: error.message || 'Failed to validate GCP credentials'
    };
  }
}

// Azure Credentials Validation - Simplified for now
export async function validateAzureCredentials(config: any): Promise<ValidationResult> {
  try {
    const { subscriptionId, tenantId, clientId, clientSecret } = config;

    if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
      return {
        valid: false,
        error: 'Missing required fields: subscriptionId, tenantId, clientId, clientSecret'
      };
    }

    // Basic validation - check if all required fields are present and non-empty
    if (!subscriptionId.trim() || !tenantId.trim() || !clientId.trim() || !clientSecret.trim()) {
      return {
        valid: false,
        error: 'All credential fields must be non-empty'
      };
    }

    // For now, just validate the format - actual Azure API calls can be added later
    return {
      valid: true,
      details: {
        subscriptionId,
        tenantId,
        clientId: clientId.substring(0, 8) + '...' // Partial ID for security
      }
    };
  } catch (error: any) {
    logger.error('Azure credentials validation failed', { error: error.message });
    return {
      valid: false,
      error: error.message || 'Failed to validate Azure credentials'
    };
  }
}

// Encrypt credentials
export async function encryptCredentials(credentials: any): Promise<string> {
  try {
    const credentialsString = JSON.stringify(credentials);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(credentialsString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return result;
  } catch (error: any) {
    logger.error('Failed to encrypt credentials', { error: error.message });
    throw new Error('Failed to encrypt credentials');
  }
}

// Decrypt credentials
export async function decryptCredentials(encryptedData: string): Promise<any> {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error: any) {
    logger.error('Failed to decrypt credentials', { error: error.message });
    throw new Error('Failed to decrypt credentials');
  }
} 