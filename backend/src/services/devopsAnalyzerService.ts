import { RepoMetadata, RepoFile } from './githubFetcherService';
import { vectorStoreService, SearchResult } from './vectorStoreService';
import { logger } from '../utils/logger';

export interface DevOpsChecklistItem {
  id: string;
  category: string;
  title: string;
  detected: string | null;
  confidence: number;
  reasoning: string;
  recommendations: string[];
  status: 'pending' | 'analyzing' | 'completed';
}

export interface DevOpsAnalysis {
  repoId: string;
  checklist: DevOpsChecklistItem[];
  overallScore: number;
  recommendations: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  deploymentReadiness: number; // 0-100
}

class DevOpsAnalyzerService {
  private checklistTemplate: Omit<DevOpsChecklistItem, 'detected' | 'confidence' | 'reasoning' | 'status'>[] = [
    {
      id: 'app_type',
      category: 'Application Architecture',
      title: 'Application Type & Scale',
      recommendations: ['Identify application architecture', 'Determine scaling requirements']
    },
    {
      id: 'traffic_scale',
      category: 'Application Architecture', 
      title: 'Expected Traffic & Scaling',
      recommendations: ['Configure auto-scaling', 'Set resource limits']
    },
    {
      id: 'database_req',
      category: 'Application Architecture',
      title: 'Database Requirements',
      recommendations: ['Setup database connections', 'Configure backup strategies']
    },
    {
      id: 'security_posture',
      category: 'Security & Compliance',
      title: 'Security Posture',
      recommendations: ['Implement security policies', 'Configure RBAC']
    },
    {
      id: 'secrets_mgmt',
      category: 'Security & Compliance',
      title: 'Secrets Management',
      recommendations: ['Setup secrets management', 'Configure rotation policies']
    },
    {
      id: 'ssl_tls',
      category: 'Security & Compliance',
      title: 'SSL/TLS Configuration',
      recommendations: ['Configure certificate management', 'Setup TLS termination']
    },
    {
      id: 'cluster_arch',
      category: 'Infrastructure & Networking',
      title: 'Cluster Architecture',
      recommendations: ['Design cluster topology', 'Configure networking']
    },
    {
      id: 'networking_req',
      category: 'Infrastructure & Networking',
      title: 'Networking Requirements',
      recommendations: ['Setup ingress controllers', 'Configure load balancing']
    },
    {
      id: 'storage_req',
      category: 'Infrastructure & Networking',
      title: 'Storage Requirements',
      recommendations: ['Configure persistent volumes', 'Setup backup strategies']
    },
    {
      id: 'observability',
      category: 'Monitoring & Operations',
      title: 'Observability Level',
      recommendations: ['Setup monitoring stack', 'Configure alerting']
    },
    {
      id: 'logging',
      category: 'Monitoring & Operations',
      title: 'Logging Strategy',
      recommendations: ['Configure log aggregation', 'Setup log retention']
    },
    {
      id: 'backup_dr',
      category: 'Monitoring & Operations',
      title: 'Backup & Disaster Recovery',
      recommendations: ['Setup backup schedules', 'Configure DR procedures']
    },
    {
      id: 'cicd',
      category: 'Development & Deployment',
      title: 'CI/CD Integration',
      recommendations: ['Setup CI/CD pipelines', 'Configure automated testing']
    },
    {
      id: 'gitops',
      category: 'Development & Deployment',
      title: 'GitOps Configuration',
      recommendations: ['Setup GitOps workflows', 'Configure sync policies']
    },
    {
      id: 'environments',
      category: 'Development & Deployment',
      title: 'Environment Strategy',
      recommendations: ['Setup environment separation', 'Configure promotion workflows']
    },
    {
      id: 'cost_optimization',
      category: 'Cost & Resource Management',
      title: 'Cost Optimization',
      recommendations: ['Configure resource limits', 'Setup cost monitoring']
    },
    {
      id: 'resource_mgmt',
      category: 'Cost & Resource Management',
      title: 'Resource Management',
      recommendations: ['Setup resource quotas', 'Configure auto-scaling']
    }
  ];

