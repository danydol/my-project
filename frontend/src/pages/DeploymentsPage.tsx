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
  RefreshCw,
  Eye,
  Zap,
  X,
  FolderOpen
} from 'lucide-react';
import apiClient from '../services/api';
import DeploymentProgressModal from '../components/DeploymentMonitor/DeploymentProgressModal';
import GitHubActionsStatus from '../components/DeploymentMonitor/GitHubActionsStatus';
import DeploymentTriggerModal from '../components/DeploymentMonitor/DeploymentTriggerModal';
import { repositoryService } from '../services/repositoryService';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  status: string;
  multiCloud: boolean;
  tags: string[];
  icon?: string;
  color?: string;
  cloudConnections: any[];
  _count: {
    repositories: number;
    deployments: number;
    cloudConnections: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  private: boolean;
  githubId: string;
  fullName: string;
  projectId?: string;
}

interface CloudConnection {
  id: string;
  name: string;
  provider: string;
  region: string;
  status: string;
  projectId: string;
  description?: string;
  isDefault: boolean;
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
  githubActionsUrl?: string;
}

const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [cloudConnections, setCloudConnections] = useState<CloudConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedCloud, setSelectedCloud] = useState('');
  const [environment, setEnvironment] = useState('dev');
  const [region, setRegion] = useState('');
  
  // New state for monitoring
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showGitHubStatus, setShowGitHubStatus] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyOutput, setApplyOutput] = useState<string | null>(null);
  const [applyingDeploymentId, setApplyingDeploymentId] = useState<string | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [deployToCloud, setDeployToCloud] = useState(false);
  const [workflowOutput, setWorkflowOutput] = useState<string | null>(null);
  const [modalSelectedProject, setModalSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadDeployments();
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectResources(selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (projects.length === 1) {
      setSelectedProject(projects[0]);
      setModalSelectedProject(projects[0]);
      loadProjectResources(projects[0].id);
    }
  }, [projects]);

  const loadDeployments = async () => {
    try {
      const response = await apiClient.get('/deployments');
      setDeployments(response.data.deployments);
    } catch (error) {
      console.error('Error loading deployments:', error);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/projects');
      setProjects(response.data.projects || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectResources = async (projectId: string) => {
    try {
      // Load repositories for the selected project
      const reposResponse = await apiClient.get(`/projects/${projectId}/repositories`);
      setRepositories(reposResponse.data.repositories || []);

      // Load cloud connections for the selected project
      const connectionsResponse = await apiClient.get(`/projects/${projectId}/cloud-connections`);
      setCloudConnections(connectionsResponse.data.connections || []);
    } catch (error) {
      console.error('Error loading project resources:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedRepo('');
    setSelectedCloud('');
    setRegion('');
  };

  const handleModalProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId) || null;
    setModalSelectedProject(project);
    setSelectedProject(project);
    setSelectedRepo('');
    setSelectedCloud('');
    setRegion('');
    if (project) {
      loadProjectResources(project.id);
    } else {
      setRepositories([]);
      setCloudConnections([]);
    }
  };

  const createDeployment = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    if (!selectedRepo || !selectedCloud || !environment || !region) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const response = await apiClient.post('/deployments', {
        projectId: selectedProject.id,
        repositoryId: selectedRepo,
        cloudConnectionId: selectedCloud,
        environment,
        region
      });

      const newDeployment = response.data.deployment;
      setDeployments(prev => [newDeployment, ...prev]);
      setShowCreateModal(false);
      resetForm();
      
      // Auto-open progress modal for new deployment
      setSelectedDeployment(newDeployment);
      setShowProgressModal(true);
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

  const viewDeploymentProgress = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowProgressModal(true);
  };

  const viewGitHubStatus = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowGitHubStatus(true);
  };

  const triggerWorkflow = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowTriggerModal(true);
  };

  const handleWorkflowTriggered = (workflowRunId: string) => {
    // Refresh deployments to show updated status
    loadDeployments();
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

  const handleTerraformApply = async (deploymentId: string) => {
    setApplyingDeploymentId(deploymentId);
    setShowApplyModal(true);
    setApplyOutput(null);

    try {
      const response = await apiClient.post(`/deployments/${deploymentId}/terraform-apply`);
      setApplyOutput(response.data.output || 'Terraform apply completed successfully');
    } catch (error: any) {
      setApplyOutput(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setApplyingDeploymentId(null);
    }
  };

  const handleOpenWorkflowModal = (deployment: any) => {
    setSelectedRepoId(deployment.repository.id);
    setDeployToCloud(true);
    setShowWorkflowModal(true);
    setWorkflowOutput(null);
  };

  const handleTriggerWorkflow = async () => {
    if (!selectedRepoId) return;

    setWorkflowOutput('Triggering workflow...');
    try {
      const response = await apiClient.post(`/github/repository/${selectedRepoId}/trigger-workflow`, {
        workflow: 'deploy.yml',
        ref: 'main'
      });
      setWorkflowOutput(`Workflow triggered successfully! Run ID: ${response.data.runId}`);
    } catch (error: any) {
      setWorkflowOutput(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-600">Manage your application deployments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Deployment
        </button>
      </div>

      {/* Project Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedProject?.id === project.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FolderOpen className="w-5 h-5 text-gray-500 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">
                      {project._count.repositories} repos • {project._count.cloudConnections} cloud connections
                    </p>
                  </div>
                </div>
                {selectedProject?.id === project.id && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Deployment</h3>
              
              {!selectedProject ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Please select a project first</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project *
                    </label>
                    <select
                      value={modalSelectedProject?.id || ''}
                      onChange={e => handleModalProjectSelect(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository *
                    </label>
                    <select
                      value={selectedRepo}
                      onChange={e => setSelectedRepo(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={!modalSelectedProject}
                    >
                      <option value="">Select a repository</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.name} ({repo.language})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cloud Connection *
                    </label>
                    <select
                      value={selectedCloud}
                      onChange={e => setSelectedCloud(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={!modalSelectedProject}
                    >
                      <option value="">Select a cloud connection</option>
                      {cloudConnections.map((connection) => (
                        <option key={connection.id} value={connection.id}>
                          {connection.name} ({connection.provider} - {connection.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Environment *
                    </label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="dev">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region *
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      placeholder="e.g., us-east-1"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createDeployment}
                      disabled={creating || !modalSelectedProject || !selectedRepo || !selectedCloud || !region}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Creating...' : 'Create Deployment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deployments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {deployments.map((deployment) => (
            <li key={deployment.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {getStatusIcon(deployment.status)}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {deployment.name || `${deployment.repository.name} - ${deployment.environment}`}
                      </p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                        {deployment.status}
                      </span>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(deployment.environment)}`}>
                        {deployment.environment}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <GitBranch className="w-4 h-4 mr-1" />
                      {deployment.repository.name}
                      <Cloud className="w-4 h-4 ml-3 mr-1" />
                      {deployment.cloudConnection.name} ({deployment.cloudConnection.provider})
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => viewDeploymentProgress(deployment)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </button>
                  {deployment.status === 'deployed' && (
                    <button
                      onClick={() => handleTerraformApply(deployment.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Apply
                    </button>
                  )}
                  {deployment.status !== 'destroyed' && (
                    <button
                      onClick={() => destroyDeployment(deployment.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Destroy
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modals */}
      {selectedDeployment && showProgressModal && (
        <DeploymentProgressModal
          deploymentId={selectedDeployment.id}
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
        />
      )}

      {selectedDeployment && showGitHubStatus && (
        <GitHubActionsStatus
          repository={`${selectedDeployment.repository.owner}/${selectedDeployment.repository.name}`}
          deploymentId={selectedDeployment.id}
        />
      )}

      {selectedDeployment && showTriggerModal && (
        <DeploymentTriggerModal
          repository={`${selectedDeployment.repository.owner}/${selectedDeployment.repository.name}`}
          isOpen={showTriggerModal}
          onClose={() => setShowTriggerModal(false)}
          onWorkflowTriggered={handleWorkflowTriggered}
        />
      )}

      {/* Terraform Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Terraform Apply Output</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
              {applyingDeploymentId ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running terraform apply...
                </div>
              ) : (
                <pre>{applyOutput || 'No output available'}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Trigger GitHub Workflow</h3>
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
                <pre>{workflowOutput || 'Ready to trigger workflow...'}</pre>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowWorkflowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleTriggerWorkflow}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Trigger Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentsPage; 