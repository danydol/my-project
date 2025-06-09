# Detailed File Patterns and Dependency Mappings

## 1. Application Type Detection - Detailed Patterns

### Frontend Framework Detection
```javascript
FRONTEND_PATTERNS = {
  react: {
    files: ["src/App.js", "src/App.tsx", "public/index.html"],
    dependencies: ["react", "react-dom", "@types/react"],
    configs: ["tsconfig.json", "webpack.config.js", "vite.config.js"],
    folder_structure: ["src/components/", "src/hooks/", "public/"]
  },
  vue: {
    files: ["src/App.vue", "src/main.js"],
    dependencies: ["vue", "@vue/cli", "vuetify"],
    configs: ["vue.config.js", "nuxt.config.js"],
    folder_structure: ["src/views/", "src/router/"]
  },
  angular: {
    files: ["src/app/app.component.ts", "angular.json"],
    dependencies: ["@angular/core", "@angular/cli"],
    configs: ["angular.json", "tsconfig.app.json"],
    folder_structure: ["src/app/", "src/environments/"]
  },
  nextjs: {
    files: ["pages/index.js", "app/page.js", "next.config.js"],
    dependencies: ["next", "react"],
    folder_structure: ["pages/", "app/", "components/", "public/"]
  }
}
```

### Backend Framework Detection
```javascript
BACKEND_PATTERNS = {
  express: {
    files: ["server.js", "app.js", "index.js"],
    dependencies: ["express", "cors", "helmet", "morgan"],
    patterns: ["app.listen(", "express()", "app.use(", "app.get("],
    folder_structure: ["routes/", "controllers/", "middleware/", "models/"]
  },
  fastapi: {
    files: ["main.py", "app.py"],
    dependencies: ["fastapi", "uvicorn", "pydantic"],
    patterns: ["FastAPI(", "@app.get", "@app.post", "uvicorn.run"],
    folder_structure: ["routers/", "models/", "schemas/", "dependencies/"]
  },
  django: {
    files: ["manage.py", "settings.py", "urls.py"],
    dependencies: ["django", "djangorestframework"],
    patterns: ["django.conf", "django.urls", "django.http"],
    folder_structure: ["apps/", "templates/", "static/", "migrations/"]
  },
  spring_boot: {
    files: ["pom.xml", "build.gradle", "Application.java"],
    dependencies: ["spring-boot-starter", "spring-boot-starter-web"],
    patterns: ["@SpringBootApplication", "@RestController", "@Service"],
    folder_structure: ["src/main/java/", "src/main/resources/", "src/test/"]
  }
}
```

### Microservices Detection Algorithm
```javascript
MICROSERVICES_INDICATORS = {
  multiple_services: {
    docker_compose: "services: with >2 services",
    multiple_dockerfiles: ">1 Dockerfile in different directories",
    separate_package_files: "package.json in multiple subdirectories",
    api_gateway: ["kong", "nginx-proxy", "traefik", "envoy"]
  },
  service_mesh: {
    dependencies: ["istio", "linkerd", "consul-connect"],
    files: ["istio.yaml", "linkerd.yaml", "consul.hcl"]
  },
  communication_patterns: {
    async_messaging: ["rabbitmq", "kafka", "redis-pub-sub", "aws-sqs"],
    service_discovery: ["consul", "eureka", "etcd", "kubernetes-dns"],
    circuit_breakers: ["hystrix", "resilience4j", "circuit-breaker"]
  }
}
```

---

## 3. Database Requirements - Detailed Mappings

