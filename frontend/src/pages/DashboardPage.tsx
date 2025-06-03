import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderIcon,
  CloudIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const stats = [
    {
      name: 'Total Repositories',
      value: '12',
      change: '+2',
      changeType: 'increase',
      icon: FolderIcon,
    },
    {
      name: 'Active Deployments',
      value: '8',
      change: '+1',
      changeType: 'increase',
      icon: CloudIcon,
    },
    {
      name: 'Success Rate',
      value: '98.5%',
      change: '+0.5%',
      changeType: 'increase',
      icon: ChartBarIcon,
    },
    {
      name: 'Monthly Deploys',
      value: '47',
      change: '+12',
      changeType: 'increase',
      icon: ArrowTrendingUpIcon,
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'deployment',
      status: 'success',
      message: 'Successfully deployed my-app to production',
      timestamp: '2 minutes ago',
    },
    {
      id: 2,
      type: 'analysis',
      status: 'completed',
      message: 'Repository analysis completed for react-dashboard',
      timestamp: '15 minutes ago',
    },
    {
      id: 3,
      type: 'deployment',
      status: 'warning',
      message: 'Deployment to staging completed with warnings',
      timestamp: '1 hour ago',
    },
    {
      id: 4,
      type: 'repository',
      status: 'success',
      message: 'New repository connected: e-commerce-api',
      timestamp: '3 hours ago',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your deployments.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <p className="ml-2 text-sm font-medium text-green-600">{stat.change}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/repositories"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <PlusIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Connect Repository</p>
                <p className="text-sm text-gray-600">Add a new GitHub repository to analyze</p>
              </div>
            </Link>
            <Link
              to="/deployments"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <CloudIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">New Deployment</p>
                <p className="text-sm text-gray-600">Deploy an analyzed repository to AWS</p>
              </div>
            </Link>
            <Link
              to="/analytics"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <ChartBarIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-600">Monitor deployment metrics and insights</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              to="/activity"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              View all activity →
            </Link>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mt-8 card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FolderIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">1. Connect Repository</h3>
            <p className="text-sm text-gray-600">
              Link your GitHub repositories to start analyzing your codebase
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">2. AI Analysis</h3>
            <p className="text-sm text-gray-600">
              Our AI analyzes your code and suggests optimal deployment strategies
            </p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CloudIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">3. Deploy to AWS</h3>
            <p className="text-sm text-gray-600">
              Automatically generate and deploy infrastructure to AWS with Kubernetes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 