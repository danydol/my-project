# Deploy.AI - AI-Powered CI/CD Platform

Deploy.AI is a comprehensive AI-powered CI/CD platform that helps developers deploy applications from MVP to production with automated analysis, infrastructure generation, and intelligent deployment strategies.

## 🚀 Features

### **AI-Powered Repository Analysis**
- Automatic tech stack detection
- Dependency analysis and optimization recommendations
- Security vulnerability scanning
- Performance optimization suggestions

### **Infrastructure as Code Generation**
- Terraform configurations for AWS, GCP, Azure
- Kubernetes manifests and Helm charts
- Docker containerization optimization
- CI/CD pipeline automation with GitHub Actions

### **AI Chat Assistant**
- Interactive deployment guidance
- Real-time troubleshooting support
- Infrastructure code generation
- Terminal command suggestions
- Deployment plan visualization

### **Cloud Deployment**
- One-click deployment to major cloud providers
- Auto-scaling configuration
- Load balancer setup
- SSL certificate management
- GitOps integration with ArgoCD

### **Monitoring & Analytics**
- Deployment success tracking
- Performance monitoring
- Cost optimization insights
- Usage analytics dashboard

## 🏗️ Architecture

Deploy.AI consists of:

- **Frontend**: React.js application with Tailwind CSS
- **Backend**: Node.js/Express API with TypeScript
- **Database**: PostgreSQL for application data, MongoDB for chat storage
- **Cache**: Redis for session management and caching
- **AI Integration**: OpenAI/Anthropic for intelligent analysis
- **Container Orchestration**: Docker with optimized multi-stage builds

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git
- GitHub account (for OAuth authentication)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/[your-username]/deployai.git
cd deployai
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:
```bash
# GitHub OAuth (Required)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: LLM API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 4. Access the Application
- **Frontend**: http://localhost:3004
- **Backend API**: http://localhost:3005
- **API Documentation**: http://localhost:3005/api-docs

## 🔧 Development Setup

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## 🐳 Docker Optimization

This project uses **multi-stage Docker builds** for optimal performance:

### Image Sizes (Optimized)
- **Frontend**: 51.6MB (nginx-based)
- **Backend**: 471MB (production-only dependencies)
- **Total Reduction**: 76.9% smaller than single-stage builds

### Build Performance
- **Layer caching** for faster subsequent builds
- **Build context optimization** with .dockerignore
- **Security improvements** with non-root users

## 📊 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3004 | React application (nginx) |
| Backend | 3005 | Node.js API server |
| PostgreSQL | 5434 | Main application database |
| MongoDB | 27018 | Chat storage |
| Redis | 6381 | Caching and sessions |

## 🔐 Authentication

Deploy.AI uses GitHub OAuth for authentication:

1. Create a GitHub OAuth App at: https://github.com/settings/developers
2. Set Authorization callback URL: `http://localhost:3005/api/auth/github/callback`
3. Add your Client ID and Secret to environment variables

## 📖 API Documentation

Complete API documentation is available at:
- **Swagger UI**: http://localhost:3005/api-docs
- **OpenAPI Spec**: Includes all endpoints with examples

### Key Endpoints
- `POST /api/auth/github` - GitHub OAuth login
- `GET /api/repositories` - List user repositories
- `POST /api/chat/sessions` - Create chat session
- `POST /api/deployments` - Create deployment

## 🤖 AI Chat System

The AI assistant can help with:

### Deployment Planning
```
"How do I deploy my React app to AWS?"
```

### Infrastructure Generation
```
"Generate Kubernetes deployment for my Node.js app"
```

### Terminal Commands
```
"Show me the commands to build and deploy"
```

### Troubleshooting
```
"My deployment failed, help me debug"
```

## 🔄 CI/CD Integration

Deploy.AI generates:
- **GitHub Actions workflows**
- **Terraform infrastructure**
- **Kubernetes manifests**
- **Docker configurations**
- **ArgoCD applications**

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Axios for API communication
- React Router for navigation
- Lucide React for icons

### Backend
- Node.js with Express
- TypeScript for type safety
- Prisma ORM for PostgreSQL
- Mongoose for MongoDB
- Passport.js for authentication
- Swagger for API documentation

### Infrastructure
- Docker with multi-stage builds
- Nginx for production serving
- PostgreSQL for relational data
- MongoDB for document storage
- Redis for caching

## 📁 Project Structure

```
deployai/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── contexts/        # React contexts
│   │   └── pages/           # Page components
│   ├── Dockerfile           # Multi-stage frontend build
│   └── nginx.conf           # Production nginx config
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── config/          # Configuration
│   │   └── utils/           # Utilities
│   ├── Dockerfile           # Multi-stage backend build
│   ├── prisma/              # Database schema
│   └── healthcheck.js       # Health check script
├── docker-compose.yml       # Docker services
├── DOCKER_OPTIMIZATION.md   # Build optimization guide
└── GITHUB_OAUTH_SETUP.md    # OAuth setup guide
```

## 🐛 Troubleshooting

### Common Issues

**GitHub OAuth Not Working**
- Ensure GitHub OAuth app is properly configured
- Check callback URL matches exactly
- Verify environment variables are set

**Build Failures**
- Clear Docker build cache: `docker builder prune`
- Rebuild without cache: `docker-compose build --no-cache`

**Container Issues**
- Check logs: `docker-compose logs [service-name]`
- Restart services: `docker-compose restart`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT integration
- Anthropic for Claude integration
- The open-source community for amazing tools and libraries

## 📞 Support

- 📧 Email: support@deploy-ai.com
- 💬 Chat: Use the built-in AI assistant
- 📖 Docs: http://localhost:3005/api-docs
- 🐛 Issues: [GitHub Issues](https://github.com/[your-username]/deployai/issues)

---

**Deploy.AI** - Transforming deployment complexity into AI-powered simplicity. 🚀 