### SQL Database Detection
```javascript
SQL_PATTERNS = {
  postgresql: {
    dependencies: {
      nodejs: ["pg", "node-postgres", "sequelize", "prisma", "typeorm"],
      python: ["psycopg2", "asyncpg", "sqlalchemy", "django.db.backends.postgresql"],
      java: ["postgresql", "spring-boot-starter-data-jpa"],
      go: ["lib/pq", "gorm.io/driver/postgres"],
      dotnet: ["Npgsql", "Microsoft.EntityFrameworkCore.PostgreSQL"]
    },
    environment_vars: ["DATABASE_URL", "POSTGRES_HOST", "POSTGRES_DB", "PG_HOST"],
    config_files: ["database.yml", "knexfile.js", "prisma/schema.prisma"],
    connection_strings: ["postgresql://", "postgres://"]
  },
  mysql: {
    dependencies: {
      nodejs: ["mysql2", "mysql", "sequelize", "typeorm"],
      python: ["PyMySQL", "mysql-connector-python", "sqlalchemy"],
      java: ["mysql-connector-java", "spring-boot-starter-data-jpa"],
      php: ["mysqli", "pdo_mysql", "laravel/framework"]
    },
    environment_vars: ["MYSQL_HOST", "MYSQL_DATABASE", "DB_HOST"],
    connection_strings: ["mysql://", "mysql2://"]
  }
}
```

### NoSQL Database Detection
```javascript
NOSQL_PATTERNS = {
  mongodb: {
    dependencies: {
      nodejs: ["mongodb", "mongoose", "@mongodb-js/db"],
      python: ["pymongo", "motor", "mongoengine"],
      java: ["spring-boot-starter-data-mongodb", "mongodb-driver"],
      go: ["go.mongodb.org/mongo-driver"]
    },
    environment_vars: ["MONGO_URI", "MONGODB_URL", "MONGO_HOST"],
    config_files: ["mongod.conf", "mongoose.js"],
    connection_strings: ["mongodb://", "mongodb+srv://"]
  },
  dynamodb: {
    dependencies: {
      nodejs: ["aws-sdk", "@aws-sdk/client-dynamodb", "dynamodb-toolbox"],
      python: ["boto3", "pynamodb"],
      java: ["aws-java-sdk-dynamodb", "software.amazon.awssdk:dynamodb"]
    },
    environment_vars: ["AWS_REGION", "DYNAMODB_TABLE", "AWS_ACCESS_KEY_ID"],
    code_patterns: ["DynamoDB", "dynamo", "scan(", "query(", "putItem"]
  }
}
```

### Cache Layer Detection
```javascript
CACHE_PATTERNS = {
  redis: {
    dependencies: {
      nodejs: ["redis", "ioredis", "node_redis", "connect-redis"],
      python: ["redis", "redis-py", "aioredis"],
      java: ["jedis", "lettuce-core", "spring-boot-starter-data-redis"],
      go: ["go-redis/redis", "gomodule/redigo"]
    },
    environment_vars: ["REDIS_URL", "REDIS_HOST", "REDIS_PORT"],
    docker_services: ["redis:latest", "redis:alpine", "redis:6"],
    code_patterns: ["redis.get(", "redis.set(", "redis.del(", "redis.expire("]
  },
  memcached: {
    dependencies: ["memcached", "node-memcached", "pymemcache"],
    environment_vars: ["MEMCACHED_HOST", "MEMCACHE_SERVERS"]
  }
}
```

---

## 8. Networking Requirements - Detailed Detection

### Public Internet Access Indicators
```javascript
PUBLIC_ACCESS_PATTERNS = {
  static_assets: {
    folders: ["public/", "static/", "assets/", "dist/", "build/"],
    files: ["favicon.ico", "robots.txt", "sitemap.xml", "manifest.json"],
    patterns: ["public static void", "app.use(express.static"]
  },
  frontend_frameworks: {
    spa_indicators: ["single-page-application", "client-side-routing"],
    build_outputs: ["dist/", "build/", ".next/", ".nuxt/"]
  },
  public_api_endpoints: {
    rest_api: ["@app.get", "app.get('/api", "router.get", "@GetMapping"],
    graphql: ["graphql", "apollo-server", "@Query", "@Mutation"],
    api_docs: ["swagger", "openapi", "postman_collection"]
  }
}
```

### Private Network Indicators
```javascript
PRIVATE_ACCESS_PATTERNS = {
  admin_interfaces: {
    routes: ["/admin", "/dashboard", "/management", "/internal"],
    auth_required: ["@login_required", "requireAuth", "isAuthenticated"],
    admin_frameworks: ["django-admin", "rails-admin", "express-admin"]
  },
  internal_apis: {
    patterns: ["internal-api", "private-endpoint", "admin-only"],
    ip_restrictions: ["allowedIPs", "ipWhitelist", "private-subnet"],
    vpn_indicators: ["vpn", "private-network", "internal-access"]
  },
  database_connections: {
    direct_db_access: ["database.connect", "db.connection", "sql.connect"],
    connection_pooling: ["connection-pool", "db-pool", "pg-pool"]
  }
}
```

