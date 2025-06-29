import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  Cloud,
  GitBranch,
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Users,
  Globe
} from 'lucide-react';

interface DeploymentMetrics {
  total: number;
  active: number;
  inProgress: number;
  failed: number;
  successRate: number;
  averageDeploymentTime: number;
  deploymentsThisWeek: number;
  deploymentsThisMonth: number;
}

interface RecentDeployment {
  id: string;
  name: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'cancelled';
  environment: string;
  repository: string;
  startTime: string;
  duration?: number;
  deploymentUrl?: string;
}

interface GitHubWorkflowSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastRun: {
    status: string;
    conclusion?: string;
    startedAt: string;
  } | null;
}

const DeploymentDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null);
  const [recentDeployments, setRecentDeployments] = useState<RecentDeployment[]>([]);
  const [githubSummary, setGitHubSummary] = useState<GitHubWorkflowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load metrics
      const metricsResponse = await fetch(`/api/deployments/metrics?timeframe=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
      }

      // Load recent deployments
      const deploymentsResponse = await fetch('/api/deployments?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        setRecentDeployments(deploymentsData.deployments);
      }

      // Load GitHub summary
      const githubResponse = await fetch('/api/github/workflows/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        setGitHubSummary(githubData.summary);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'deploying':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-800';
      case 'deploying':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployment Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of your deployments and infrastructure</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deployments</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
                <p className="text-xs text-gray-500">
                  {metrics.deploymentsThisWeek} this week
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Deployments</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.active}</p>
                <p className="text-xs text-gray-500">
                  {metrics.inProgress} in progress
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.successRate}%</p>
                <p className="text-xs text-gray-500">
                  {metrics.failed} failed
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Deployment Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(metrics.averageDeploymentTime)}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics.deploymentsThisMonth} this month
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deployments */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Deployments</h2>
          </div>
          <div className="p-6">
            {recentDeployments.length === 0 ? (
              <div className="text-center py-8">
                <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent deployments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDeployments.map((deployment) => (
                  <div key={deployment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <h3 className="font-medium text-gray-900">{deployment.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                            {deployment.status}
                          </span>
                          <span className="text-sm text-gray-500">{deployment.environment}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatTimeAgo(deployment.startTime)}</p>
                      {deployment.duration && (
                        <p className="text-xs text-gray-400">{formatDuration(deployment.duration)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GitHub Actions Summary */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">GitHub Actions</h2>
          </div>
          <div className="p-6">
            {githubSummary ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{githubSummary.totalRuns}</div>
                    <div className="text-sm text-gray-500">Total Runs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{githubSummary.successfulRuns}</div>
                    <div className="text-sm text-gray-500">Successful</div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Success Rate</span>
                    <span className="text-sm text-gray-500">
                      {githubSummary.totalRuns > 0 
                        ? Math.round((githubSummary.successfulRuns / githubSummary.totalRuns) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${githubSummary.totalRuns > 0 
                          ? (githubSummary.successfulRuns / githubSummary.totalRuns) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Last Run */}
                {githubSummary.lastRun && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Last Workflow Run</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(githubSummary.lastRun.status)}
                        <span className="text-sm text-gray-700">
                          {githubSummary.lastRun.conclusion || githubSummary.lastRun.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(githubSummary.lastRun.startedAt)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Average Duration */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Average Duration</span>
                    <span className="text-sm text-gray-500">
                      {formatDuration(githubSummary.averageDuration)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No GitHub Actions data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Play className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium">New Deployment</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Activity className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium">View Logs</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
              <span className="font-medium">Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentDashboard; 