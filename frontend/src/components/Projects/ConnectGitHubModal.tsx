import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FolderIcon,
  StarIcon,
  EyeIcon,
  LockClosedIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../services/api';

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  defaultBranch: string;
  topics: string[];
}

interface ConnectGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryConnected: (repository: any) => void;
}

const ConnectGitHubModal: React.FC<ConnectGitHubModalProps> = ({
  isOpen,
  onClose,
  onRepositoryConnected,
}) => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepository[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepository | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUnconnectedRepositories();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter repositories based on search term
    if (searchTerm.trim() === '') {
      setFilteredRepositories(repositories);
    } else {
      const filtered = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (repo.language && repo.language.toLowerCase().includes(searchTerm.toLowerCase())) ||
        repo.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredRepositories(filtered);
    }
  }, [searchTerm, repositories]);

  const fetchUnconnectedRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the fresh endpoint that bypasses all caching
      const response = await apiClient.get('/github/repositories/unconnected-fresh');
      setRepositories(response.data.repositories || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch GitHub repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepository = async () => {
    if (!selectedRepository) return;

    try {
      setConnecting(true);
      const response = await apiClient.post('/github/repositories/connect', {
        githubId: selectedRepository.id
      });
      
      onRepositoryConnected(response.data.repository);
      onClose();
      
      // Reset state
      setSelectedRepository(null);
      setSearchTerm('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect repository');
    } finally {
      setConnecting(false);
    }
  };

  const handleClose = () => {
    setSelectedRepository(null);
    setSearchTerm('');
    setError(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      javascript: 'bg-yellow-100 text-yellow-800',
      typescript: 'bg-blue-100 text-blue-800',
      python: 'bg-green-100 text-green-800',
      java: 'bg-orange-100 text-orange-800',
      react: 'bg-cyan-100 text-cyan-800',
      vue: 'bg-emerald-100 text-emerald-800',
      angular: 'bg-red-100 text-red-800',
      node: 'bg-green-100 text-green-800',
      'c#': 'bg-purple-100 text-purple-800',
      php: 'bg-indigo-100 text-indigo-800',
      ruby: 'bg-red-100 text-red-800',
      go: 'bg-cyan-100 text-cyan-800',
      rust: 'bg-orange-100 text-orange-800',
    };
    return colors[language?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-0 border max-w-4xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Connect GitHub Repository
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Select a repository from your GitHub account to connect to DeployAI
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Refresh */}
        <div className="p-6 border-b">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search repositories by name, language, or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchUnconnectedRepositories}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No matching repositories' : 'No unconnected repositories'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'All your GitHub repositories are already connected to DeployAI.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredRepositories.map((repo) => {
                const isSelected = selectedRepository?.id === repo.id;

                return (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepository(repo)}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <CheckIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <FolderIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900 truncate">
                            {repo.name}
                          </h4>
                          {repo.private && (
                            <LockClosedIcon className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{repo.fullName}</p>
                        
                        {repo.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mb-3">
                          {repo.language && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLanguageColor(repo.language)}`}>
                              {repo.language}
                            </span>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <StarIcon className="h-4 w-4 mr-1" />
                            {repo.stargazersCount}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {repo.forksCount} forks
                          </div>
                          <span className="text-sm text-gray-500">
                            Updated {formatDate(repo.updatedAt)}
                          </span>
                        </div>

                        {repo.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {repo.topics.slice(0, 5).map((topic, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                              >
                                {topic}
                              </span>
                            ))}
                            {repo.topics.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{repo.topics.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredRepositories.length} repositor{filteredRepositories.length === 1 ? 'y' : 'ies'} available
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={connecting}
            >
              Cancel
            </button>
            <button
              onClick={handleConnectRepository}
              disabled={!selectedRepository || connecting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect Repository'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectGitHubModal; 