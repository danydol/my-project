# RAG System for Repository Analysis

## Overview

This implementation provides a comprehensive Retrieval-Augmented Generation (RAG) system for analyzing GitHub repositories and providing DevOps deployment recommendations. The system uses semantic search to understand code patterns and generates personalized deployment suggestions based on the `devops_checklist.md` guidelines.

## Architecture

### Core Components

1. **Vector Store Service** (`vectorStoreService.ts`)
   - Manages code embeddings using OpenAI's text-embedding-3-small model
   - Stores embeddings in MongoDB with metadata
   - Implements cosine similarity search

2. **GitHub Fetcher Service** (`githubFetcherService.ts`)
   - Fetches repository files using GitHub API
   - Filters and processes code files
   - Analyzes repository structure and technology stack

3. **Code Chunker Service** (`codeChunkerService.ts`)
   - Intelligent, language-specific code chunking
   - Preserves function/class boundaries
   - Enhances chunks with context information

4. **DevOps Analyzer Service** (`devopsAnalyzerService.ts`)
   - Analyzes 17 DevOps aspects across 6 categories
   - Generates confidence scores and recommendations
   - Based on `devops_checklist.md` guidelines

5. **Repository Analyzer Service** (`repositoryAnalyzerService.ts`)
   - Main orchestration service
   - Real-time status tracking
   - Background processing pipeline

### Infrastructure

- **Backend**: Node.js/Express with TypeScript
- **Vector Storage**: MongoDB for embeddings and metadata
- **Embeddings**: OpenAI text-embedding-3-small
- **Cache**: Redis for session management
- **Container Management**: Docker Compose
- **Frontend**: React with Material-UI

## Features

### 🔍 Repository Analysis
- **Smart Code Chunking**: Language-aware chunking that preserves logical boundaries
- **Technology Detection**: Automatic identification of frameworks, languages, and tools
- **Structure Analysis**: Detection of Docker, Kubernetes, CI/CD configurations
- **Comprehensive Scoring**: 17-point DevOps readiness assessment

### 📊 DevOps Assessment Categories

1. **Application Architecture** (3 aspects)
   - Application type and scaling requirements
   - Database and storage needs
   - Performance considerations

2. **Security & Compliance** (3 aspects)
   - Security posture assessment
   - Secrets management evaluation
   - SSL/TLS configuration analysis

3. **Infrastructure & Networking** (3 aspects)
   - Cluster architecture recommendations
   - Networking requirements analysis
   - Storage strategy evaluation

4. **Monitoring & Operations** (3 aspects)
   - Observability level assessment
   - Logging strategy recommendations
   - Backup and disaster recovery planning

5. **Development & Deployment** (3 aspects)
   - CI/CD integration analysis
   - GitOps configuration suggestions
   - Environment strategy planning

6. **Cost & Resource Management** (2 aspects)
   - Cost optimization recommendations
   - Resource management strategies

### 🔎 Semantic Code Search
- **Vector-based Search**: Find code patterns using natural language queries
- **Contextual Results**: Results include file paths, language tags, and confidence scores
- **Code Preview**: Syntax-highlighted code snippets with metadata

## API Endpoints

### Repository Analysis
```http
POST /api/repositories/analyze
Content-Type: application/json

{
  "repoUrl": "https://github.com/owner/repository"
}
```

### Analysis Status
```http
GET /api/repositories/analysis/{analysisId}
```

### Repository Search
```http
POST /api/repositories/{repoId}/search
Content-Type: application/json

{
  "query": "authentication middleware",
  "limit": 10
}
```

### Repository Summary
```http
GET /api/repositories/{repoId}/summary
```

## Usage Instructions

### 1. Environment Setup

```bash
# Copy environment variables
cp backend/env.example backend/.env

# Add required environment variables:
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
MONGODB_URL=mongodb://localhost:27019/deployai
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:3004
# - Backend: http://localhost:3005
# - MongoDB: localhost:27019
# - Redis: localhost:6382
# - ChromaDB: localhost:8001
```

### 3. Analyze a Repository

1. Navigate to http://localhost:3004/repositories
2. Enter a GitHub repository URL
3. Click "Analyze" to start the process
4. Monitor real-time progress updates
5. Review the comprehensive DevOps analysis results

### 4. Search Repository Code

After analysis is complete:
1. Use the search functionality to find specific code patterns
2. Enter natural language queries like:
   - "authentication middleware"
   - "database connection setup"
   - "error handling patterns"
   - "API route definitions"

