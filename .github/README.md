# GitHub Actions CI/CD Pipeline

This repository contains a comprehensive CI/CD pipeline using GitHub Actions for automated testing, building, deployment, and infrastructure management.

## 🚀 Workflows Overview

### 1. **Deploy Application** (`deploy.yml`)
Automated application deployment with comprehensive validation and security checks.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

**Features:**
- ✅ Environment validation
- 🔒 Security scanning (Trivy, npm audit)
- 🧪 Comprehensive testing (unit, integration, e2e)
- 🐳 Multi-platform Docker builds
- 🌍 Multi-environment deployment (staging/production)
- 📊 Deployment status tracking
- 🔄 Auto-rollback capabilities

**Manual Inputs:**
- Environment (staging/production)
- Cloud connection ID
- AWS Region (il-central-1, us-east-1, us-west-2, eu-west-1, ap-southeast-1)

### 2. **Infrastructure Provisioning** (`infrastructure.yml`)
Terraform-based infrastructure management with security and compliance checks.

**Triggers:**
- Changes to `terraform/` or `infrastructure/` directories
- Pull requests affecting infrastructure
- Manual workflow dispatch

**Features:**
- 🏗️ Terraform validation and formatting
- 🔒 Security scanning (Checkov, TFLint)
- 📋 Plan generation for PRs
- 🚀 Multi-environment infrastructure
- 📊 Infrastructure outputs tracking
- 🗑️ Safe destruction workflows

**Manual Inputs:**
- Environment (staging/production)
- Action (plan/apply/destroy)
- AWS Region

### 3. **Test and Quality Assurance** (`test.yml`)
Comprehensive testing and quality checks with automated reporting.

**Triggers:**
- Push to any branch
- Pull requests
- Weekly security scans (Mondays 2 AM UTC)
- Manual workflow dispatch

**Features:**
- 🧹 Linting and formatting checks
- 🔒 Security vulnerability scanning
- 🧪 Unit, integration, and e2e tests
- 📊 Code coverage reporting
- 🚀 Performance testing (Lighthouse, Artillery)
- 📈 Code quality analysis (SonarQube)
- 📦 Dependency health checks
- 🏗️ Build verification

**Manual Inputs:**
- Test type (all/unit/integration/e2e/security)
- Test environment (staging/production)

### 4. **Dependency Management** (`dependencies.yml`)
Automated dependency management and security updates.

**Triggers:**
- Daily dependency checks (2 AM UTC)
- Manual workflow dispatch

**Features:**
- 🔍 Security vulnerability scanning
- 📦 Outdated dependency detection
- 🗑️ Unused dependency cleanup
- 🤖 Automated dependency updates
- 🔒 Security patch automation
- 📊 Dependency health reporting
- 🚨 Critical vulnerability alerts

**Manual Inputs:**
- Action (check/update/security-fix/audit)
- Scope (all/production/development/security)

## 🔧 Configuration

### Required Secrets

#### AWS Configuration
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

#### Docker Registry
```bash
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
```

#### Security Tools
```bash
SNYK_TOKEN=your_snyk_token
SONAR_TOKEN=your_sonarqube_token
```

#### GitHub Integration
```bash
GITHUB_TOKEN=your_github_token  # Usually auto-provided
```

### Environment Variables

#### Global
- `NODE_VERSION`: Node.js version (default: 18)
- `TF_VERSION`: Terraform version (default: 1.5.0)

#### Deployment
- `AWS_REGION`: Target AWS region
- `DEPLOYMENT_ENVIRONMENT`: Target environment

## 📋 Usage

### Manual Workflow Execution

#### Deploy Application
1. Go to **Actions** → **Deploy Application**
2. Click **Run workflow**
3. Select:
   - **Environment**: staging/production
   - **Cloud Connection ID**: Your AWS connection
   - **Region**: Target AWS region
4. Click **Run workflow**

#### Infrastructure Management
1. Go to **Actions** → **Infrastructure Provisioning**
2. Click **Run workflow**
3. Select:
   - **Environment**: staging/production
   - **Action**: plan/apply/destroy
   - **Region**: Target AWS region
