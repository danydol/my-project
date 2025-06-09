import { githubFetcherService, RepoMetadata, RepoFile } from './githubFetcherService';
import { codeChunkerService } from './codeChunkerService';
import { vectorStoreService, CodeChunk } from './vectorStoreService';
import { devopsAnalyzerService, DevOpsAnalysis } from './devopsAnalyzerService';
import { logger } from '../utils/logger';
import { EncryptionService } from '../utils/encryption';
import databaseService from './databaseService';

export interface RepositoryAnalysisRequest {
  repoUrl: string;
  userId: string;
  analysisId: string;
  // Optional project ID for GitHub token retrieval
  projectId?: string;
}

export interface RepositoryAnalysisStatus {
  analysisId: string;
  repoId: string;
  status: 'pending' | 'fetching' | 'chunking' | 'embedding' | 'analyzing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: RepoMetadata;
  devopsAnalysis?: DevOpsAnalysis;
  stats?: {
    totalFiles: number;
    totalChunks: number;
    embeddingsGenerated: number;
    analysisScore: number;
  };
}

class RepositoryAnalyzerService {
  private analysisStatuses = new Map<string, RepositoryAnalysisStatus>();

  async startAnalysis(request: RepositoryAnalysisRequest): Promise<RepositoryAnalysisStatus> {
    const { repoUrl, userId, analysisId } = request;
    
    // Parse repository URL
    const repoId = this.parseRepoUrl(repoUrl);
    if (!repoId) {
      throw new Error('Invalid repository URL format');
    }

    // Initialize analysis status
    const status: RepositoryAnalysisStatus = {
      analysisId,
      repoId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing analysis',
      startedAt: new Date()
    };

    this.analysisStatuses.set(analysisId, status);

    // Start background analysis
    this.performAnalysis(request, status).catch(error => {
      logger.error(`Analysis failed for ${repoId}:`, error);
      status.status = 'failed';
      status.error = error.message;
      status.progress = 0;
    });

    return status;
  }

  getAnalysisStatus(analysisId: string): RepositoryAnalysisStatus | null {
    return this.analysisStatuses.get(analysisId) || null;
  }

  getAllAnalyses(): RepositoryAnalysisStatus[] {
    return Array.from(this.analysisStatuses.values());
  }

  private async performAnalysis(
    request: RepositoryAnalysisRequest, 
    status: RepositoryAnalysisStatus
  ): Promise<void> {
    const { repoUrl, userId, analysisId } = request;
    const [owner, repo] = status.repoId.split('/');

    try {
      // Step 1: Fetch repository
      status.status = 'fetching';
      status.currentStep = 'Fetching repository files';
      status.progress = 10;
      this.updateStatus(status);

      logger.info(`Fetching repository: ${status.repoId}`);
      
      // Get GitHub token from project if available
      let githubToken: string | undefined;
      if (request.projectId) {
        try {
          const encryptedToken = await databaseService.getProjectGitHubToken(request.projectId);
          if (encryptedToken) {
            githubToken = EncryptionService.decryptGitHubToken(encryptedToken);
          }
        } catch (error) {
          logger.warn('Failed to decrypt project GitHub token', { projectId: request.projectId, error });
        }
      }
      
      const { files, metadata } = await githubFetcherService.fetchRepository(owner, repo, githubToken);
      
      status.metadata = metadata;
      status.progress = 25;
      status.currentStep = `Fetched ${files.length} files`;
      this.updateStatus(status);

      // Step 2: Initialize vector store
      status.currentStep = 'Initializing vector store';
      status.progress = 30;
      this.updateStatus(status);

      await vectorStoreService.initializeCollection(status.repoId);

      // Step 3: Chunk files
      status.status = 'chunking';
      status.currentStep = 'Chunking code files';
      status.progress = 35;
      this.updateStatus(status);

      logger.info(`Chunking ${files.length} files for ${status.repoId}`);
      const chunks = await codeChunkerService.chunkFiles(files, status.repoId);
      
      status.progress = 50;
      status.currentStep = `Generated ${chunks.length} code chunks`;
      this.updateStatus(status);

      // Step 4: Generate embeddings and store
      status.status = 'embedding';
      status.currentStep = 'Generating embeddings';
      status.progress = 55;
      this.updateStatus(status);

      logger.info(`Generating embeddings for ${chunks.length} chunks`);
      await this.processChunksInBatches(chunks, status);

      // Step 5: DevOps analysis
      status.status = 'analyzing';
      status.currentStep = 'Analyzing DevOps requirements';
      status.progress = 80;
      this.updateStatus(status);

      logger.info(`Starting DevOps analysis for ${status.repoId}`);
      const devopsAnalysis = await devopsAnalyzerService.analyzeRepository(
        status.repoId, 
        metadata, 
        files
      );

      status.devopsAnalysis = devopsAnalysis;
      status.progress = 95;
      status.currentStep = 'Finalizing analysis';
      this.updateStatus(status);

      // Step 6: Complete analysis
      const vectorStats = await vectorStoreService.getCollectionStats(status.repoId);
      const chunkStats = codeChunkerService.getChunkingStats(chunks);

      status.status = 'completed';
      status.progress = 100;
      status.currentStep = 'Analysis completed';
      status.completedAt = new Date();
      status.stats = {
        totalFiles: files.length,
        totalChunks: chunks.length,
        embeddingsGenerated: vectorStats.count,
        analysisScore: devopsAnalysis.overallScore
      };

      this.updateStatus(status);

      logger.info(`Completed analysis for ${status.repoId} with score: ${devopsAnalysis.overallScore}`);

    } catch (error) {
      logger.error(`Analysis failed for ${status.repoId}:`, error);
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error occurred';
      status.progress = 0;
      this.updateStatus(status);
      throw error;
    }
  }

