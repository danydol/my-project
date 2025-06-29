import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Settings, 
  Cloud, 
  GitBranch, 
  Globe,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import apiClient from '../../services/api';

interface DeploymentTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: string;
  onWorkflowTriggered?: (workflowRunId: string) => void;
}

interface CloudConnection {
  id: string;
  name: string;
  provider: string;
  region: string;
}

const DeploymentTriggerModal: React.FC<DeploymentTriggerModalProps> = ({
  isOpen,
  onClose,
  repository,
  onWorkflowTriggered
}) => {
  const [loading, setLoading] = useState(false);
  const [cloudConnections, setCloudConnections] = useState<CloudConnection[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('deploy.yml');
  const [selectedEnvironment, setSelectedEnvironment] = useState('staging');
  const [selectedCloudConnection, setSelectedCloudConnection] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('il-central-1');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const workflows = [
    { id: 'deploy.yml', name: 'Deploy Application', description: 'Full application deployment with testing and security checks' },
    { id: 'infrastructure.yml', name: 'Infrastructure Provisioning', description: 'Terraform-based infrastructure management' },
    { id: 'test.yml', name: 'Test and Quality Assurance', description: 'Comprehensive testing and quality checks' },
    { id: 'dependencies.yml', name: 'Dependency Management', description: 'Dependency updates and security scanning' }
  ];

  const environments = [
    { id: 'staging', name: 'Staging', description: 'Pre-production environment for testing' },
    { id: 'production', name: 'Production', description: 'Live production environment' }
  ];

  const regions = [
    { id: 'il-central-1', name: 'Israel Central (il-central-1)', description: 'Israel Central Region' },
    { id: 'us-east-1', name: 'US East (us-east-1)', description: 'US East (N. Virginia)' },
    { id: 'us-west-2', name: 'US West (us-west-2)', description: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'Europe West (eu-west-1)', description: 'Europe (Ireland)' },
    { id: 'ap-southeast-1', name: 'Asia Pacific (ap-southeast-1)', description: 'Asia Pacific (Singapore)' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchCloudConnections();
    }
  }, [isOpen]);

  const fetchCloudConnections = async () => {
    try {
      const response = await apiClient.get('/cloud/connections');
      if (response.data.success) {
        setCloudConnections(response.data.connections);
        if (response.data.connections.length > 0) {
          setSelectedCloudConnection(response.data.connections[0].id);
          setSelectedRegion(response.data.connections[0].region);
        }
      }
    } catch (error) {
      console.error('Error fetching cloud connections:', error);
    }
  };

  const triggerWorkflow = async () => {
    if (!selectedCloudConnection) {
      setError('Please select a cloud connection');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const inputs: any = {
        environment: selectedEnvironment,
        cloud_connection_id: selectedCloudConnection,
        region: selectedRegion
      };

      // Add workflow-specific inputs
      if (selectedWorkflow === 'dependencies.yml') {
        inputs.action = 'check';
        inputs.scope = 'all';
      } else if (selectedWorkflow === 'test.yml') {
        inputs.test_type = 'all';
        inputs.test_environment = selectedEnvironment;
      } else if (selectedWorkflow === 'infrastructure.yml') {
        inputs.action = 'plan';
      }

      const response = await apiClient.post('/github/workflows/trigger', {
        repository,
        workflow: selectedWorkflow,
        branch: selectedBranch,
        inputs
      });

      if (response.data.success) {
        setSuccess(`Workflow triggered successfully! Run ID: ${response.data.workflow_run_id}`);
        onWorkflowTriggered?.(response.data.workflow_run_id);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(response.data.error || 'Failed to trigger workflow');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to trigger workflow');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Play className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Trigger GitHub Actions Workflow</h2>
              <p className="text-sm text-gray-600">{repository}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Settings className="w-4 h-4 inline mr-2" />
              Select Workflow
            </label>
            <div className="grid grid-cols-1 gap-3">
              {workflows.map((workflow) => (
                <label
                  key={workflow.id}
                  className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="workflow"
                    value={workflow.id}
                    checked={selectedWorkflow === workflow.id}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                      {selectedWorkflow === workflow.id && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Environment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Globe className="w-4 h-4 inline mr-2" />
              Environment
            </label>
            <div className="grid grid-cols-2 gap-3">
              {environments.map((env) => (
                <label
                  key={env.id}
                  className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEnvironment === env.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={env.id}
                    checked={selectedEnvironment === env.id}
                    onChange={(e) => setSelectedEnvironment(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{env.name}</h4>
                      {selectedEnvironment === env.id && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{env.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Cloud Connection Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Cloud className="w-4 h-4 inline mr-2" />
              Cloud Connection
            </label>
            <select
              value={selectedCloudConnection}
              onChange={(e) => {
                setSelectedCloudConnection(e.target.value);
                const connection = cloudConnections.find(c => c.id === e.target.value);
                if (connection) {
                  setSelectedRegion(connection.region);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a cloud connection</option>
              {cloudConnections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} ({connection.provider} - {connection.region})
                </option>
              ))}
            </select>
          </div>

          {/* Region Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Globe className="w-4 h-4 inline mr-2" />
              AWS Region
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <GitBranch className="w-4 h-4 inline mr-2" />
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="main">main</option>
              <option value="develop">develop</option>
              <option value="feature-by-dan">feature-by-dan</option>
            </select>
          </div>

          {/* GitHub Actions Link */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">View in GitHub Actions</h4>
                <p className="text-sm text-gray-600">Monitor workflow execution in real-time</p>
              </div>
              <a
                href={`https://github.com/${repository}/actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Actions
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={triggerWorkflow}
            disabled={loading || !selectedCloudConnection}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Trigger Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentTriggerModal; 