### CDN Requirements Detection
```javascript
CDN_INDICATORS = {
  static_content: {
    large_assets: ["images/", "videos/", "downloads/", "media/"],
    file_types: [".jpg", ".png", ".mp4", ".pdf", ".zip", ".js", ".css"],
    size_indicators: ["large-files", "static-assets", "media-delivery"]
  },
  global_audience: {
    i18n: ["internationalization", "i18n", "locale", "translations/"],
    multi_region: ["multi-region", "global-users", "worldwide"],
    performance: ["performance-optimization", "cdn", "edge-cache"]
  },
  existing_cdn: {
    dependencies: ["cloudfront", "cloudflare", "fastly"],
    environment_vars: ["CDN_URL", "CLOUDFRONT_DOMAIN", "ASSET_HOST"]
  }
}
```

---

## 9. Storage Requirements - Detailed Patterns

### Object Storage Detection
```javascript
OBJECT_STORAGE_PATTERNS = {
  file_uploads: {
    dependencies: {
      nodejs: ["multer", "express-fileupload", "formidable", "busboy"],
      python: ["werkzeug", "django-storages", "flask-uploads"],
      java: ["commons-fileupload", "spring-web", "multipart"]
    },
    routes: ["POST /upload", "PUT /files", "/api/upload", "/media/upload"],
    html_patterns: ["<input type=\"file\"", "enctype=\"multipart/form-data\""]
  },
  cloud_storage: {
    aws_s3: {
      dependencies: ["aws-sdk", "@aws-sdk/client-s3", "boto3"],
      environment_vars: ["S3_BUCKET", "AWS_S3_REGION", "S3_ACCESS_KEY"],
      code_patterns: ["s3.upload", "s3.putObject", "S3Client"]
    },
    google_cloud: {
      dependencies: ["@google-cloud/storage", "google-cloud-storage"],
      environment_vars: ["GOOGLE_CLOUD_BUCKET", "GCS_BUCKET"]
    },
    azure_blob: {
      dependencies: ["@azure/storage-blob", "azure-storage-blob"],
      environment_vars: ["AZURE_STORAGE_ACCOUNT", "AZURE_CONTAINER"]
    }
  }
}
```

### File System Storage Detection
```javascript
FILE_STORAGE_PATTERNS = {
  file_operations: {
    read_write: ["fs.readFile", "fs.writeFile", "open(", "File.read"],
    directories: ["os.makedirs", "fs.mkdir", "Files.createDirectory"],
    file_processing: ["file-processing", "document-handling", "file-manipulation"]
  },
  persistent_volumes: {
    config_files: ["persistent-volume", "storage-class", "volume-mount"],
    docker_volumes: ["volumes:", "bind-mount", "named-volume"],
    data_directories: ["data/", "uploads/", "storage/", "files/"]
  },
  shared_storage: {
    nfs: ["nfs", "network-file-system", "shared-storage"],
    efs: ["efs", "elastic-file-system", "aws-efs"]
  }
}
```

---

## 10. Observability Level - Detailed Detection

### Metrics Collection Detection
```javascript
METRICS_PATTERNS = {
  prometheus: {
    dependencies: ["prom-client", "prometheus-client", "micrometer-prometheus"],
    files: ["prometheus.yml", "prometheus.yaml", "metrics.js"],
    code_patterns: ["prometheus.register", "Counter(", "Histogram(", "Gauge("]
  },
  custom_metrics: {
    patterns: ["metrics.increment", "statsd.timing", "datadog.increment"],
    dependencies: ["statsd", "datadog-metrics", "new-relic"]
  },
  health_checks: {
    endpoints: ["/health", "/ping", "/status", "/ready", "/live"],
    patterns: ["health-check", "readiness-probe", "liveness-probe"],
    kubernetes: ["readinessProbe:", "livenessProbe:", "healthcheck:"]
  }
}
```