4. Click **Run workflow**

#### Run Tests
1. Go to **Actions** → **Test and Quality Assurance**
2. Click **Run workflow**
3. Select:
   - **Test Type**: all/unit/integration/e2e/security
   - **Environment**: staging/production
4. Click **Run workflow**

#### Manage Dependencies
1. Go to **Actions** → **Dependency Management**
2. Click **Run workflow**
3. Select:
   - **Action**: check/update/security-fix/audit
   - **Scope**: all/production/development/security
4. Click **Run workflow**

### Automated Triggers

#### Branch Protection
- **main**: Triggers production deployments
- **develop**: Triggers staging deployments
- **feature/***: Triggers testing and validation

#### Path-based Triggers
- Infrastructure changes trigger infrastructure workflows
- Code changes trigger deployment workflows
- All changes trigger testing workflows

## 🔍 Monitoring and Reporting

### Workflow Status
- Real-time status in GitHub Actions tab
- Detailed logs for each step
- Artifact downloads for test results
- Security scan reports

### Quality Gates
- All tests must pass
- Security scans must be clean
- Code quality thresholds met
- Build verification successful

### Notifications
- PR comments with test results
- Issue creation for critical vulnerabilities
- Deployment status updates
- Infrastructure change summaries

## 🛡️ Security Features

### Vulnerability Scanning
- **Trivy**: Container and filesystem scanning
- **Snyk**: Dependency vulnerability scanning
- **npm audit**: Package security auditing
- **Checkov**: Infrastructure security scanning

### Compliance
- **TFLint**: Terraform best practices
- **ESLint**: Code quality standards
- **Prettier**: Code formatting consistency
- **SonarQube**: Code quality analysis

### Access Control
- Environment-specific secrets
- Branch protection rules
- Required status checks
- Manual approval for production

## 🚀 Deployment Pipeline

### Staging Deployment
1. **Validation**: Environment and configuration checks
2. **Security Scan**: Vulnerability assessment
3. **Testing**: Unit, integration, and e2e tests
4. **Build**: Multi-platform Docker images
5. **Deploy**: Infrastructure and application deployment
6. **Verify**: Health checks and smoke tests

### Production Deployment
1. **Staging Validation**: Ensures staging is stable
2. **Production Checks**: Additional security and compliance
3. **Deploy**: Production infrastructure and application
4. **Health Checks**: Comprehensive monitoring
5. **Rollback**: Automatic rollback on failure

## 📊 Metrics and Analytics

### Test Coverage
- Unit test coverage reports
- Integration test results
- E2E test success rates
- Performance test metrics

### Security Metrics
- Vulnerability counts by severity
- Dependency health scores
- Security scan pass rates
- Compliance status

### Deployment Metrics
- Deployment frequency
- Lead time for changes
- Mean time to recovery
- Change failure rate

## 🔧 Troubleshooting

### Common Issues

#### Workflow Failures
1. Check the specific job that failed
2. Review logs for error details
3. Verify required secrets are configured
4. Ensure environment variables are set

#### Security Scan Failures
1. Review vulnerability reports
2. Update vulnerable dependencies
3. Fix security configuration issues
4. Re-run security scans

#### Deployment Failures
1. Check AWS credentials and permissions
2. Verify infrastructure configuration
3. Review application logs
4. Check resource availability

### Debug Mode
Enable debug logging by setting the secret:
```bash
ACTIONS_STEP_DEBUG=true
```

## 📚 Additional Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Documentation](https://docs.aws.amazon.com/)

### Tools
- [Trivy Security Scanner](https://trivy.dev/)
- [Snyk Security Platform](https://snyk.io/)
- [SonarQube Code Quality](https://www.sonarqube.org/)
- [Checkov Security Scanner](https://www.checkov.io/)

### Support
- Create issues for workflow problems
- Review security advisories
- Monitor dependency updates
- Stay updated with best practices

---

**Last Updated**: December 2024  
**Version**: 2.0.0  
**Maintainer**: Deploy.AI Team 