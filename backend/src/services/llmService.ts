import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

interface RepositoryAnalysis {
  techStack: string[];
  microservices: string[];
  dockerfiles: string[];
  dockerCompose: string[];
  ciWorkflows: string[];
  infrastructure: {
    suggested: string;
    components: string[];
    deployment: string;
  };
  dependencies: Record<string, string[]>;
  recommendations: string[];
}

class LLMService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: string;

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  async analyzeRepository(repoData: {
    name: string;
    files: any[];
    packageJson?: any;
    dockerfiles?: string[];
    readmeContent?: string;
  }): Promise<RepositoryAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(repoData);
      
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        throw new Error('No LLM provider configured');
      }
      
      return this.parseAnalysisResponse(response);
    } catch (error) {
      logger.error('Error analyzing repository with LLM', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(repoData: any): string {
    return `
You are an expert DevOps engineer analyzing a repository for automated deployment to AWS Kubernetes.

Repository: ${repoData.name}
Files structure: ${JSON.stringify(repoData.files, null, 2)}
Package.json: ${repoData.packageJson ? JSON.stringify(repoData.packageJson, null, 2) : 'Not found'}
Dockerfiles found: ${repoData.dockerfiles?.join(', ') || 'None'}
README content: ${repoData.readmeContent || 'Not available'}

Please analyze this repository and provide a JSON response with the following structure:
{
  "techStack": ["technology1", "technology2"],
  "microservices": ["service1", "service2"],
  "dockerfiles": ["path/to/dockerfile1", "path/to/dockerfile2"],
  "dockerCompose": ["path/to/docker-compose.yml"],
  "ciWorkflows": ["workflow1", "workflow2"],
  "infrastructure": {
    "suggested": "kubernetes",
    "components": ["ingress", "service", "deployment"],
    "deployment": "rolling"
  },
  "dependencies": {
    "frontend": ["react", "typescript"],
    "backend": ["node", "express"]
  },
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on:
1. Identifying the main technology stack
2. Detecting microservices architecture
3. Finding existing Docker configurations
4. Analyzing CI/CD workflows
5. Suggesting Kubernetes deployment strategy
6. Recommending infrastructure components
7. Identifying service dependencies

Provide specific, actionable recommendations for AWS EKS deployment.
`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not configured');
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert DevOps engineer specializing in Kubernetes deployments and infrastructure analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || '';
  }

  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) throw new Error('Anthropic not configured');
    
    try {
      const completion = await (this.anthropic as any).messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      return completion.content[0]?.type === 'text' ? completion.content[0].text : '';
    } catch (error) {
      logger.error('Anthropic API error', error);
      throw error;
    }
  }

  private parseAnalysisResponse(response: string): RepositoryAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and provide defaults
      return {
        techStack: parsed.techStack || [],
        microservices: parsed.microservices || [],
        dockerfiles: parsed.dockerfiles || [],
        dockerCompose: parsed.dockerCompose || [],
        ciWorkflows: parsed.ciWorkflows || [],
        infrastructure: {
          suggested: parsed.infrastructure?.suggested || 'kubernetes',
          components: parsed.infrastructure?.components || ['deployment', 'service'],
          deployment: parsed.infrastructure?.deployment || 'rolling'
        },
        dependencies: parsed.dependencies || {},
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      logger.error('Error parsing LLM response', error);
      
      // Return default analysis if parsing fails
      return {
        techStack: ['unknown'],
        microservices: [],
        dockerfiles: [],
        dockerCompose: [],
        ciWorkflows: [],
        infrastructure: {
          suggested: 'kubernetes',
          components: ['deployment', 'service'],
          deployment: 'rolling'
        },
        dependencies: {},
        recommendations: ['Manual analysis required']
      };
    }
  }

  async generateTerraformConfig(analysis: RepositoryAnalysis, repoName: string): Promise<string> {
    const prompt = `
Generate Terraform configuration for deploying the following application to AWS EKS:

Repository: ${repoName}
Tech Stack: ${analysis.techStack.join(', ')}
Microservices: ${analysis.microservices.join(', ')}
Infrastructure Components: ${analysis.infrastructure.components.join(', ')}

Please provide a complete Terraform configuration including:
1. EKS cluster setup
2. Node groups
3. VPC and networking
4. Security groups
5. IAM roles and policies
6. Application Load Balancer
7. RDS database if needed

Make it production-ready with proper security and scalability considerations.
`;

    try {
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        throw new Error('No LLM provider configured');
      }
      
      return response;
    } catch (error) {
      logger.error('Error generating Terraform config', error);
      throw error;
    }
  }

  async generateHelmChart(analysis: RepositoryAnalysis, repoName: string): Promise<string> {
    const prompt = `
Generate Helm chart configuration for deploying the following application:

Repository: ${repoName}
Tech Stack: ${analysis.techStack.join(', ')}
Microservices: ${analysis.microservices.join(', ')}
Deployment Strategy: ${analysis.infrastructure.deployment}

Please provide a complete Helm chart including:
1. Deployment manifests
2. Service definitions
3. Ingress configuration
4. ConfigMaps and Secrets
5. HorizontalPodAutoscaler
6. ServiceMonitor for monitoring

Make it configurable and follow Helm best practices.
`;

    try {
      let response: string;
      
      if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.callAnthropic(prompt);
      } else if (this.openai) {
        response = await this.callOpenAI(prompt);
      } else {
        throw new Error('No LLM provider configured');
      }
      
      return response;
    } catch (error) {
      logger.error('Error generating Helm chart', error);
      throw error;
    }
  }
}

export default new LLMService(); 