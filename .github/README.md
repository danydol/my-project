# GitHub Actions CI/CD with Deploy.AI

This directory contains GitHub Actions workflows that integrate with the Deploy.AI platform to provide automated CI/CD, infrastructure provisioning, and quality assurance.

## 📋 Workflows Overview

### 1. **deploy.yml** - Application Deployment
Automatically deploys your application to AWS using Deploy.AI when code is pushed to main/develop branches.

**Triggers:**
- Push to `main` branch → Production deployment
- Push to `develop` branch → Staging deployment
- Pull requests → Analysis and comments
- Manual workflow dispatch → Custom environment deployment

**Features:**
- ✅ Automatic environment detection
- ✅ AWS infrastructure provisioning via Deploy.AI
- ✅ Deployment status tracking
- ✅ PR comments with deployment info
- ✅ Commit status updates

### 2. **infrastructure.yml** - Infrastructure Management
Manages AWS infrastructure provisioning, updates, and destruction through Deploy.AI.

**Triggers:**
- Manual workflow dispatch only

**Actions:**
- 🏗️ **Provision** - Create new infrastructure (EKS, ECS, EC2, Serverless)
- 🔄 **Update** - Update existing infrastructure
- 🗑️ **Destroy** - Remove infrastructure

**Infrastructure Types:**
- **EKS** - Kubernetes clusters
- **ECS** - Container orchestration
- **EC2** - Virtual machines
- **Serverless** - Lambda functions

### 3. **test.yml** - Quality Assurance
Comprehensive testing and quality checks before deployment.

**Triggers:**
- Push to any branch
- Pull requests

**Checks:**
- ✅ Unit tests (Node.js 18 & 20)
- ✅ Integration tests
- ✅ E2E tests (Playwright)
- ✅ Security scans (Trivy, Snyk)
- ✅ Code coverage
- ✅ Bundle size analysis
- ✅ Performance tests
- ✅ Docker security scans

## 🔧 Configuration

### Required GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Deploy.AI Configuration
```bash
DEPLOY_AI_API_URL=https://7e72-77-137-25-91.ngrok-free.app
DEPLOY_AI_TOKEN=your_jwt_token_from_deploy_ai
```

#### Repository Configuration
```bash
REPOSITORY_ID=your_repository_id_from_deploy_ai
DEFAULT_CLOUD_CONNECTION_ID=your_default_aws_connection_id
```

#### AWS Configuration
```bash
AWS_REGION=il-central-1
```

#### Security Tools (Optional)
```bash
SNYK_TOKEN=your_snyk_token
CODECOV_TOKEN=your_codecov_token
```

### How to Get Deploy.AI Token

1. **Login to Deploy.AI Platform**
   - Access your Deploy.AI instance
   - Login with GitHub OAuth

2. **Get JWT Token**
   - Open browser developer tools
   - Go to Application/Storage tab
   - Find the JWT token in localStorage
   - Copy the token value

3. **Get Repository ID**
   - In Deploy.AI dashboard, go to Projects
   - Select your project
   - Copy the repository ID from the URL or project details

4. **Get Cloud Connection ID**
   - In Deploy.AI dashboard, go to Cloud Connections
   - Select your AWS connection
   - Copy the connection ID

## 🚀 Usage

### Automatic Deployment

1. **Push to main branch** → Automatic production deployment
2. **Push to develop branch** → Automatic staging deployment
3. **Create pull request** → Analysis and quality checks

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **Deploy to AWS via Deploy.AI**
3. Click **Run workflow**
4. Choose:
   - **Environment**: staging/production
   - **Cloud Connection ID**: Your AWS connection ID

### Manual Infrastructure Management

1. Go to **Actions** tab in GitHub
2. Select **Provision AWS Infrastructure via Deploy.AI**
3. Click **Run workflow**
4. Choose:
   - **Action**: provision/update/destroy
   - **Environment**: staging/production
   - **Cloud Connection ID**: Your AWS connection ID
   - **Infrastructure Type**: eks/ecs/ec2/serverless

## 📊 Monitoring

### Deployment Status
- Check **Actions** tab for workflow status
- View deployment logs in real-time
- Monitor deployment progress

### Infrastructure Status
- Track infrastructure provisioning in Deploy.AI dashboard
- View Terraform logs and outputs
- Monitor resource creation/destruction

### Quality Gates
- All tests must pass before deployment
- Security scans must be clean
- Code coverage requirements met
- Bundle size within limits

## 🔒 Security Features

### Automated Security Scanning
- **Trivy** - Vulnerability scanning for code and Docker images
- **Snyk** - Dependency vulnerability scanning
- **GitHub Security** - Integration with GitHub Security tab

### Secrets Management
- All sensitive data stored in GitHub Secrets
- No hardcoded credentials in workflows
- Secure token-based authentication

### Infrastructure Security
- AWS credentials managed by Deploy.AI
- Encrypted credential storage
- Secure Terraform state management

## 🛠️ Customization

### Environment-Specific Configuration

You can customize the workflows for different environments:

```yaml
# In deploy.yml
variables:
  instance_type: "t3.medium"  # Customize instance type
  environment: "production"    # Environment-specific variables
  git_commit_sha: "${{ github.sha }}"
```

### Custom Infrastructure Types

Add new infrastructure types in `infrastructure.yml`:

```yaml
infrastructure_type:
  options:
  - eks
  - ecs
  - ec2
  - serverless
  - your-custom-type  # Add your custom type
```

### Quality Gate Customization

Modify quality gates in `test.yml`:

```yaml
# Adjust coverage thresholds
coverage_threshold: 80

# Custom security scan rules
security_level: moderate

# Bundle size limits
max_bundle_size: 500KB
```

## 🐛 Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check AWS credentials in Deploy.AI
   - Verify cloud connection is active
   - Review Terraform logs in Deploy.AI dashboard

2. **Tests Fail**
   - Run tests locally first
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **Security Scans Fail**
   - Update vulnerable dependencies
   - Review security scan reports
   - Address high-severity vulnerabilities

4. **Infrastructure Provisioning Fails**
   - Check AWS region availability
   - Verify IAM permissions
   - Review Terraform configuration

### Debug Mode

Enable debug logging by adding to workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## 📚 Additional Resources

- [Deploy.AI Documentation](https://your-deploy-ai-instance/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)

## 🤝 Support

For issues with:
- **GitHub Actions**: Check workflow logs and GitHub documentation
- **Deploy.AI Integration**: Review Deploy.AI dashboard and logs
- **AWS Infrastructure**: Check AWS CloudTrail and Deploy.AI Terraform logs
- **Security Scans**: Review scan reports and update dependencies

---

**Note**: This setup provides a complete CI/CD pipeline that integrates your GitHub repository with Deploy.AI for automated AWS deployments and infrastructure management. 