import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger';
import databaseService from './databaseService';
import { decryptCredentials } from './cloudService';

const execAsync = promisify(exec);

interface DeploymentConfig {
  projectId?: string;
  repositoryId: string;
  cloudConnectionId: string;
  environment: string;
  region: string;
  terraformVersion?: string;
  variables?: Record<string, string>;
}

interface TerraformExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  state?: any;
}

class DeploymentService {
  private terraformDir = '/app/terraform-workspaces';
  private tempDir = path.join(this.terraformDir, 'tmp');

  constructor() {
    // Ensure temp directory exists (not the parent)
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    // Set permissions to 2777 for tempDir
    try {
      fs.chmodSync(this.tempDir, 0o2777);
      logger.info('Set permissions 2777 on tempDir', { tempDir: this.tempDir });
    } catch (chmodErr) {
      logger.error('Failed to set permissions 2777 on tempDir', { tempDir: this.tempDir, error: chmodErr });
    }
  }

  /**
   * Create a new deployment with AWS connection and Git integration
   */
  async createDeployment(
    userId: string,
    config: DeploymentConfig
  ): Promise<any> {
    try {
      // Get repository and cloud connection details
      const repository = await databaseService.getRepositoryById(config.repositoryId);
      const cloudConnection = await databaseService.getCloudConnectionById(config.cloudConnectionId);
      
      if (!repository || !cloudConnection) {
        throw new Error('Repository or cloud connection not found');
      }

      // If projectId is provided, verify the user has access to the project
      if (config.projectId) {
        const project = await databaseService.findProjectById(config.projectId);
        if (!project || project.userId !== userId) {
          throw new Error('Project not found or access denied');
        }
        
        // Verify repository belongs to the project
        if (repository.projectId !== config.projectId) {
          throw new Error('Repository does not belong to the specified project');
        }
        
        // Verify cloud connection belongs to the project
        if (cloudConnection.projectId !== config.projectId) {
          throw new Error('Cloud connection does not belong to the specified project');
        }
      }

      // Create deployment record
      const deployment = await databaseService.createDeployment({
        userId,
        projectId: config.projectId,
        repositoryId: config.repositoryId,
        cloudConnectionId: config.cloudConnectionId,
        name: `${repository.name}-${config.environment}`,
        environment: config.environment,
        provider: cloudConnection.provider,
      });

      // Start deployment process
      this.executeDeployment(deployment.id, config, repository, cloudConnection);

      return deployment;
    } catch (error) {
      logger.error('Error creating deployment', error);
      throw error;
    }
  }

  /**
   * Execute the deployment process
   */
  private async executeDeployment(
    deploymentId: string,
    config: DeploymentConfig,
    repository: any,
    cloudConnection: any
  ): Promise<void> {
    try {
      // Update status to deploying
      await databaseService.updateDeploymentStatus(deploymentId, 'deploying');

      // Clone repository
      const workspacePath = await this.cloneRepository(repository, deploymentId);

      // Set up AWS credentials
      await this.setupAWSCredentials(cloudConnection, workspacePath);

      // Generate Terraform configuration
      await this.generateTerraformConfig(config, workspacePath);

      // Execute Terraform
      const terraformResult = await this.executeTerraform(workspacePath, config);

      if (terraformResult.success) {
        // Update deployment with success
        const deploymentUrl = terraformResult.output
          ? this.extractDeploymentUrl(terraformResult.output)
          : null;
        const updateData: any = { logs: terraformResult.output };
        if (deploymentUrl) {
          updateData.deploymentUrl = deploymentUrl;
        } else {
          updateData.deploymentUrl = null;
        }
        await databaseService.updateDeploymentStatus(deploymentId, 'deployed', updateData);
      } else {
        await databaseService.updateDeploymentStatus(deploymentId, 'failed', {
          errorMessage: terraformResult.error,
          logs: terraformResult.output
        });
      }
    } catch (error: any) {
      logger.error('Error executing deployment', error);
      await databaseService.updateDeploymentStatus(deploymentId, 'failed', {
        errorMessage: error.message
      });
    }
  }