### Logging Sophistication Detection
```javascript
LOGGING_PATTERNS = {
  basic_logging: {
    patterns: ["console.log", "print(", "System.out.println", "echo "],
    simple_loggers: ["logging.info", "logger.info", "log.Info"]
  },
  structured_logging: {
    json_logs: ["JSON.stringify", "json.dumps", "jackson", "logrus"],
    structured_loggers: ["winston", "pino", "loguru", "zap", "slog"],
    log_fields: ["requestId", "userId", "traceId", "spanId"]
  },
  log_aggregation: {
    centralized: ["fluentd", "fluent-bit", "logstash", "vector"],
    cloud_logging: ["cloudwatch-logs", "stackdriver", "azure-logs"],
    elk_stack: ["elasticsearch", "kibana", "logstash"]
  }
}
```

### Error Tracking Detection
```javascript
ERROR_TRACKING_PATTERNS = {
  error_services: {
    sentry: {
      dependencies: ["@sentry/node", "@sentry/react", "sentry-sdk"],
      config_files: ["sentry.properties", ".sentryclirc"],
      environment_vars: ["SENTRY_DSN", "SENTRY_PROJECT"]
    },
    bugsnag: {
      dependencies: ["@bugsnag/js", "bugsnag", "bugsnag-react"],
      environment_vars: ["BUGSNAG_API_KEY"]
    },
    rollbar: {
      dependencies: ["rollbar", "rollbar-react"],
      environment_vars: ["ROLLBAR_ACCESS_TOKEN"]
    }
  },
  custom_error_handling: {
    patterns: ["try-catch", "error-handler", "exception-handler"],
    middleware: ["errorHandler", "handleError", "onError"]
  }
}
```

---

## 13. CI/CD Integration - Detailed Detection

### Existing CI/CD Detection
```javascript
CI_CD_PATTERNS = {
  github_actions: {
    files: [".github/workflows/*.yml", ".github/workflows/*.yaml"],
    patterns: ["on: push", "runs-on:", "uses: actions/", "github.actor"]
  },
  gitlab_ci: {
    files: [".gitlab-ci.yml", ".gitlab-ci.yaml"],
    patterns: ["stages:", "script:", "image:", "gitlab-runner"]
  },
  jenkins: {
    files: ["Jenkinsfile", "jenkins.yml", "pipeline.groovy"],
    patterns: ["pipeline {", "agent any", "stages {", "jenkins.build"]
  },
  circle_ci: {
    files: [".circleci/config.yml", ".circleci/config.yaml"],
    patterns: ["version: 2", "workflows:", "circleci/"]
  },
  azure_devops: {
    files: ["azure-pipelines.yml", "azure-pipelines.yaml"],
    patterns: ["trigger:", "pool:", "azuredevops"]
  },
  aws_codebuild: {
    files: ["buildspec.yml", "buildspec.yaml"],
    patterns: ["version: 0.2", "phases:", "codebuild"]
  }
}
```

### Build System Detection
```javascript
BUILD_PATTERNS = {
  nodejs: {
    files: ["package.json", "yarn.lock", "package-lock.json"],
    scripts: ["npm run build", "yarn build", "npm test", "yarn test"],
    build_tools: ["webpack", "vite", "parcel", "rollup", "esbuild"]
  },
  python: {
    files: ["setup.py", "pyproject.toml", "requirements.txt", "Pipfile"],
    build_tools: ["setuptools", "poetry", "flit", "hatch"],
    testing: ["pytest", "unittest", "nose2", "tox"]
  },
  java: {
    files: ["pom.xml", "build.gradle", "build.gradle.kts"],
    build_tools: ["maven", "gradle", "ant"],
    testing: ["junit", "testng", "mockito"]
  },
  docker: {
    files: ["Dockerfile", "docker-compose.yml", ".dockerignore"],
    patterns: ["FROM ", "RUN ", "COPY ", "EXPOSE "]
  }
}
```

---

## 16. Cost Optimization - Detailed Analysis

