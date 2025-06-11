import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  GitBranch,
  Cloud,
  Settings,
  RefreshCw
} from 'lucide-react';
import apiClient from '../services/api';

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  private: boolean;
  githubId: string;
}

interface CloudConnection {
  id: string;
  name: string;
  provider: string;
  region: string;
  status: string;
}

interface Deployment {
  id: string;
  name: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'destroyed';
  environment: string;
  provider: string;
  deploymentUrl?: string;
  deployedAt?: string;
  createdAt: string;
  repository: Repository;
  cloudConnection: CloudConnection;
}

const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [cloudConnections, setCloudConnections] = useState<CloudConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedCloud, setSelectedCloud] = useState('');
  const [environment, setEnvironment] = useState('dev');
  const [region, setRegion] = useState('');

  useEffect(() => {
    loadDeployments();
    loadAvailableResources();
  }, []);

  const loadDeployments = async () => {
    try {
      const response = await apiClient.get('/deployments');
      setDeployments(response.data.deployments);
    } catch (error) {
      console.error('Error loading deployments:', error);
    }
  };

  const loadAvailableResources = async () => {
    try {
      const response = await apiClient.get('/deployments/available-resources');
      setRepositories(response.data.repositories);
      setCloudConnections(response.data.cloudConnections);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDeployment = async () => {
    if (!selectedRepo || !selectedCloud || !environment || !region) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await apiClient.post('/deployments', {
        repositoryId: selectedRepo,
        cloudConnectionId: selectedCloud,
        environment,
        region
      });

      setDeployments(prev => [response.data.deployment, ...prev]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating deployment:', error);
      alert('Failed to create deployment');
    } finally {
      setCreating(false);
    }
  };

  const destroyDeployment = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to destroy this deployment? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.post(`/deployments/${deploymentId}/destroy`);
      setDeployments(prev => prev.map(d => 
        d.id === deploymentId ? { ...d, status: 'destroyed' as const } : d
      ));
    } catch (error) {
      console.error('Error destroying deployment:', error);
      alert('Failed to destroy deployment');
    }
  };

  const resetForm = () => {
    setSelectedRepo('');
    setSelectedCloud('');
    setEnvironment('dev');
    setRegion('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'deploying':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'deployed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'destroyed':
        return <Trash2 className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'deploying':
        return 'bg-blue-100 text-blue-800';
      case 'deployed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'destroyed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'dev':
        return 'bg-blue-100 text-blue-800';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800';
      case 'production':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-600 mt-1">Manage your application deployments with AWS and Git integration</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Deployment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Deployments</p>
              <p className="text-lg font-semibold text-gray-900">{deployments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-lg font-semibold text-gray-900">
                {deployments.filter(d => d.status === 'deployed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">
                {deployments.filter(d => d.status === 'deploying' || d.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-lg font-semibold text-gray-900">
                {deployments.filter(d => d.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployments List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Deployments</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {deployments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
              <p className="text-gray-600 mb-4">Create your first deployment to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Create Deployment
              </button>
            </div>
          ) : (
            deployments.map((deployment) => (
              <div key={deployment.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(deployment.status)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{deployment.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                          {deployment.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(deployment.environment)}`}>
                          {deployment.environment}
                        </span>
                        <span className="text-sm text-gray-500">
                          {deployment.provider.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {deployment.deploymentUrl && deployment.status === 'deployed' && (
                      <a
                        href={deployment.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {deployment.status === 'deployed' && (
                      <button
                        onClick={() => destroyDeployment(deployment.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Destroy deployment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <GitBranch className="w-4 h-4 mr-1" />
                    {deployment.repository.owner}/{deployment.repository.name}
                  </div>
                  <div className="flex items-center">
                    <Cloud className="w-4 h-4 mr-1" />
                    {deployment.cloudConnection.name} ({deployment.cloudConnection.region})
                  </div>
                  <div>
                    Created {new Date(deployment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Deployment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Deployment</h2>
            
            <div className="space-y-4">
              {/* Repository Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repository *
                </label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cloud Connection Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AWS Connection *
                </label>
                <select
                  value={selectedCloud}
                  onChange={(e) => setSelectedCloud(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an AWS connection</option>
                  {cloudConnections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Environment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment *
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              {/* Region Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a region</option>
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="eu-west-2">Europe (London)</option>
                  <option value="eu-central-1">Europe (Frankfurt)</option>
                  <option value="il-central-1">Israel (Tel Aviv)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createDeployment}
                disabled={creating || !selectedRepo || !selectedCloud || !environment || !region}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Create Deployment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentsPage; 