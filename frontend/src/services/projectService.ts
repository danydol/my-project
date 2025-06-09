import { apiClient } from './api';

export interface ProjectSettings {
  id: string;
  name: string;
  description: string;
  defaultEnvironments: string[];
  multiCloud: boolean;
  hasGitHubToken: boolean;
  githubTokenUpdatedAt: string | null;
  tags: string[];
  icon: string | null;
  color: string | null;
}

export interface UpdateProjectSettingsRequest {
  name?: string;
  description?: string;
  defaultEnvironments?: string[];
  multiCloud?: boolean;
  tags?: string[];
  icon?: string;
  color?: string;
}

class ProjectService {
  /**
   * Get project settings
   */
  async getProjectSettings(projectId: string): Promise<{ success: boolean; settings: ProjectSettings }> {
    try {
      const response = await apiClient.get(`/projects/${projectId}/settings`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch project settings');
    }
  }

  /**
   * Update project settings
   */
  async updateProjectSettings(
    projectId: string, 
    settings: UpdateProjectSettingsRequest
  ): Promise<{ success: boolean; project: ProjectSettings }> {
    try {
      const response = await apiClient.patch(`/projects/${projectId}/settings`, settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update project settings');
    }
  }

  /**
   * Update GitHub token for project
   */
  async updateGitHubToken(
    projectId: string, 
    token: string
  ): Promise<{ success: boolean; message: string; updatedAt: string }> {
    try {
      const response = await apiClient.post(`/projects/${projectId}/settings/github-token`, {
        token
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update GitHub token');
    }
  }

  /**
   * Remove GitHub token from project
   */
  async removeGitHubToken(projectId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`/projects/${projectId}/settings/github-token`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to remove GitHub token');
    }
  }

  /**
   * Test GitHub token validity
   */
  async testGitHubToken(projectId: string): Promise<{ success: boolean; valid: boolean; user?: any }> {
    try {
      const response = await apiClient.post(`/projects/${projectId}/settings/github-token/test`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to test GitHub token');
    }
  }
}

export const projectService = new ProjectService();
export default projectService; 