### Resource Intensity Detection
```javascript
RESOURCE_INTENSITY_PATTERNS = {
  cpu_intensive: {
    operations: ["image-processing", "video-encoding", "machine-learning", "cryptography"],
    dependencies: ["opencv", "ffmpeg", "tensorflow", "pytorch", "crypto"],
    patterns: ["parallel-processing", "multi-threading", "worker-pool", "compute-heavy"]
  },
  memory_intensive: {
    operations: ["in-memory-cache", "large-datasets", "data-processing", "analytics"],
    dependencies: ["pandas", "numpy", "spark", "hadoop", "elasticsearch"],
    patterns: ["large-arrays", "data-frames", "memory-cache", "bulk-operations"]
  },
  io_intensive: {
    operations: ["file-processing", "database-operations", "api-calls", "data-transfer"],
    patterns: ["bulk-insert", "file-upload", "data-migration", "stream-processing"],
    dependencies: ["stream", "queue", "batch-processing"]
  }
}
```

### Scaling Pattern Detection
```javascript
SCALING_PATTERNS = {
  auto_scaling: {
    kubernetes: ["hpa.yaml", "vpa.yaml", "horizontal-pod-autoscaler"],
    cloud: ["auto-scaling-group", "target-tracking", "scale-policy"],
    patterns: ["scale-up", "scale-down", "load-based-scaling"]
  },
  batch_processing: {
    scheduled_jobs: ["cron", "scheduled-task", "batch-job", "periodic"],
    queue_systems: ["celery", "rq", "bull", "agenda", "delayed-job"],
    patterns: ["job-queue", "background-task", "async-processing"]
  },
  event_driven: {
    serverless: ["lambda", "cloud-functions", "azure-functions"],
    event_systems: ["event-sourcing", "event-driven", "pub-sub"],
    patterns: ["trigger", "webhook", "event-handler"]
  }
}
```

### Budget Sensitivity Detection
```javascript
BUDGET_INDICATORS = {
  cost_conscious: {
    patterns: ["cost-optimization", "budget-constraint", "minimal-resources"],
    spot_instances: ["spot-instance", "preemptible", "low-cost"],
    resource_limits: ["resource-quota", "limit-range", "cost-control"]
  },
  performance_first: {
    patterns: ["high-performance", "low-latency", "dedicated-resources"],
    premium_services: ["dedicated-instance", "reserved-capacity", "premium-tier"]
  }
}
```

---

## Combined Pattern Matching Algorithm

```javascript
function analyzeRepository(repoPath) {
  const analysis = {
    files: scanAllFiles(repoPath),
    dependencies: extractDependencies(repoPath),
    configs: parseConfigFiles(repoPath),
    code: analyzeCodePatterns(repoPath),
    environment: extractEnvVars(repoPath)
  };
  
  return {
    appType: matchPatterns(analysis, FRONTEND_PATTERNS, BACKEND_PATTERNS),
    database: matchPatterns(analysis, SQL_PATTERNS, NOSQL_PATTERNS, CACHE_PATTERNS),
    networking: matchPatterns(analysis, PUBLIC_ACCESS_PATTERNS, PRIVATE_ACCESS_PATTERNS),
    storage: matchPatterns(analysis, OBJECT_STORAGE_PATTERNS, FILE_STORAGE_PATTERNS),
    observability: matchPatterns(analysis, METRICS_PATTERNS, LOGGING_PATTERNS),
    cicd: matchPatterns(analysis, CI_CD_PATTERNS, BUILD_PATTERNS),
    resources: matchPatterns(analysis, RESOURCE_INTENSITY_PATTERNS, SCALING_PATTERNS)
  };
}

function matchPatterns(analysis, ...patternSets) {
  const matches = [];
  
  for (const patternSet of patternSets) {
    for (const [key, patterns] of Object.entries(patternSet)) {
      const confidence = calculateConfidence(analysis, patterns);
      if (confidence > 0.3) {
        matches.push({ type: key, confidence, evidence: patterns });
      }
    }
  }
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}
```

This detailed pattern matching system provides **high-precision detection** with **confidence scoring**, allowing the system to make intelligent defaults while highlighting areas where manual review might be needed.