  /**
   * Clone repository to local workspace
   */
  private async cloneRepository(repository: any, deploymentId: string): Promise<string> {
    // Use a unique temp directory for this operation
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const workspacePath = path.join(this.tempDir, `deploy-${deploymentId}-${uniqueId}`);

    try {
      // Clean up if the directory exists (should not, but for safety)
      if (fs.existsSync(workspacePath)) {
        try {
          logger.warn('Temp workspace already exists, removing', { workspacePath });
          fs.rmSync(workspacePath, { recursive: true, force: true });
        } catch (rmErr) {
          logger.error('Failed to remove existing temp workspace', { workspacePath, error: rmErr });
          throw new Error(`Failed to remove existing temp workspace: ${rmErr}`);
        }
      }

      // Ensure parent directory has permissions 2777
      const parentDir = path.dirname(workspacePath);
      try {
        fs.chmodSync(parentDir, 0o2777);
        logger.info('Set permissions 2777 on parentDir before clone', { parentDir });
      } catch (chmodErr) {
        logger.error('Failed to set permissions 2777 on parentDir', { parentDir, error: chmodErr });
      }

      // Log directory state before clone
      let parentContents: string[] = [];
      let parentPerms = '';
      try {
        parentContents = fs.readdirSync(parentDir);
        parentPerms = fs.statSync(parentDir).mode.toString(8);
      } catch (dirErr) {
        logger.error('Failed to stat parent dir before clone', { parentDir, error: dirErr });
      }
      logger.info('Preparing to git clone', { workspacePath, parentDir, parentContents, parentPerms });

      // Get user's GitHub token
      const user = await databaseService.findUserById(repository.userId);
      if (!user || !user.githubAccessToken) {
        throw new Error('User not found or GitHub token not available');
      }

      // Clone repository (do NOT pre-create workspacePath)
      const repoUrl = `https://github.com/${repository.owner}/${repository.name}.git`;
      await execAsync(`git clone ${repoUrl} ${workspacePath}`);

      logger.info('Repository cloned successfully', { deploymentId, workspacePath });
      return workspacePath;
    } catch (error: any) {
      logger.error('Error cloning repository', { error, workspacePath });
      throw new Error('Failed to clone repository');
    }
  }

  /**
   * Set up AWS credentials for Terraform
   */
  private async setupAWSCredentials(cloudConnection: any, workspacePath: string): Promise<void> {
    try {
      // Decrypt credentials from the config field
      const credentials = await decryptCredentials(cloudConnection.config);
      
      // Create AWS credentials file in the terraform directory where Terraform will run
      const terraformDir = path.join(workspacePath, 'terraform');
      const awsDir = path.join(terraformDir, '.aws');
      fs.mkdirSync(awsDir, { recursive: true });

      const credentialsContent = `[default]
aws_access_key_id = ${credentials.accessKeyId}
aws_secret_access_key = ${credentials.secretAccessKey}
${credentials.sessionToken ? `aws_session_token = ${credentials.sessionToken}` : ''}
region = ${cloudConnection.region}
`;

      fs.writeFileSync(path.join(awsDir, 'credentials'), credentialsContent);
      fs.writeFileSync(path.join(awsDir, 'config'), `[default]
region = ${cloudConnection.region}
output = json
`);

      // Set environment variables
      process.env.AWS_PROFILE = 'default';
      process.env.AWS_DEFAULT_REGION = cloudConnection.region;

      logger.info('AWS credentials configured', { terraformDir });
    } catch (error) {
      logger.error('Error setting up AWS credentials', error);
      throw new Error('Failed to configure AWS credentials');
    }
  }

  /**
   * Generate Terraform configuration
   */
  private async generateTerraformConfig(config: DeploymentConfig, workspacePath: string): Promise<void> {
    try {
      const terraformDir = path.join(workspacePath, 'terraform');
      fs.mkdirSync(terraformDir, { recursive: true });

      // Generate main.tf
      const mainTf = this.generateMainTerraform(config);
      fs.writeFileSync(path.join(terraformDir, 'main.tf'), mainTf);

      // Generate variables.tf
      const variablesTf = this.generateVariablesTerraform(config);
      fs.writeFileSync(path.join(terraformDir, 'variables.tf'), variablesTf);

      // Generate terraform.tfvars
      const tfvars = this.generateTerraformVars(config);
      fs.writeFileSync(path.join(terraformDir, 'terraform.tfvars'), tfvars);

      // Generate user_data.sh
      const userData = this.generateUserDataScript(config);
      fs.writeFileSync(path.join(terraformDir, 'user_data.sh'), userData);

      logger.info('Terraform configuration generated', { workspacePath });
    } catch (error) {
      logger.error('Error generating Terraform configuration', error);
      throw new Error('Failed to generate Terraform configuration');
    }
  }

