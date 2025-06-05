import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  FolderIcon, 
  CodeBracketIcon,
  CloudIcon,
  ChartBarIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../services/api';
import AddRepositoryModal from './AddRepositoryModal';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  isPrivate: boolean;
  defaultBranch: string;
  lastAnalyzed?: string;
  project?: {
    id: string;
    name: string;
  };
  analyses?: Array<{
    id: string;
    techStack: any;
    confidence: number;
    createdAt: string;
  }>;
  deployments?: Array<{
    id: string;
    status: string;
    environment: string;
    deploymentUrl?: string;
  }>;
  _count?: {
    deployments: number;
    infrastructures: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectRepositoryGridProps {
  projectId: string;
  onRepositoryUpdate?: () => void;
}

const ProjectRepositoryGrid: React.FC<ProjectRepositoryGridProps> = ({
  projectId,
  onRepositoryUpdate,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectRepositories();
  }, [projectId]);

  const fetchProjectRepositories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/projects/${projectId}/repositories`);
      setRepositories(response.data.repositories || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRepository = async (repositoryId: string) => {
    if (!confirm('Are you sure you want to remove this repository from the project?')) {
      return;
    }

    try {
      await apiClient.delete(`/projects/${projectId}/repositories/${repositoryId}`);
      setRepositories(prev => prev.filter(repo => repo.id !== repositoryId));
      onRepositoryUpdate?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove repository');
    }
  };

  const handleRepositoryAdded = (newRepository: Repository) => {
    setRepositories(prev => [newRepository, ...prev]);
    onRepositoryUpdate?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'text-green-600 bg-green-100';
      case 'deploying': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTechStackIcons = (techStack: any[]) => {
    if (!techStack || !Array.isArray(techStack)) return [];
    return techStack.slice(0, 3).map(tech => tech.name || tech).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Repositories</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Repositories</h3>
          <p className="text-sm text-gray-600">
            {repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'} in this project
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Repository
        </button>
      </div>

      {repositories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a repository to this project.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => {
            const latestAnalysis = repo.analyses?.[0];
            const techStack = getTechStackIcons(latestAnalysis?.techStack || []);
            const activeDeployments = repo.deployments?.filter(d => d.status === 'deployed') || [];

            return (
              <div
                key={repo.id}
                className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FolderIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {repo.name}
                        </h4>
                        <p className="text-xs text-gray-500">{repo.fullName}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button className="text-gray-400 hover:text-gray-600">
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      {/* TODO: Add dropdown menu */}
                    </div>
                  </div>

                  {/* Description */}
                  {repo.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  {/* Tech Stack */}
                  {techStack.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {repo._count?.deployments || 0}
                      </div>
                      <div className="text-xs text-gray-500">Deployments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {activeDeployments.length}
                      </div>
                      <div className="text-xs text-gray-500">Active</div>
                    </div>
                  </div>

                  {/* Active Deployments */}
                  {activeDeployments.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {activeDeployments.slice(0, 2).map((deployment) => (
                          <span
                            key={deployment.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}
                          >
                            <CloudIcon className="w-3 h-3 mr-1" />
                            {deployment.environment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={() => window.open(`https://github.com/${repo.fullName}`, '_blank')}
                      >
                        <LinkIcon className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveRepository(repo.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddRepositoryModal
        isOpen={showAddModal}
        projectId={projectId}
        onClose={() => setShowAddModal(false)}
        onRepositoryAdded={handleRepositoryAdded}
      />
    </div>
  );
};

export default ProjectRepositoryGrid; 