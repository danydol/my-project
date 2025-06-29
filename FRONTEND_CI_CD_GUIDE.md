# Frontend CI/CD Workflow Trigger Guide

This guide explains how to trigger GitHub Actions CI/CD workflows directly from the DeployAI frontend interface.

## 🚀 Overview

The DeployAI frontend provides a user-friendly interface to trigger and monitor GitHub Actions workflows without needing to use the GitHub web interface or command line. This allows you to:

- **Trigger deployments** with custom parameters
- **Manage infrastructure** through Terraform workflows
- **Run comprehensive tests** and quality checks
- **Update dependencies** and security patches
- **Monitor workflow execution** in real-time

## 📋 Available Workflows

### 1. **Deploy Application** (`deploy.yml`)
**Purpose**: Full application deployment with comprehensive validation and security checks.

**When to use**:
- Deploy your application to staging or production
- After code changes that need to be deployed
- When you want to run a complete CI/CD pipeline

**Parameters**:
- **Environment**: `staging` or `production`
- **Cloud Connection ID**: Your AWS connection
- **Region**: AWS region (il-central-1, us-east-1, us-west-2, eu-west-1, ap-southeast-1)
- **Branch**: Source branch (main, develop, feature-by-dan)

**What it does**:
- ✅ Validates configuration and environment
- 🔒 Runs security scans (Trivy, npm audit)
- 🧪 Executes comprehensive tests
- 🐳 Builds multi-platform Docker images
- 🚀 Deploys to selected environment
- 📊 Provides deployment status tracking

### 2. **Infrastructure Provisioning** (`infrastructure.yml`)
**Purpose**: Terraform-based infrastructure management with security and compliance checks.

**When to use**:
- Provision new infrastructure resources
- Update existing infrastructure
- Plan infrastructure changes before applying
- Destroy infrastructure when no longer needed

**Parameters**:
- **Environment**: `staging` or `production`
- **Action**: `plan`, `apply`, or `destroy`
- **Region**: AWS region
- **Cloud Connection ID**: Your AWS connection

**What it does**:
- 🏗️ Validates Terraform configuration
- 🔒 Runs security scans (Checkov, TFLint)
- 📋 Generates execution plan
- 🚀 Applies infrastructure changes
- 📊 Tracks infrastructure outputs

### 3. **Test and Quality Assurance** (`test.yml`)
**Purpose**: Comprehensive testing and quality checks with automated reporting.

**When to use**:
- Run tests after code changes
- Perform security vulnerability scans
- Generate code quality reports
- Validate build processes

**Parameters**:
- **Test Type**: `all`, `unit`, `integration`, `e2e`, or `security`
- **Test Environment**: `staging` or `production`

**What it does**:
- 🧹 Runs linting and formatting checks
- 🔒 Performs security vulnerability scanning
- 🧪 Executes unit, integration, and e2e tests
- 📊 Generates code coverage reports
- 🚀 Runs performance testing
- 📈 Analyzes code quality

### 4. **Dependency Management** (`dependencies.yml`)
**Purpose**: Automated dependency management and security updates.

**When to use**:
- Check for outdated dependencies
- Update dependencies to latest versions
- Apply security patches
- Audit dependency health

**Parameters**:
- **Action**: `check`, `update`, `security-fix`, or `audit`
- **Scope**: `all`, `production`, `development`, or `security`

**What it does**:
- 🔍 Scans for security vulnerabilities
- 📦 Detects outdated dependencies
- 🗑️ Identifies unused dependencies
- 🤖 Automates dependency updates
- 🔒 Applies security patches
- 📊 Generates dependency health reports

## 🎯 How to Trigger Workflows

### Method 1: From Deployments Page

1. **Navigate to Deployments**
   - Go to the Deployments page in the DeployAI interface
   - Click the **"Trigger Workflow"** button in the header

2. **Configure Workflow Parameters**
   - Select the workflow you want to trigger
   - Choose the target environment (staging/production)
   - Select your cloud connection
   - Pick the AWS region
   - Choose the source branch

3. **Trigger the Workflow**
   - Review your configuration
   - Click **"Trigger Workflow"**
   - Monitor the execution in real-time

### Method 2: From Individual Deployment

1. **Select a Deployment**
   - Go to the Deployments page
   - Find the deployment you want to trigger a workflow for
   - Click the **⚡ (Zap)** button next to the deployment