  async analyzeRepository(repoId: string, metadata: RepoMetadata, files: RepoFile[]): Promise<DevOpsAnalysis> {
    logger.info(`Starting DevOps analysis for repository: ${repoId}`);

    const checklist = this.initializeChecklist();
    
    // Analyze each checklist item
    for (const item of checklist) {
      item.status = 'analyzing';
      
      try {
        await this.analyzeChecklistItem(item, metadata, files, repoId);
        item.status = 'completed';
      } catch (error) {
        logger.error(`Error analyzing ${item.id}:`, error);
        item.status = 'completed';
        item.confidence = 0;
        item.reasoning = 'Analysis failed due to error';
      }
    }

    const analysis: DevOpsAnalysis = {
      repoId,
      checklist,
      overallScore: this.calculateOverallScore(checklist),
      recommendations: this.generateOverallRecommendations(checklist, metadata),
      estimatedComplexity: this.estimateComplexity(metadata, files),
      deploymentReadiness: this.calculateDeploymentReadiness(checklist, metadata)
    };

    logger.info(`Completed DevOps analysis for ${repoId} with score: ${analysis.overallScore}`);
    return analysis;
  }

  private initializeChecklist(): DevOpsChecklistItem[] {
    return this.checklistTemplate.map(template => ({
      ...template,
      detected: null,
      confidence: 0,
      reasoning: '',
      status: 'pending' as const
    }));
  }

  private async analyzeChecklistItem(
    item: DevOpsChecklistItem, 
    metadata: RepoMetadata, 
    files: RepoFile[], 
    repoId: string
  ): Promise<void> {
    switch (item.id) {
      case 'app_type':
        this.analyzeApplicationType(item, metadata, files);
        break;
      case 'traffic_scale':
        this.analyzeTrafficScale(item, metadata, files);
        break;
      case 'database_req':
        this.analyzeDatabaseRequirements(item, metadata, files);
        break;
      case 'security_posture':
        this.analyzeSecurityPosture(item, metadata, files);
        break;
      case 'secrets_mgmt':
        this.analyzeSecretsManagement(item, metadata, files);
        break;
      case 'ssl_tls':
        this.analyzeSSLTLS(item, metadata, files);
        break;
      case 'cluster_arch':
        this.analyzeClusterArchitecture(item, metadata, files);
        break;
      case 'networking_req':
        this.analyzeNetworkingRequirements(item, metadata, files);
        break;
      case 'storage_req':
        this.analyzeStorageRequirements(item, metadata, files);
        break;
      case 'observability':
        this.analyzeObservability(item, metadata, files);
        break;
      case 'logging':
        this.analyzeLogging(item, metadata, files);
        break;
      case 'backup_dr':
        this.analyzeBackupDR(item, metadata, files);
        break;
      case 'cicd':
        this.analyzeCICD(item, metadata, files);
        break;
      case 'gitops':
        this.analyzeGitOps(item, metadata, files);
        break;
      case 'environments':
        this.analyzeEnvironments(item, metadata, files);
        break;
      case 'cost_optimization':
        this.analyzeCostOptimization(item, metadata, files);
        break;
      case 'resource_mgmt':
        this.analyzeResourceManagement(item, metadata, files);
        break;
    }
  }

