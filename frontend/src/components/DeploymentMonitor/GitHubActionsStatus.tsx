import React, { useState, useEffect } from 'react';
import { 
  GitHub, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  AlertCircle,
  Play,
  SkipForward,
  GitBranch,
  GitCommit
} from 'lucide-react';

interface GitHubWorkflow {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  created_at: string;
  updated_at: string;
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
        return <SkipForward className="w-4 h-4 text-gray-500" />;
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

  const triggerWorkflow = async (workflowName: string) => {
    try {
      const response = await fetch('/api/github/workflows/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          repository,
          workflow: workflowName,
          branch,
          inputs: {
            environment: 'staging',
            cloud_connection_id: 'your-connection-id' // This should come from props or context
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger workflow');
      }

      // Refresh workflows after triggering
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GitHub className="w-6 h-6 text-gray-600" />
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
          <GitHub className="w-6 h-6 text-gray-600" />
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
            <GitHub className="w-6 h-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">GitHub Actions</h3>
              <p className="text-sm text-gray-600">{repository} • {branch}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => triggerWorkflow('deploy.yml')}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 mr-1" />
              Trigger Deploy
            </button>
            <a
              href={`https://github.com/${repository}/actions`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
            <GitHub className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h4>
            <p className="text-gray-600 mb-4">
              No GitHub Actions workflows have been run for this repository yet.
            </p>
            <button
              onClick={() => triggerWorkflow('deploy.yml')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Run First Deployment
            </button>
          </div>
        ) : (
          workflows.map((workflow) => (
            <div
              key={workflow.id}
              className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedWorkflow?.id === workflow.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(workflow.status, workflow.conclusion)}
                  <div>
                    <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status, workflow.conclusion)}`}>
                        {workflow.conclusion || workflow.status}
                      </span>
                      <div className="flex items-center text-xs text-gray-500">
                        <GitBranch className="w-3 h-3 mr-1" />
                        {workflow.head_branch}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <GitCommit className="w-3 h-3 mr-1" />
                        {workflow.head_sha.substring(0, 8)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {formatDuration(workflow.created_at, workflow.updated_at)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Workflow Details */}
      {selectedWorkflow && (
        <div className="border-t bg-gray-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Workflow Details</h4>
              <a
                href={selectedWorkflow.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View on GitHub
              </a>
            </div>

            {/* Jobs */}
            {selectedWorkflow.jobs && selectedWorkflow.jobs.length > 0 && (
              <div className="space-y-3">
                {selectedWorkflow.jobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status, job.conclusion)}
                        <h5 className="font-medium text-gray-900">{job.name}</h5>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status, job.conclusion)}`}>
                        {job.conclusion || job.status}
                      </span>
                    </div>

                    {/* Steps */}
                    {job.steps && job.steps.length > 0 && (
                      <div className="space-y-2">
                        {job.steps.map((step) => (
                          <div key={step.number} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(step.status, step.conclusion)}
                              <span className="text-gray-700">{step.name}</span>
                            </div>
                            {step.started_at && (
                              <span className="text-gray-500">
                                {step.completed_at 
                                  ? formatDuration(step.started_at, step.completed_at)
                                  : formatDuration(step.started_at)
                                }
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No jobs available */}
            {(!selectedWorkflow.jobs || selectedWorkflow.jobs.length === 0) && (
              <div className="text-center py-4">
                <p className="text-gray-600">Job details not available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubActionsStatus; 