2. **Configure and Trigger**
   - The modal will pre-populate with the deployment's repository
   - Configure the workflow parameters as needed
   - Click **"Trigger Workflow"**

### Method 3: From GitHub Actions Status

1. **View GitHub Actions**
   - Click the **GitHub** button on any deployment
   - View the current workflow status

2. **Trigger New Workflow**
   - Click **"Trigger Deploy"** or **"Run First Deployment"**
   - Configure parameters and trigger

## 🔧 Workflow Configuration

### Environment Selection

**Staging Environment**:
- Use for testing and validation
- Safe for frequent deployments
- Includes comprehensive testing
- Lower resource costs

**Production Environment**:
- Use for live deployments
- Requires additional validation
- Includes health checks and monitoring
- Higher resource costs

### Cloud Connection Setup

Before triggering workflows, ensure you have:

1. **AWS Connection Configured**
   - Valid AWS credentials
   - Appropriate permissions
   - Correct region settings

2. **GitHub Integration**
   - Repository connected to DeployAI
   - GitHub token configured
   - Proper repository permissions

### Branch Selection

**main**: Production-ready code
**develop**: Development/testing code
**feature-by-dan**: Feature branch for testing

## 📊 Monitoring Workflow Execution

### Real-time Status Updates

1. **Workflow Status**
   - View current execution status
   - See individual job progress
   - Monitor step-by-step execution

2. **Logs and Outputs**
   - Access detailed execution logs
   - View test results and reports
   - Check security scan results

3. **Notifications**
   - Success/failure notifications
   - Email alerts (if configured)
   - Slack/Teams integration (if configured)

### GitHub Actions Integration

- **Direct Link**: Click "Open Actions" to view in GitHub
- **Real-time Updates**: Status refreshes automatically
- **Detailed Logs**: Access full execution history
- **Artifacts**: Download test reports and build artifacts

## 🛡️ Security and Best Practices

### Security Features

- **Secret Management**: Credentials stored securely
- **Access Control**: User-based permissions
- **Audit Logging**: All actions logged
- **Environment Isolation**: Separate staging/production

### Best Practices

1. **Always Test in Staging First**
   - Use staging environment for testing
   - Validate changes before production
   - Run comprehensive tests

2. **Monitor Workflow Execution**
   - Watch for failures and errors
   - Review logs for issues
   - Check security scan results

3. **Use Appropriate Branches**
   - Use feature branches for development
   - Merge to develop for staging
   - Merge to main for production

4. **Regular Dependency Updates**
   - Schedule regular dependency checks
   - Apply security patches promptly
   - Keep dependencies up to date

## 🔍 Troubleshooting

### Common Issues

**Workflow Fails to Trigger**:
- Check GitHub token permissions
- Verify repository access
- Ensure cloud connection is valid

**Deployment Fails**:
- Review AWS credentials
- Check resource limits
- Verify Terraform configuration

**Tests Fail**:
- Review test logs
- Check code quality issues
- Verify dependency versions

### Getting Help

1. **Check Logs**: Review detailed execution logs
2. **GitHub Actions**: View full logs in GitHub
3. **Support**: Contact DeployAI support team
4. **Documentation**: Refer to workflow documentation

## 📈 Advanced Features

### Custom Workflow Inputs

Some workflows support custom inputs:

```json
{
  "environment": "staging",
  "cloud_connection_id": "your-connection-id",
  "region": "us-east-1",
  "custom_variables": {
    "instance_type": "t3.large",
    "environment_name": "staging"
  }
}
```

### Workflow Chaining

Workflows can be chained together:

1. **Test** → **Deploy** → **Monitor**
2. **Infrastructure** → **Deploy** → **Test**
3. **Dependencies** → **Test** → **Deploy**

### Automated Triggers

Workflows can be triggered automatically:

- **Push to main**: Triggers production deployment
- **Push to develop**: Triggers staging deployment
- **Pull Request**: Triggers testing workflow
- **Scheduled**: Daily dependency checks

## 🎉 Success Metrics

Track your CI/CD success with these metrics:

- **Deployment Frequency**: How often you deploy
- **Lead Time**: Time from commit to deployment
- **Mean Time to Recovery**: Time to fix failures
- **Change Failure Rate**: Percentage of failed deployments

---

For more information, see the [GitHub Actions README](.github/README.md) and [DeployAI Documentation](README.md). 