  private analyzeApplicationType(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const frameworks = metadata.frameworks;
    const hasBackend = frameworks.some(f => ['Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring'].includes(f));
    const hasFrontend = frameworks.some(f => ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js'].includes(f));
    const hasDatabase = frameworks.some(f => ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'].includes(f));

    if (hasFrontend && hasBackend) {
      item.detected = 'Full-Stack Application';
      item.confidence = 0.9;
      item.reasoning = `Detected both frontend (${frameworks.filter(f => ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js'].includes(f)).join(', ')}) and backend (${frameworks.filter(f => ['Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring'].includes(f)).join(', ')}) frameworks`;
    } else if (hasBackend) {
      item.detected = 'API Service';
      item.confidence = 0.8;
      item.reasoning = `Detected backend frameworks: ${frameworks.filter(f => ['Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring'].includes(f)).join(', ')}`;
    } else if (hasFrontend) {
      item.detected = 'Frontend Application';
      item.confidence = 0.8;
      item.reasoning = `Detected frontend frameworks: ${frameworks.filter(f => ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js'].includes(f)).join(', ')}`;
    } else {
      item.detected = 'Unknown';
      item.confidence = 0.3;
      item.reasoning = 'Could not determine application type from detected frameworks';
    }
  }

  private analyzeTrafficScale(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    // Analyze based on complexity indicators
    const complexityScore = metadata.totalFiles + (metadata.frameworks.length * 10);
    
    if (complexityScore > 200) {
      item.detected = 'High Traffic';
      item.confidence = 0.7;
      item.reasoning = `Large codebase (${metadata.totalFiles} files) with multiple frameworks suggests high-scale application`;
    } else if (complexityScore > 50) {
      item.detected = 'Medium Traffic';
      item.confidence = 0.6;
      item.reasoning = `Moderate codebase size (${metadata.totalFiles} files) suggests medium-scale application`;
    } else {
      item.detected = 'Low Traffic';
      item.confidence = 0.6;
      item.reasoning = `Small codebase (${metadata.totalFiles} files) suggests low-scale application`;
    }
  }

  private analyzeDatabaseRequirements(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const databases = metadata.frameworks.filter(f => ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'].includes(f));
    
    if (databases.length > 0) {
      if (databases.includes('Redis') && databases.length > 1) {
        item.detected = 'SQL + Cache';
        item.confidence = 0.9;
        item.reasoning = `Detected databases: ${databases.join(', ')} - includes caching layer`;
      } else if (databases.includes('MongoDB')) {
        item.detected = 'NoSQL Database';
        item.confidence = 0.9;
        item.reasoning = `Detected NoSQL database: ${databases.join(', ')}`;
      } else {
        item.detected = 'SQL Database';
        item.confidence = 0.9;
        item.reasoning = `Detected SQL database: ${databases.join(', ')}`;
      }
    } else {
      item.detected = 'No Database';
      item.confidence = 0.7;
      item.reasoning = 'No database frameworks detected in codebase';
    }
  }

  private analyzeSecurityPosture(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasSecurityFiles = files.some(f => 
      f.path.includes('security') || 
      f.path.includes('auth') || 
      f.path.includes('rbac') ||
      f.content.includes('helmet') ||
      f.content.includes('cors')
    );

    if (hasSecurityFiles) {
      item.detected = 'Enhanced Security';
      item.confidence = 0.7;
      item.reasoning = 'Detected security-related files and configurations';
    } else {
      item.detected = 'Basic Security';
      item.confidence = 0.6;
      item.reasoning = 'No specific security configurations detected, basic security recommended';
    }
  }

  private analyzeSecretsManagement(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasEnvFiles = files.some(f => f.path.includes('.env') || f.path.includes('secrets'));
    const hasVault = files.some(f => f.content.includes('vault') || f.content.includes('secret'));

    if (hasVault) {
      item.detected = 'External Secrets';
      item.confidence = 0.8;
      item.reasoning = 'Detected external secrets management references';
    } else if (hasEnvFiles) {
      item.detected = 'Environment Variables';
      item.confidence = 0.7;
      item.reasoning = 'Detected environment variable usage for secrets';
    } else {
      item.detected = 'Basic Secrets';
      item.confidence = 0.5;
      item.reasoning = 'No specific secrets management detected';
    }
  }

  private analyzeSSLTLS(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasHTTPS = files.some(f => f.content.includes('https') || f.content.includes('ssl') || f.content.includes('tls'));
    
    if (hasHTTPS) {
      item.detected = 'HTTPS Configured';
      item.confidence = 0.7;
      item.reasoning = 'Detected HTTPS/SSL/TLS references in codebase';
    } else {
      item.detected = 'HTTP Only';
      item.confidence = 0.6;
      item.reasoning = 'No HTTPS configuration detected, SSL/TLS setup needed';
    }
  }

  private analyzeClusterArchitecture(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    if (metadata.hasKubernetes) {
      item.detected = 'Kubernetes Ready';
      item.confidence = 0.9;
      item.reasoning = 'Kubernetes configurations detected in repository';
    } else if (metadata.hasDockerfile) {
      item.detected = 'Container Ready';
      item.confidence = 0.8;
      item.reasoning = 'Docker configuration detected, ready for containerization';
    } else {
      item.detected = 'Traditional Deployment';
      item.confidence = 0.6;
      item.reasoning = 'No container or Kubernetes configurations detected';
    }
  }

  private analyzeNetworkingRequirements(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasIngress = files.some(f => f.content.includes('ingress') || f.content.includes('nginx'));
    const hasLoadBalancer = files.some(f => f.content.includes('loadbalancer') || f.content.includes('alb'));

    if (hasIngress || hasLoadBalancer) {
      item.detected = 'Advanced Networking';
      item.confidence = 0.8;
      item.reasoning = 'Detected ingress controllers or load balancer configurations';
    } else {
      item.detected = 'Basic Networking';
      item.confidence = 0.6;
      item.reasoning = 'Standard networking requirements detected';
    }
  }

  private analyzeStorageRequirements(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasDatabase = metadata.frameworks.some(f => ['MongoDB', 'PostgreSQL', 'MySQL'].includes(f));
    const hasFileStorage = files.some(f => f.content.includes('upload') || f.content.includes('storage'));

    if (hasDatabase && hasFileStorage) {
      item.detected = 'Database + File Storage';
      item.confidence = 0.9;
      item.reasoning = 'Detected both database and file storage requirements';
    } else if (hasDatabase) {
      item.detected = 'Database Storage';
      item.confidence = 0.8;
      item.reasoning = 'Detected database storage requirements';
    } else if (hasFileStorage) {
      item.detected = 'File Storage';
      item.confidence = 0.7;
      item.reasoning = 'Detected file storage requirements';
    } else {
      item.detected = 'No Persistent Storage';
      item.confidence = 0.7;
      item.reasoning = 'No persistent storage requirements detected';
    }
  }

  private analyzeObservability(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasMonitoring = files.some(f => 
      f.content.includes('prometheus') || 
      f.content.includes('grafana') || 
      f.content.includes('monitoring')
    );

    if (hasMonitoring) {
      item.detected = 'Advanced Monitoring';
      item.confidence = 0.8;
      item.reasoning = 'Detected monitoring and observability tools';
    } else {
      item.detected = 'Basic Monitoring';
      item.confidence = 0.6;
      item.reasoning = 'No advanced monitoring detected, basic setup recommended';
    }
  }

  private analyzeLogging(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasLogging = files.some(f => 
      f.content.includes('winston') || 
      f.content.includes('logger') || 
      f.content.includes('log')
    );

    if (hasLogging) {
      item.detected = 'Structured Logging';
      item.confidence = 0.8;
      item.reasoning = 'Detected logging frameworks and structured logging';
    } else {
      item.detected = 'Basic Logging';
      item.confidence = 0.6;
      item.reasoning = 'No structured logging detected, basic setup recommended';
    }
  }

  private analyzeBackupDR(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasDatabase = metadata.frameworks.some(f => ['MongoDB', 'PostgreSQL', 'MySQL'].includes(f));
    
    if (hasDatabase) {
      item.detected = 'Database Backups';
      item.confidence = 0.7;
      item.reasoning = 'Database detected, backup strategy required';
    } else {
      item.detected = 'Stateless Application';
      item.confidence = 0.8;
      item.reasoning = 'No persistent data detected, minimal backup requirements';
    }
  }

  private analyzeCICD(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    if (metadata.hasCI) {
      item.detected = 'CI/CD Configured';
      item.confidence = 0.9;
      item.reasoning = 'CI/CD pipeline configurations detected';
    } else {
      item.detected = 'No CI/CD';
      item.confidence = 0.8;
      item.reasoning = 'No CI/CD configurations detected, setup required';
    }
  }

  private analyzeGitOps(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasGitOps = files.some(f => 
      f.content.includes('argocd') || 
      f.content.includes('flux') || 
      f.path.includes('gitops')
    );

    if (hasGitOps) {
      item.detected = 'GitOps Ready';
      item.confidence = 0.9;
      item.reasoning = 'GitOps tools and configurations detected';
    } else {
      item.detected = 'Manual Deployment';
      item.confidence = 0.7;
      item.reasoning = 'No GitOps configurations detected';
    }
  }

  private analyzeEnvironments(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasEnvConfigs = files.some(f => 
      f.path.includes('env') || 
      f.path.includes('config') || 
      f.path.includes('staging') || 
      f.path.includes('prod')
    );

    if (hasEnvConfigs) {
      item.detected = 'Multi-Environment';
      item.confidence = 0.8;
      item.reasoning = 'Multiple environment configurations detected';
    } else {
      item.detected = 'Single Environment';
      item.confidence = 0.7;
      item.reasoning = 'No multi-environment setup detected';
    }
  }

  private analyzeCostOptimization(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const complexityScore = metadata.totalFiles + (metadata.frameworks.length * 10);
    
    if (complexityScore > 200) {
      item.detected = 'Performance-First';
      item.confidence = 0.7;
      item.reasoning = 'Large application requires performance optimization';
    } else {
      item.detected = 'Cost-Aware';
      item.confidence = 0.7;
      item.reasoning = 'Standard application, cost optimization recommended';
    }
  }

  private analyzeResourceManagement(item: DevOpsChecklistItem, metadata: RepoMetadata, files: RepoFile[]): void {
    const hasResourceConfigs = files.some(f => 
      f.content.includes('resources:') || 
      f.content.includes('limits:') || 
      f.content.includes('requests:')
    );

    if (hasResourceConfigs) {
      item.detected = 'Resource Limits Configured';
      item.confidence = 0.9;
      item.reasoning = 'Resource limits and requests detected in configurations';
    } else {
      item.detected = 'Basic Resources';
      item.confidence = 0.6;
      item.reasoning = 'No resource management configurations detected';
    }
  }

  private calculateOverallScore(checklist: DevOpsChecklistItem[]): number {
    const totalScore = checklist.reduce((sum, item) => sum + item.confidence, 0);
    return Math.round((totalScore / checklist.length) * 100);
  }

  private generateOverallRecommendations(checklist: DevOpsChecklistItem[], metadata: RepoMetadata): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on analysis
    if (metadata.hasDockerfile) {
      recommendations.push('✅ Application is containerized and ready for Kubernetes deployment');
    } else {
      recommendations.push('🔧 Add Dockerfile for containerization');
    }

    if (metadata.hasCI) {
      recommendations.push('✅ CI/CD pipeline detected');
    } else {
      recommendations.push('🔧 Setup CI/CD pipeline for automated deployments');
    }

    if (metadata.hasKubernetes) {
      recommendations.push('✅ Kubernetes configurations found');
    } else {
      recommendations.push('🔧 Add Kubernetes manifests for deployment');
    }

    return recommendations;
  }

  private estimateComplexity(metadata: RepoMetadata, files: RepoFile[]): 'low' | 'medium' | 'high' {
    const complexityScore = metadata.totalFiles + (metadata.frameworks.length * 10) + (metadata.languages ? Object.keys(metadata.languages).length * 5 : 0);
    
    if (complexityScore > 200) return 'high';
    if (complexityScore > 50) return 'medium';
    return 'low';
  }

  private calculateDeploymentReadiness(checklist: DevOpsChecklistItem[], metadata: RepoMetadata): number {
    let readinessScore = 0;
    
    // Docker readiness
    if (metadata.hasDockerfile) readinessScore += 30;
    
    // CI/CD readiness
    if (metadata.hasCI) readinessScore += 25;
    
    // Kubernetes readiness
    if (metadata.hasKubernetes) readinessScore += 25;
    
    // Configuration readiness
    const configItems = checklist.filter(item => 
      ['secrets_mgmt', 'ssl_tls', 'observability'].includes(item.id) && 
      item.confidence > 0.7
    );
    readinessScore += (configItems.length / 3) * 20;

    return Math.min(100, readinessScore);
  }
}

export const devopsAnalyzerService = new DevOpsAnalyzerService(); 