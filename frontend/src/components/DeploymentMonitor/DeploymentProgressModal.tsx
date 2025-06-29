import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  GitBranch,
  Cloud,
  Settings,
  Terminal,
  AlertCircle,
  Play,
  StopCircle
} from 'lucide-react';

interface DeploymentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  logs?: string[];
  error?: string;
}

interface DeploymentProgress {
  id: string;
  name: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'cancelled';
  environment: string;
  repository: {
    name: string;
    owner: string;
    branch: string;
    commitSha: string;
  };
  cloudConnection: {
    name: string;
    provider: string;
    region: string;
  };
  steps: DeploymentStep[];
  currentStep: number;
  progress: number;
  startTime: string;
  estimatedEndTime?: string;
  deploymentUrl?: string;
  githubActionsUrl?: string;
  terraformLogs?: string[];
  errorMessage?: string;
}

interface DeploymentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
}

const DeploymentProgressModal: React.FC<DeploymentProgressModalProps> = ({
  isOpen,
  onClose,
  deploymentId
}) => {
  const [deployment, setDeployment] = useState<DeploymentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'logs' | 'github'>('progress');

  useEffect(() => {
    if (!isOpen || !deploymentId) return;

    const pollDeploymentStatus = async () => {
      try {
        const response = await fetch(`/api/deployments/${deploymentId}/progress`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch deployment status');
        }

        const data = await response.json();
        setDeployment(data.deployment);
        setLoading(false);

        // Stop polling if deployment is complete
        if (data.deployment.status === 'deployed' || data.deployment.status === 'failed') {
          return;
        }

        // Continue polling every 3 seconds
        setTimeout(pollDeploymentStatus, 3000);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    pollDeploymentStatus();
  }, [isOpen, deploymentId]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'running':
        return 'border-blue-500 bg-blue-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'skipped':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const cancelDeployment = async () => {
    if (!confirm('Are you sure you want to cancel this deployment?')) return;

    try {
      await fetch(`/api/deployments/${deploymentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Update local state
      if (deployment) {
        setDeployment({ ...deployment, status: 'cancelled' });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {deployment?.name || 'Deployment Progress'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {deployment?.repository.owner}/{deployment?.repository.name} • {deployment?.environment}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {deployment?.githubActionsUrl && (
              <a
                href={deployment.githubActionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="View in GitHub Actions"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {deployment?.status === 'deploying' && (
              <button
                onClick={cancelDeployment}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Cancel deployment"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Progress
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'github'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              GitHub Actions
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
              <span>Loading deployment status...</span>
            </div>
          ) : error ? (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          ) : deployment ? (
            <>
              {activeTab === 'progress' && (
                <div className="space-y-6">
                  {/* Overall Progress */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                      <span className="text-sm text-gray-500">{deployment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${deployment.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Started {new Date(deployment.startTime).toLocaleTimeString()}</span>
                      {deployment.estimatedEndTime && (
                        <span>Estimated completion: {new Date(deployment.estimatedEndTime).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Deployment Steps */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900">Deployment Steps</h3>
                    {deployment.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`border rounded-lg p-4 ${getStepStatusColor(step.status)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStepIcon(step.status)}
                            <div>
                              <h4 className="font-medium text-gray-900">{step.name}</h4>
                              {step.status === 'running' && (
                                <p className="text-sm text-blue-600">In progress...</p>
                              )}
                              {step.error && (
                                <p className="text-sm text-red-600">{step.error}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {step.duration && (
                              <p className="text-sm text-gray-500">{formatDuration(step.duration)}</p>
                            )}
                            {step.startTime && (
                              <p className="text-xs text-gray-400">
                                {new Date(step.startTime).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Deployment Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Repository Info</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <GitBranch className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{deployment.repository.branch}</span>
                        </div>
                        <div className="text-gray-500 font-mono text-xs">
                          {deployment.repository.commitSha.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Cloud Connection</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <Cloud className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{deployment.cloudConnection.name}</span>
                        </div>
                        <div className="text-gray-500">
                          {deployment.cloudConnection.provider.toUpperCase()} • {deployment.cloudConnection.region}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Deployment Logs</h3>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-green-400 font-mono text-sm">
                      {deployment.terraformLogs?.map((log, index) => (
                        <div key={index} className="mb-1">
                          {log}
                        </div>
                      )) || 'No logs available yet...'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'github' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">GitHub Actions Integration</h3>
                  {deployment.githubActionsUrl ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <ExternalLink className="w-5 h-5 text-blue-500 mr-2" />
                          <div>
                            <h4 className="font-medium text-blue-900">GitHub Actions Workflow</h4>
                            <p className="text-sm text-blue-700">
                              This deployment is integrated with GitHub Actions for automated CI/CD.
                            </p>
                          </div>
                        </div>
                      </div>
                      <a
                        href={deployment.githubActionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in GitHub Actions
                      </a>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-600">
                        This deployment is not connected to GitHub Actions. 
                        Set up GitHub Actions integration for automated deployments.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Deployment not found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {deployment && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  deployment.status === 'deployed' ? 'bg-green-100 text-green-800' :
                  deployment.status === 'failed' ? 'bg-red-100 text-red-800' :
                  deployment.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {deployment.status}
                </span>
                {deployment.deploymentUrl && deployment.status === 'deployed' && (
                  <a
                    href={deployment.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Application
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentProgressModal; 