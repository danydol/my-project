import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FolderIcon,
  LinkIcon,
  CheckIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../services/api';
import ConnectGitHubModal from './ConnectGitHubModal';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  isPrivate: boolean;
  defaultBranch: string;
  analyses?: Array<{
    id: string;
    techStack: any;
    confidence: number;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AddRepositoryModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onRepositoryAdded: (repository: Repository) => void;
}

const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  isOpen,
  projectId,
  onClose,
  onRepositoryAdded,
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [sshKey, setSshKey] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnassignedRepositories();
      generateSSHKey();
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
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredRepositories(filtered);
    }
  }, [searchTerm, repositories]);

  const fetchUnassignedRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/repositories?unassigned=true');
      setRepositories(response.data.repositories || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepository = async () => {
    if (!selectedRepository) return;

    try {
      setAdding(true);
      const response = await apiClient.post(`/projects/${projectId}/repositories`, {
        repositoryId: selectedRepository.id
      });
      
      onRepositoryAdded(response.data.repository);
      onClose();
      
      // Reset state
      setSelectedRepository(null);
      setSearchTerm('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add repository');
    } finally {
      setAdding(false);
    }
  };

  const handleRepositoryConnected = async (newRepository: any) => {
    // Refresh the unassigned repositories list
    await fetchUnassignedRepositories();
    setShowConnectModal(false);
    
    // Optionally auto-select the newly connected repository
    setSelectedRepository(newRepository);
  };

  const handleClose = () => {
    setSelectedRepository(null);
    setSearchTerm('');
    setError(null);
    onClose();
  };

  const getTechStackIcons = (techStack: any[]) => {
    if (!techStack || !Array.isArray(techStack)) return [];
    return techStack.slice(0, 3).map(tech => tech.name || tech).filter(Boolean);
  };

  const generateSSHKey = async () => {
    try {
      const response = await apiClient.get('/auth/ssh-key');
      setSshKey(response.data.sshKey);
    } catch (error) {
      console.error('Failed to generate SSH key:', error);
    }
  };

  const copySSHKey = async () => {
    try {
      await navigator.clipboard.writeText(sshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy SSH key:', error);
    }
  };

  const openGitHubSettings = () => {
    window.open('https://github.com/settings/keys', '_blank');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-8 mx-auto p-0 border max-w-2xl shadow-lg rounded-lg bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Add Repository to Project
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : filteredRepositories.length === 0 ? (
              <div className="text-center py-8">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm ? 'No matching repositories' : 'No unassigned repositories'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search terms.'
                    : 'All your connected repositories are already assigned to projects.'
                  }
                </p>
                {!searchTerm && (
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <LinkIcon className="-ml-1 mr-2 h-4 w-4" />
                      Connect from GitHub
                    </button>
                    
                    {/* SSH Key Section */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900 flex items-center">
                          <KeyIcon className="h-4 w-4 mr-2 text-gray-600" />
                          SSH Key Setup
                        </h4>
                        <button
                          onClick={openGitHubSettings}
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Cog6ToothIcon className="h-3 w-3 mr-1" />
                          GitHub Settings
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">
                          Copy this SSH key and add it to your GitHub account:
                        </p>
                        
                        {sshKey ? (
                          <div className="relative">
                            <textarea
                              readOnly
                              value={sshKey}
                              className="w-full h-20 p-2 text-xs font-mono bg-white border border-gray-300 rounded resize-none"
                              placeholder="Generating SSH key..."
                            />
                            <button
                              onClick={copySSHKey}
                              className="absolute top-1 right-1 p-1 text-gray-500 hover:text-gray-700 bg-white rounded border"
                              title="Copy SSH key"
                            >
                              {copied ? (
                                <CheckIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="h-20 p-2 text-xs text-gray-500 bg-white border border-gray-300 rounded flex items-center justify-center">
                            Generating SSH key...
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          <p>1. Copy the SSH key above</p>
                          <p>2. Go to <button onClick={openGitHubSettings} className="text-blue-600 hover:underline">GitHub Settings → SSH Keys</button></p>
                          <p>3. Click "New SSH key" and paste the key</p>
                          <p>4. Return here and connect your repositories</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRepositories.map((repo) => {
                  const isSelected = selectedRepository?.id === repo.id;
                  const latestAnalysis = repo.analyses?.[0];
                  const techStack = getTechStackIcons(latestAnalysis?.techStack || []);

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
                        <div className="absolute top-3 right-3">
                          <CheckIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <FolderIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {repo.name}
                            </h4>
                            {repo.isPrivate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{repo.fullName}</p>
                          
                          {repo.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          
                          {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {techStack.map((tech, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tech}
                                </span>
                              ))}
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
          <div className="flex items-center justify-end p-6 border-t bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={adding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRepository}
                disabled={!selectedRepository || adding}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add Repository'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connect GitHub Modal */}
      <ConnectGitHubModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onRepositoryConnected={handleRepositoryConnected}
      />
    </>
  );
};

export default AddRepositoryModal; 