  /**
   * Generate user data script for EC2 instance
   */
  private generateUserDataScript(config: DeploymentConfig): string {
    return `#!/bin/bash

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Create application directory
mkdir -p /opt/app
cd /opt/app

# Clone the repository (this will be done by the deployment service)
# git clone https://github.com/${config.repositoryId}.git .

# Create docker-compose.yml for the application
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
EOF

# Create a simple Dockerfile if none exists
if [ ! -f "Dockerfile" ]; then
  cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3004
CMD ["npm", "start"]
EOF
fi

# Create a simple package.json if none exists
if [ ! -f "package.json" ]; then
  cat > package.json << 'EOF'
{
  "name": "deployai-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF
fi

# Create a simple Express server if none exists
if [ ! -f "index.js" ]; then
  cat > index.js << 'EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3004;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Deploy.AI!',
    environment: '${config.environment}',
    project: '${config.repositoryId}',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
fi

# Build and start the application
docker-compose up -d --build

# Create a simple monitoring script
cat > /opt/monitor.sh << 'EOF'
#!/bin/bash
while true; do
  if ! docker-compose ps | grep -q "Up"; then
    echo "Application is down, restarting..."
    cd /opt/app
    docker-compose up -d
  fi
  sleep 60
done
EOF

chmod +x /opt/monitor.sh

# Start monitoring in background
nohup /opt/monitor.sh > /var/log/monitor.log 2>&1 &

# Create a simple log rotation
cat > /etc/logrotate.d/app-logs << 'EOF'
/opt/app/logs/*.log {
  daily
  missingok
  rotate 7
  compress
  notifempty
  create 644 root root
}
EOF

echo "User data script completed for ${config.environment} environment"
`;
  }

