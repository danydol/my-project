# Deploy.AI Setup Guide

This guide will help you set up the Deploy.AI platform for development and production use.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- Docker (for containerization)
- AWS CLI (configured with your credentials)
- GitHub account with OAuth app configured

## Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd deploy-ai-platform
npm run install:all
```

### 2. Environment Configuration

#### Backend Environment (.env)
Copy `backend/env.example` to `backend/.env` and configure:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://deployai:password@localhost:5432/deployai

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# LLM Integration (Choose one)
OPENAI_API_KEY=your_openai_api_key
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key
LLM_PROVIDER=openai

# GitOps Repository
GITOPS_REPO_OWNER=your_github_username
GITOPS_REPO_NAME=deploy-ai-gitops
GITOPS_BRANCH=main
```

#### Frontend Environment (.env)
Copy `frontend/env.example` to `frontend/.env` and configure:

```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id
```

### 3. GitHub OAuth App Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Application name: Deploy.AI (Development)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3001/auth/github/callback
3. Copy the Client ID and Client Secret to your environment files

### 4. Database Setup

Install and configure PostgreSQL:

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb deployai

# Create user
psql -c "CREATE USER deployai WITH PASSWORD 'password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE deployai TO deployai;"
```

### 5. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 3000
```

## Production Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Environment Variables

Set production environment variables:
- Use strong JWT secrets
- Configure production database
- Set up production GitHub OAuth app
- Configure AWS credentials
- Set LLM API keys

### 3. Docker Deployment

```bash
# Build Docker images
docker build -t deploy-ai-backend ./backend
docker build -t deploy-ai-frontend ./frontend

# Run with Docker Compose
docker-compose up -d
```

### 4. AWS Infrastructure

The platform will generate Terraform configurations for:
- EKS cluster
- VPC and networking
- RDS database
- Application Load Balancer
- IAM roles and policies

## GitOps Repository Setup

Create a separate repository for Infrastructure as Code:

```bash
mkdir deploy-ai-gitops
cd deploy-ai-gitops
git init

# Directory structure
mkdir -p {terraform,helm-charts,argocd-apps}
```

## Features Overview

### Core Functionality

1. **Repository Analysis**
   - AI-powered tech stack detection
   - Microservices identification
   - Docker configuration analysis
   - CI/CD workflow detection

2. **Infrastructure Generation**
   - Terraform configurations for AWS
   - Helm charts for Kubernetes
   - ArgoCD applications for GitOps

3. **Deployment Management**
   - Automated AWS EKS deployments
   - Rolling updates and rollbacks
   - Monitoring and alerting

### AI Integration

The platform uses LLM APIs to analyze repositories and generate infrastructure:

- **Repository Analysis**: Detects tech stacks, dependencies, and architecture
- **Infrastructure Recommendations**: Suggests optimal AWS resources
- **Configuration Generation**: Creates Terraform and Helm configurations
- **Best Practices**: Applies security and scalability recommendations

### Security Features

- GitHub OAuth authentication
- JWT token-based authorization
- AWS IAM integration
- Secure secret management
- Rate limiting and input validation

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database Connection Issues**
   - Check PostgreSQL is running
   - Verify connection string
   - Ensure user permissions

3. **GitHub OAuth Issues**
   - Verify callback URL matches exactly
   - Check client ID and secret
   - Ensure app is not suspended

4. **LLM API Issues**
   - Verify API keys are correct
   - Check rate limits and quotas
   - Ensure proper provider configuration

### Development Tips

- Use `npm run dev` for hot reloading
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Use React DevTools for debugging
- Test with different repository types

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review GitHub issues
- Contact the development team

---

**Deploy.AI** - AI-Powered CI/CD Platform for Modern Applications 