  private async processChunksInBatches(
    chunks: CodeChunk[], 
    status: RepositoryAnalysisStatus
  ): Promise<void> {
    const batchSize = 50; // Process chunks in batches to avoid overwhelming the system
    const totalBatches = Math.ceil(chunks.length / batchSize);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      status.currentStep = `Processing embeddings batch ${batchNumber}/${totalBatches}`;
      status.progress = 55 + Math.round((batchNumber / totalBatches) * 20); // 55-75% for embedding
      this.updateStatus(status);

      await vectorStoreService.addChunks(status.repoId, batch);

      // Add small delay between batches to prevent rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private updateStatus(status: RepositoryAnalysisStatus): void {
    this.analysisStatuses.set(status.analysisId, { ...status });
    
    // Emit status update event (for real-time updates)
    // This could be connected to WebSocket or Server-Sent Events
    logger.info(`Analysis ${status.analysisId}: ${status.currentStep} (${status.progress}%)`);
  }

  private parseRepoUrl(repoUrl: string): string | null {
    try {
      // Handle various GitHub URL formats
      const patterns = [
        /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
        /^([^\/]+)\/([^\/]+)$/
      ];

      for (const pattern of patterns) {
        const match = repoUrl.match(pattern);
        if (match) {
          const [, owner, repo] = match;
          return `${owner}/${repo.replace(/\.git$/, '')}`;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error parsing repository URL:', error);
      return null;
    }
  }

  // Search functionality using the vector store
  async searchRepository(
    repoId: string, 
    query: string, 
    limit: number = 10
  ): Promise<{
    results: Array<{
      content: string;
      filePath: string;
      startLine: number;
      endLine: number;
      score: number;
    }>;
    totalResults: number;
  }> {
    try {
      const searchResults = await vectorStoreService.searchSimilar(repoId, query, limit);
      
      return {
        results: searchResults.map(result => ({
          content: result.chunk.content,
          filePath: result.chunk.metadata.filePath,
          startLine: result.chunk.metadata.startLine,
          endLine: result.chunk.metadata.endLine,
          score: result.score
        })),
        totalResults: searchResults.length
      };
    } catch (error) {
      logger.error(`Error searching repository ${repoId}:`, error);
      throw error;
    }
  }

  // Get repository analysis summary
  async getRepositorySummary(repoId: string): Promise<{
    metadata?: RepoMetadata;
    devopsAnalysis?: DevOpsAnalysis;
    vectorStats?: { count: number };
  } | null> {
    try {
      // Find the analysis status for this repo
      const analysis = Array.from(this.analysisStatuses.values())
        .find(status => status.repoId === repoId && status.status === 'completed');

      if (!analysis) {
        return null;
      }

      const vectorStats = await vectorStoreService.getCollectionStats(repoId);

      return {
        metadata: analysis.metadata,
        devopsAnalysis: analysis.devopsAnalysis,
        vectorStats
      };
    } catch (error) {
      logger.error(`Error getting repository summary for ${repoId}:`, error);
      throw error;
    }
  }

  // Clean up analysis data
  async deleteAnalysis(analysisId: string): Promise<void> {
    const status = this.analysisStatuses.get(analysisId);
    if (status) {
      try {
        // Delete vector store collection
        await vectorStoreService.deleteCollection(status.repoId);
        
        // Remove from memory
        this.analysisStatuses.delete(analysisId);
        
        logger.info(`Deleted analysis ${analysisId} for repository ${status.repoId}`);
      } catch (error) {
        logger.error(`Error deleting analysis ${analysisId}:`, error);
        throw error;
      }
    }
  }
}

export const repositoryAnalyzerService = new RepositoryAnalyzerService(); 