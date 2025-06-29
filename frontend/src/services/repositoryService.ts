import { apiClient } from './api';

export interface AnalysisStatus {
  analysisId: string;
  repoId: string;
  status: 'pending' | 'fetching' | 'chunking' | 'embedding' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  devopsAnalysis?: DevOpsAnalysis;
  stats?: {
    totalFiles: number;
    totalChunks: number;
    embeddingsGenerated: number;
    analysisScore: number;
  };
}

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
  deploymentReadiness: number;
}

export interface RepositorySummary {
  repoId: string;
  name: string;
  description: string;
  language: string;
  frameworks: string[];
  packageManager: string;
  hasDocker: boolean;
  hasKubernetes: boolean;
  hasCICD: boolean;
  fileCount: number;
  chunkCount: number;
  embeddingCount: number;
  lastAnalyzed: string;
  devopsAnalysis?: DevOpsAnalysis;
}

export interface SearchResult {
  repoId: string;
  results: Array<{
    content: string;
    metadata: {
      filePath: string;
      language: string;
      chunkIndex: number;
      fileType: string;
    };
    score: number;
  }>;
}

class RepositoryService {
  /**
   * Start repository analysis
   */
  async startAnalysis(repoUrl: string): Promise<{ analysis: AnalysisStatus }> {
    try {
      const response = await apiClient.post('/repositories/analyze', { repoUrl });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to start repository analysis');
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(analysisId: string): Promise<{ analysis: AnalysisStatus }> {
    try {
      const response = await apiClient.get(`/repositories/analysis/${analysisId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get analysis status');
    }
  }

  /**
   * List all user analyses
   */
  async getAnalyses(): Promise<{ analyses: AnalysisStatus[] }> {
    try {
      const response = await apiClient.get('/repositories/analyses');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get analyses');
    }
  }

  /**
   * Get repository summary
   */
  async getRepositorySummary(repoId: string): Promise<{ repository: RepositorySummary }> {
    try {
      const response = await apiClient.get(`/repositories/${repoId}/summary`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get repository summary');
    }
  }

  /**
   * Search repository code using embeddings
   */
  async searchRepository(repoId: string, query: string, limit: number = 10): Promise<{ search: SearchResult }> {
    try {
      const response = await apiClient.post(`/repositories/${repoId}/search`, { 
        query, 
        limit 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to search repository');
    }
  }

  /**
   * Delete analysis data
   */
  async deleteAnalysis(analysisId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/repositories/analysis/${analysisId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete analysis');
    }
  }

  async getImportedCloudObjects() {
    const response = await apiClient.get('/repositories/imported-cloud-objects');
    return response.data.importedObjects;
  }
}

export const repositoryService = new RepositoryService(); 