  /**
   * Execute Terraform commands
   */
  private async executeTerraform(workspacePath: string, config: DeploymentConfig): Promise<TerraformExecutionResult> {
    const terraformDir = path.join(workspacePath, 'terraform');
    
    try {
      // Initialize Terraform
      const initResult = await execAsync('terraform init', { cwd: terraformDir });
      
      // Plan Terraform
      const planResult = await execAsync('terraform plan -out=tfplan', { cwd: terraformDir });
      
      // Apply Terraform
      const applyResult = await execAsync('terraform apply tfplan', { cwd: terraformDir });
      
      // Get outputs
      const outputResult = await execAsync('terraform output -json', { cwd: terraformDir });
      
      return {
        success: true,
        output: applyResult.stdout + '\n' + outputResult.stdout,
        state: JSON.parse(outputResult.stdout)
      };
    } catch (error: any) {
      logger.error('Error executing Terraform', error);
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr
      };
    }
  }

  /**
   * Generate main Terraform configuration
   */
  private generateMainTerraform(config: DeploymentConfig): string {
    return `
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.project_name}-\${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.project_name}-\${var.environment}-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "\${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.project_name}-\${var.environment}-public-subnet"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "\${var.project_name}-\${var.environment}-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "app" {
  name_prefix = "\${var.project_name}-\${var.environment}-app-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3010
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-\${var.environment}-app-sg"
  }
}

# EC2 Instance
resource "aws_instance" "app" {
  ami                    = var.ec2_ami
  instance_type          = var.ec2_instance_type
  vpc_security_group_ids = [aws_security_group.app.id]
  subnet_id             = aws_subnet.public.id
  
  root_block_device {
    volume_size = var.ec2_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = base64encode(templatefile("\${path.module}/user_data.sh", {
    project_name = var.project_name
    environment  = var.environment
  }))

  tags = {
    Name = "\${var.project_name}-\${var.environment}-app"
  }
}

# Elastic IP
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name = "\${var.project_name}-\${var.environment}-eip"
  }
}

# S3 Bucket for application data
resource "aws_s3_bucket" "app_data" {
  bucket = "\${var.project_name}-\${var.environment}-data-\${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "\${var.project_name}-\${var.environment}-data"
    Environment = var.environment
  }
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "app_data_versioning" {
  bucket = aws_s3_bucket.app_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "app_data_encryption" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Random string for bucket suffix
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}
`;
  }

  /**
   * Generate variables Terraform configuration
   */
  private generateVariablesTerraform(config: DeploymentConfig): string {
    return `
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "${config.region}"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "deployai"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "${config.environment}"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "ec2_ami" {
  description = "AMI ID for EC2 instance"
  type        = string
  default     = "ami-0c02fb55956c7d316"
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "ec2_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 20
}
`;
  }

  /**
   * Generate Terraform variables file
   */
  private generateTerraformVars(config: DeploymentConfig): string {
    return `
aws_region = "${config.region}"
project_name = "deployai"
environment = "${config.environment}"
vpc_cidr = "10.0.0.0/16"
public_subnet_cidr = "10.0.1.0/24"
ec2_ami = "ami-0c02fb55956c7d316"
ec2_instance_type = "t3.medium"
ec2_volume_size = 20
`;
  }

  /**
   * Extract deployment URL from Terraform output
   */
  private extractDeploymentUrl(output: string): string | null {
    const match = output.match(/public_ip\s*=\s*"([^"]+)"/);
    return match ? `http://${match[1]}:3004` : null;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<any> {
    try {
      const deployment = await databaseService.getDeploymentById(deploymentId);
      return deployment;
    } catch (error: any) {
      logger.error('Error getting deployment status', error);
      throw error;
    }
  }

  /**
   * List user deployments
   */
  async getUserDeployments(userId: string): Promise<any[]> {
    try {
      const deployments = await databaseService.getUserDeployments(userId);
      return deployments;
    } catch (error: any) {
      logger.error('Error getting user deployments', error);
      throw error;
    }
  }

  /**
   * Destroy deployment
   */
  async destroyDeployment(deploymentId: string): Promise<void> {
    try {
      const deployment = await databaseService.getDeploymentById(deploymentId);
      if (!deployment) {
        throw new Error('Deployment not found');
      }

      // Update status to destroying
      await databaseService.updateDeploymentStatus(deploymentId, 'destroying');

      const workspacePath = path.join(this.terraformDir, deploymentId);
      const terraformDir = path.join(workspacePath, 'terraform');

      if (fs.existsSync(terraformDir)) {
        // Execute terraform destroy
        await execAsync('terraform destroy -auto-approve', { cwd: terraformDir });
      }

      // Update status to destroyed
      await databaseService.updateDeploymentStatus(deploymentId, 'destroyed');

      // Clean up workspace
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    } catch (error: any) {
      logger.error('Error destroying deployment', error);
      await databaseService.updateDeploymentStatus(deploymentId, 'failed', {
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Sanitize resource name for Terraform
   * Terraform resource names must start with a letter or underscore and contain only letters, digits, underscores, and dashes
   */
  private sanitizeResourceName(resourceName: string): string {
    // Remove any file extensions
    let sanitized = resourceName.replace(/\.[^/.]+$/, '');
    
    // Replace dots, spaces, and other invalid characters with underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Ensure it starts with a letter or underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = 'resource_' + sanitized;
    }
    
    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    // Ensure it's not empty
    if (!sanitized) {
      sanitized = 'resource';
    }
    
    logger.info(`Sanitized resource name: '${resourceName}' -> '${sanitized}'`);
    return sanitized;
  }

  /**
   * Map common resource types to Terraform resource names
   */
  private mapResourceType(resourceType: string): string {
    // Clean up the resource type - remove any extra text in parentheses and spaces
    let cleanedType = resourceType.trim();
    
    // Remove text in parentheses like "(EC2)" from "aws_instance (EC2)"
    cleanedType = cleanedType.replace(/\s*\([^)]*\)/g, '');
    
    // Remove any extra spaces
    cleanedType = cleanedType.replace(/\s+/g, '');
    
    const resourceTypeMap: Record<string, string> = {
      'ec2': 'aws_instance',
      'instance': 'aws_instance',
      'vm': 'aws_instance',
      's3': 'aws_s3_bucket',
      'bucket': 'aws_s3_bucket',
      'vpc': 'aws_vpc',
      'subnet': 'aws_subnet',
      'security-group': 'aws_security_group',
      'sg': 'aws_security_group',
      'rds': 'aws_db_instance',
      'database': 'aws_db_instance',
      'lambda': 'aws_lambda_function',
      'function': 'aws_lambda_function',
      'elb': 'aws_lb',
      'load-balancer': 'aws_lb',
      'alb': 'aws_lb',
      'nlb': 'aws_lb',
      'iam-role': 'aws_iam_role',
      'role': 'aws_iam_role',
      'iam-user': 'aws_iam_user',
      'user': 'aws_iam_user',
      'iam-policy': 'aws_iam_policy',
      'policy': 'aws_iam_policy'
    };

    // If the resource type is already a valid Terraform resource name, return it as is
    if (cleanedType.startsWith('aws_')) {
      logger.info(`Using Terraform resource type: ${cleanedType}`);
      return cleanedType;
    }

    // Map common names to Terraform resource names
    const mappedType = resourceTypeMap[cleanedType.toLowerCase()];
    if (mappedType) {
      logger.info(`Mapped resource type '${resourceType}' -> '${cleanedType}' -> '${mappedType}'`);
      return mappedType;
    }

    // If no mapping found, assume it's already a Terraform resource name
    logger.info(`Using resource type as-is: ${cleanedType}`);
    return cleanedType;
  }

  /**
   * Import a resource into Terraform state
   * @param params { workspaceId, resourceType, resourceName, resourceId, cloudConnection }
   */
  async importTerraformResource({
    workspaceId,
    resourceType,
    resourceName,
    resourceId,
    cloudConnection
  }: {
    workspaceId: string;
    resourceType: string;
    resourceName: string;
    resourceId: string;
    cloudConnection: any;
  }): Promise<TerraformExecutionResult & { logs: string[], stateFilePath?: string }> {
    const logs: string[] = [];
    try {
      // Map resource type to correct Terraform resource name
      const mappedResourceType = this.mapResourceType(resourceType);
      logs.push(`Resource type: ${resourceType} -> ${mappedResourceType}`);

      // Sanitize resource name for Terraform
      const sanitizedResourceName = this.sanitizeResourceName(resourceName);
      logs.push(`Resource name: ${resourceName} -> ${sanitizedResourceName}`);

      // Prepare workspace
      const workspacePath = path.join(this.terraformDir, workspaceId);
      const terraformDir = path.join(workspacePath, 'terraform');
      fs.mkdirSync(terraformDir, { recursive: true });
      logs.push(`Workspace prepared at ${terraformDir}`);

      // Set up credentials (AWS only for now)
      if (cloudConnection.provider === 'aws') {
        await this.setupAWSCredentials(cloudConnection, workspacePath);
        logs.push('AWS credentials configured');
      }
      // TODO: Add support for GCP/Azure

      // Check if Terraform files exist
      const mainTfFile = path.join(terraformDir, 'main.tf');
      const terraformInitFile = path.join(terraformDir, '.terraform');
      const stateFile = path.join(terraformDir, 'terraform.tfstate');
      
      let needsInit = false;
      let mainTfContent: string;

      if (!fs.existsSync(mainTfFile)) {
        // Create a complete Terraform configuration with provider requirements
        logs.push('No main.tf found - creating new Terraform configuration');
        mainTfContent = `terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${cloudConnection.region || 'us-east-1'}"
}

resource "${mappedResourceType}" "${sanitizedResourceName}" {
  # Managed by DeployAI import
  # Resource ID: ${resourceId}
}
`;
        fs.writeFileSync(mainTfFile, mainTfContent);
        logs.push(`Created new main.tf with resource ${mappedResourceType}.${sanitizedResourceName}`);
        needsInit = true;
      } else {
        // Read existing content and check if the resource already exists
        const existingContent = fs.readFileSync(mainTfFile, 'utf-8');
        const resourcePattern = new RegExp(`resource\\s+"${mappedResourceType}"\\s+"${sanitizedResourceName}"\\s*{`);
        
        if (resourcePattern.test(existingContent)) {
          logs.push(`Resource ${mappedResourceType}.${sanitizedResourceName} already exists in main.tf`);
        } else {
          // Append the new resource to the existing file
          mainTfContent = existingContent + `

resource "${mappedResourceType}" "${sanitizedResourceName}" {
  # Managed by DeployAI import
  # Resource ID: ${resourceId}
}
`;
          fs.writeFileSync(mainTfFile, mainTfContent);
          logs.push(`Added resource ${mappedResourceType}.${sanitizedResourceName} to existing main.tf`);
        }
      }

      // Check if Terraform needs initialization
      if (!fs.existsSync(terraformInitFile) || needsInit) {
        logs.push('Running terraform init...');
        try {
          const initResult = await execAsync('terraform init', { cwd: terraformDir });
          logs.push('Terraform init successful');
          logs.push(initResult.stdout);
        } catch (initError: any) {
          logs.push(`Terraform init failed: ${initError.message}`);
          if (initError.stdout) logs.push(initError.stdout);
          if (initError.stderr) logs.push(initError.stderr);
          throw new Error(`Terraform initialization failed: ${initError.message}`);
        }
      } else {
        logs.push('Terraform already initialized, skipping init');
      }

      // Check if resource is already in state
      let resourceInState = false;
      if (fs.existsSync(stateFile)) {
        try {
          const stateContent = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          const resourceKey = `${mappedResourceType}.${sanitizedResourceName}`;
          if (stateContent.resources && stateContent.resources.some((r: any) => r.name === sanitizedResourceName && r.type === mappedResourceType)) {
            resourceInState = true;
            logs.push(`Resource ${resourceKey} already exists in Terraform state`);
          }
        } catch (stateError) {
          logs.push(`Error reading state file: ${stateError}`);
        }
      }

      // Run terraform import if resource is not in state
      if (!resourceInState) {
        const importCmd = `terraform import ${mappedResourceType}.${sanitizedResourceName} ${resourceId}`;
        logs.push(`Running: ${importCmd}`);
        try {
          const importResult = await execAsync(importCmd, { cwd: terraformDir });
          logs.push('Terraform import successful');
          logs.push(importResult.stdout);
        } catch (importError: any) {
          logs.push(`Terraform import failed: ${importError.message}`);
          if (importError.stdout) logs.push(importError.stdout);
          if (importError.stderr) logs.push(importError.stderr);
          throw new Error(`Terraform import failed: ${importError.message}`);
        }
      }

      // Verify the state file was created/updated
      let stateContent = null;
      if (fs.existsSync(stateFile)) {
        stateContent = fs.readFileSync(stateFile, 'utf-8');
        logs.push(`Terraform state saved at ${stateFile}`);
        
        // Verify the resource is in state
        try {
          const stateJson = JSON.parse(stateContent);
          const resourceKey = `${mappedResourceType}.${sanitizedResourceName}`;
          const resourceExists = stateJson.resources && stateJson.resources.some((r: any) => 
            r.name === sanitizedResourceName && r.type === mappedResourceType
          );
          
          if (resourceExists) {
            logs.push(`✅ Resource ${resourceKey} successfully imported to Terraform state`);
          } else {
            logs.push(`⚠️ Resource ${resourceKey} not found in state file after import`);
          }
        } catch (parseError) {
          logs.push(`⚠️ Could not parse state file to verify resource: ${parseError}`);
        }
      } else {
        logs.push('⚠️ Terraform state file not found after import');
      }

      return {
        success: true,
        output: `Resource ${mappedResourceType}.${sanitizedResourceName} imported successfully`,
        logs,
        stateFilePath: stateFile
      };
    } catch (error: any) {
      logger.error('Error importing Terraform resource', error);
      logs.push(`❌ Error: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(error.stderr);
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
        logs
      };
    }
  }
}

export default new DeploymentService(); 