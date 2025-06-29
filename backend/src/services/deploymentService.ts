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
  private terraformDir = path.join(process.cwd(), 'terraform-workspaces');

  constructor() {
    // Ensure terraform workspaces directory exists
    if (!fs.existsSync(this.terraformDir)) {
      fs.mkdirSync(this.terraformDir, { recursive: true });
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

      // Create deployment record
      const deployment = await databaseService.createDeployment({
        userId,
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
    const workspacePath = path.join(this.terraformDir, deploymentId);
    
    try {
      // Get user's GitHub token
      const user = await databaseService.findUserById(repository.userId);
      if (!user || !user.githubAccessToken) {
        throw new Error('User not found or GitHub token not available');
      }
      
      const octokit = new Octokit({ auth: user.githubAccessToken });

      // Clone repository
      await execAsync(`git clone https://github.com/${repository.owner}/${repository.name}.git ${workspacePath}`);
      
      logger.info('Repository cloned successfully', { deploymentId, workspacePath });
      return workspacePath;
    } catch (error: any) {
      logger.error('Error cloning repository', error);
      throw new Error('Failed to clone repository');
    }
  }

  /**
   * Set up AWS credentials for Terraform
   */
  private async setupAWSCredentials(cloudConnection: any, workspacePath: string): Promise<void> {
    try {
      // Decrypt credentials
      const credentials = await decryptCredentials(cloudConnection.encryptedCredentials);
      
      // Create AWS credentials file
      const awsDir = path.join(workspacePath, '.aws');
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

      logger.info('AWS credentials configured', { workspacePath });
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

      // Generate or update .tf file for the resource
      const tfFile = path.join(terraformDir, `${resourceType}_${resourceName}.tf`);
      if (!fs.existsSync(tfFile)) {
        const tfBlock = `resource \"${resourceType}\" \"${resourceName}\" {\n  # Managed by DeployAI import\n}\n`;
        fs.writeFileSync(tfFile, tfBlock);
        logs.push(`Terraform resource block written to ${tfFile}`);
      } else {
        logs.push(`Terraform resource block already exists at ${tfFile}`);
      }

      // Run terraform init
      logs.push('Running terraform init...');
      const initResult = await execAsync('terraform init', { cwd: terraformDir });
      logs.push(initResult.stdout);

      // Run terraform import
      const importCmd = `terraform import ${resourceType}.${resourceName} ${resourceId}`;
      logs.push(`Running: ${importCmd}`);
      const importResult = await execAsync(importCmd, { cwd: terraformDir });
      logs.push(importResult.stdout);

      // Save the state file path
      const stateFilePath = path.join(terraformDir, 'terraform.tfstate');
      let stateContent = null;
      if (fs.existsSync(stateFilePath)) {
        stateContent = fs.readFileSync(stateFilePath, 'utf-8');
        logs.push(`Terraform state saved at ${stateFilePath}`);
      } else {
        logs.push('Terraform state file not found after import.');
      }

      // Optionally, update the repository record with state file path (pseudo-code, implement as needed)
      // await databaseService.updateRepository(workspaceId, { terraformStatePath: stateFilePath });

      return {
        success: true,
        output: importResult.stdout,
        logs,
        stateFilePath
      };
    } catch (error: any) {
      logger.error('Error importing Terraform resource', error);
      logs.push(error.stdout || error.stderr || error.message);
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