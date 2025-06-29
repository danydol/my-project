import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Settings,
  Eye,
  X
} from 'lucide-react';
import DeploymentTriggerModal from './DeploymentTriggerModal';

interface GitHubWorkflow {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  head_branch: string;
  head_sha: string;
  html_url: string;
  jobs?: GitHubJob[];
}

interface GitHubJob {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  started_at?: string;
  completed_at?: string;
  steps: GitHubStep[];
}

interface GitHubStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  started_at?: string;
  completed_at?: string;
  number: number;
}

interface GitHubActionsStatusProps {
  repository: string;
  branch?: string;
  commitSha?: string;
  deploymentId?: string;
}

const GitHubActionsStatus: React.FC<GitHubActionsStatusProps> = ({
  repository,
  branch = 'main',
  commitSha,
  deploymentId
}) => {
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<GitHubWorkflow | null>(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!repository) return;

    const fetchWorkflows = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/github/workflows?repo=${repository}&branch=${branch}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch GitHub workflows');
        }

        const data = await response.json();
        setWorkflows(data.workflows);
        
        // Auto-select the latest workflow if there's a deployment
        if (deploymentId && data.workflows.length > 0) {
          setSelectedWorkflow(data.workflows[0]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchWorkflows, 10000);
    return () => clearInterval(interval);
  }, [repository, branch, deploymentId]);

  const getStatusIcon = (status: string, conclusion?: string) => {
    if (status === 'in_progress') {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    if (status === 'completed') {
      if (conclusion === 'success') {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      } else if (conclusion === 'failure') {
        return <XCircle className="w-4 h-4 text-red-500" />;
      } else if (conclusion === 'cancelled') {
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      }
    }
    
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = (status: string, conclusion?: string) => {
    if (status === 'in_progress') {
      return 'bg-blue-100 text-blue-800';
    }
    
    if (status === 'completed') {
      if (conclusion === 'success') {
        return 'bg-green-100 text-green-800';
      } else if (conclusion === 'failure') {
        return 'bg-red-100 text-red-800';
      } else if (conclusion === 'cancelled') {
        return 'bg-gray-100 text-gray-800';
      }
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const refreshWorkflows = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/github/workflows?repo=${repository}&branch=${branch}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleWorkflowTriggered = (workflowRunId: string) => {
    // Refresh workflows after triggering
    setTimeout(() => {
      refreshWorkflows();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranch className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">GitHub Actions</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-2" />
          <span>Loading workflows...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranch className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">GitHub Actions</h3>
        </div>
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitBranch className="w-6 h-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">GitHub Actions</h3>
              <p className="text-sm text-gray-600">{repository} • {branch}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshWorkflows}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh workflows"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowTriggerModal(true)}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Zap className="w-4 h-4 mr-1" />
              Trigger Workflow
            </button>
            <a
              href={`https://github.com/${repository}/actions`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View in GitHub Actions"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="divide-y divide-gray-200">
        {workflows.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h4>
            <p className="text-gray-600 mb-4">
              No GitHub Actions workflows have been run for this repository yet.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowTriggerModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Run First Deployment
              </button>
              <button
                onClick={() => setShowTriggerModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Zap className="w-4 h-4 mr-2" />
                Trigger Workflow
              </button>
            </div>
          </div>
        ) : (
          workflows.map((workflow) => (
            <div key={workflow.id} className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {workflow.status === 'completed' && workflow.conclusion === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {workflow.status === 'completed' && workflow.conclusion === 'failure' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    {workflow.status === 'in_progress' && (
                      <Clock className="w-5 h-5 text-blue-500" />
                    )}
                    {workflow.status === 'queued' && (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                    <p className="text-sm text-gray-600">
                      Branch: {workflow.head_branch} • 
                      {workflow.status === 'completed' 
                        ? ` ${workflow.conclusion} • ${workflow.completed_at ? new Date(workflow.completed_at).toLocaleString() : 'N/A'}`
                        : ` ${workflow.status} • ${new Date(workflow.created_at).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowTriggerModal(true)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Trigger new workflow"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <a
                    href={workflow.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View in GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Jobs Summary */}
              {workflow.jobs && workflow.jobs.length > 0 && (
                <div className="ml-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {workflow.jobs.slice(0, 3).map((job) => (
                      <div key={job.id} className="flex items-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          job.status === 'completed' && job.conclusion === 'success' ? 'bg-green-500' :
                          job.status === 'completed' && job.conclusion === 'failure' ? 'bg-red-500' :
                          job.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-gray-700">{job.name}</span>
                      </div>
                    ))}
                    {workflow.jobs.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{workflow.jobs.length - 3} more jobs
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Workflow Details</h2>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Workflow Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedWorkflow.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        selectedWorkflow.status === 'completed' && selectedWorkflow.conclusion === 'success' ? 'text-green-600' :
                        selectedWorkflow.status === 'completed' && selectedWorkflow.conclusion === 'failure' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {selectedWorkflow.status} {selectedWorkflow.conclusion && `(${selectedWorkflow.conclusion})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Branch:</span>
                      <span className="font-medium">{selectedWorkflow.head_branch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{new Date(selectedWorkflow.created_at).toLocaleString()}</span>
                    </div>
                    {selectedWorkflow.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium">{new Date(selectedWorkflow.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Jobs */}
                {selectedWorkflow.jobs && selectedWorkflow.jobs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Jobs</h3>
                    <div className="space-y-3">
                      {selectedWorkflow.jobs.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{job.name}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                job.status === 'completed' && job.conclusion === 'success' ? 'bg-green-100 text-green-800' :
                                job.status === 'completed' && job.conclusion === 'failure' ? 'bg-red-100 text-red-800' :
                                job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {job.status} {job.conclusion && `(${job.conclusion})`}
                              </span>
                            </div>
                          </div>
                          
                          {/* Steps */}
                          {job.steps && job.steps.length > 0 && (
                            <div className="ml-4 space-y-2">
                              {job.steps.map((step, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${
                                    step.status === 'completed' && step.conclusion === 'success' ? 'bg-green-500' :
                                    step.status === 'completed' && step.conclusion === 'failure' ? 'bg-red-500' :
                                    step.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                                  }`} />
                                  <span className="text-gray-700">{step.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedWorkflow(null);
                      setShowTriggerModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Trigger New Workflow
                  </button>
                  <a
                    href={selectedWorkflow.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Trigger Modal */}
      {showTriggerModal && (
        <DeploymentTriggerModal
          isOpen={showTriggerModal}
          onClose={() => setShowTriggerModal(false)}
          repository={repository}
          onWorkflowTriggered={handleWorkflowTriggered}
        />
      )}
    </div>
  );
};

export default GitHubActionsStatus; 