## Analysis Pipeline

The repository analysis follows this pipeline:

1. **Repository Fetching** (20% progress)
   - Clone/fetch repository files
   - Filter relevant code files
   - Detect technology stack

2. **Code Chunking** (40% progress)
   - Split files into logical chunks
   - Preserve function/class boundaries
   - Add context metadata

3. **Embedding Generation** (70% progress)
   - Generate embeddings for each chunk
   - Store in MongoDB with metadata
   - Process in batches with rate limiting

4. **DevOps Analysis** (90% progress)
   - Analyze against 17 DevOps criteria
   - Generate recommendations
   - Calculate confidence scores

5. **Completion** (100% progress)
   - Finalize analysis results
   - Enable search functionality

## Example Results

### DevOps Analysis Output
```json
{
  "overallScore": 78,
  "deploymentReadiness": 85,
  "estimatedComplexity": "medium",
  "checklist": [
    {
      "id": "app_type",
      "category": "Application Architecture",
      "title": "Application Type Detection",
      "detected": "Full-Stack Web Application",
      "confidence": 0.92,
      "reasoning": "Detected React frontend with Express.js backend...",
      "recommendations": [
        "Consider implementing service mesh for microservices communication",
        "Add health check endpoints for Kubernetes probes"
      ]
    }
  ],
  "recommendations": [
    "✅ Strong TypeScript implementation detected",
    "⚠️ Consider adding comprehensive monitoring setup",
    "🔧 Implement automated backup strategies"
  ]
}
```

### Search Results
```json
{
  "results": [
    {
      "content": "app.use('/api/auth', authMiddleware);...",
      "metadata": {
        "filePath": "src/middleware/auth.ts",
        "language": "typescript",
        "chunkIndex": 2,
        "fileType": "middleware"
      },
      "score": 0.89
    }
  ]
}
```

## Configuration

### Chunking Strategy
The system uses language-specific chunking strategies:

- **TypeScript/JavaScript**: 1200 chars, 100 char overlap
- **Python**: 1500 chars, 150 char overlap  
- **Java/C#**: 1000 chars, 80 char overlap
- **Default**: 1000 chars, 100 char overlap

### Rate Limiting
- **GitHub API**: Respects rate limits with automatic retry
- **OpenAI API**: Batch processing (10 items per batch)
- **Vector Storage**: Optimized batch inserts

### Performance Optimizations
- **Parallel Processing**: Concurrent chunking and embedding generation
- **Smart Filtering**: Excludes large files, binary files, and common ignore patterns
- **Caching**: Redis-based caching for frequently accessed data
- **Streaming**: Real-time progress updates via polling

## Monitoring and Observability

### Health Checks
All services include health check endpoints:
- Backend: `GET /health`
- Database connections are monitored
- Container health status via Docker

### Logging
- Structured logging with request IDs
- Error tracking and debugging information
- Performance metrics for analysis pipeline

### Metrics
- Analysis completion times
- Embedding generation rates
- Search query performance
- DevOps scoring accuracy

## Troubleshooting

### Common Issues

1. **GitHub Rate Limiting**
   - Ensure GITHUB_TOKEN is set
   - Use a token with appropriate permissions

2. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API usage limits

3. **MongoDB Connection Issues**
   - Ensure MongoDB container is running
   - Check connection string in environment variables

4. **Memory Issues**
   - Large repositories may require increased container memory
   - Consider chunking strategy adjustments

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Contributing

The RAG system is designed for extensibility:

1. **Adding New Analysis Criteria**: Extend `devopsAnalyzerService.ts`
2. **Custom Chunking Strategies**: Modify `codeChunkerService.ts`
3. **Additional Vector Stores**: Implement new providers in `vectorStoreService.ts`
4. **Enhanced Search**: Extend search algorithms and ranking

## Security Considerations

- GitHub tokens are stored securely in environment variables
- OpenAI API keys are protected and not logged
- Repository data is temporarily processed and can be deleted
- No sensitive code is permanently stored outside the analysis results

## Performance Benchmarks

Typical analysis times:
- **Small Repository** (<100 files): 2-5 minutes
- **Medium Repository** (100-500 files): 5-15 minutes  
- **Large Repository** (500+ files): 15-30 minutes

Search performance:
- **Vector Search**: <500ms for most queries
- **Results Ranking**: Real-time cosine similarity
- **Concurrent Searches**: Supports multiple simultaneous users

## License

This RAG system implementation is part of the DeployAI project. Please refer to the main project license for usage terms. 