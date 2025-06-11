import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import {
  UserCircleIcon,
  KeyIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface UserSettings {
  username: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  githubConnected: boolean;
  githubScopes?: string[];
  createdAt: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/auth/me');
      const userData = response.data.user;
      
      // Check GitHub scopes by making a test API call
      let githubScopes: string[] = [];
      let githubConnected = false;
      
      if (userData.githubAccessToken) {
        try {
          const githubResponse = await apiClient.get('/github/repositories/unconnected-fresh');
          githubConnected = true;
          // Extract scopes from response headers if available
          // For now, we'll infer from the response
          if (githubResponse.data.repositories && githubResponse.data.repositories.length > 0) {
            const hasPrivateRepos = githubResponse.data.repositories.some((repo: any) => repo.private);
            githubScopes = hasPrivateRepos ? ['user:email', 'repo', 'admin:repo_hook'] : ['user:email'];
          }
        } catch (error) {
          githubConnected = false;
        }
      }

      setSettings({
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName,
        avatar: userData.avatar,
        githubConnected,
        githubScopes,
        createdAt: userData.createdAt
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch user settings');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubReconnect = async () => {
    try {
      setReconnecting(true);
      setError(null);
      
      // Redirect to GitHub re-authentication
      window.location.href = '/api/auth/github/reauth';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reconnect GitHub');
      setReconnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      setError(null);
      await apiClient.post('/auth/github/disconnect');
      setSuccess('GitHub disconnected successfully');
      await fetchUserSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect GitHub');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Failed to load settings</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const hasFullGitHubAccess = settings.githubScopes?.includes('repo');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="mt-2 text-gray-600">Manage your account settings and integrations</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-4">
                  {settings.avatar ? (
                    <img
                      className="h-16 w-16 rounded-full"
                      src={settings.avatar}
                      alt={settings.username}
                    />
                  ) : (
                    <UserCircleIcon className="h-16 w-16 text-gray-400" />
                  )}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{settings.displayName || settings.username}</h4>
                    <p className="text-gray-600">@{settings.username}</p>
                    {settings.email && (
                      <p className="text-gray-600">{settings.email}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Member since {new Date(settings.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* GitHub Integration */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">GitHub Integration</h3>
                  {settings.githubConnected && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected
                    </span>
                  )}
                </div>
              </div>
              <div className="px-6 py-4">
                {settings.githubConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">GitHub Account</h4>
                        <p className="text-sm text-gray-600">Connected to @{settings.username}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasFullGitHubAccess ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>

                    {!hasFullGitHubAccess && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Limited Access</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              Your GitHub connection doesn't have access to private repositories. 
                              Reconnect to grant full access.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={handleGitHubReconnect}
                        disabled={reconnecting}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`h-4 w-4 mr-2 ${reconnecting ? 'animate-spin' : ''}`} />
                        {reconnecting ? 'Reconnecting...' : 'Reconnect GitHub'}
                      </button>
                      <button
                        onClick={handleDisconnectGitHub}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Connect GitHub</h4>
                    <p className="text-gray-600 mb-4">
                      Connect your GitHub account to access repositories and enable deployments.
                    </p>
                    <button
                      onClick={handleGitHubReconnect}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <KeyIcon className="h-4 w-4 mr-2" />
                      Connect GitHub
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Security</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">Two-Factor Auth</span>
                    </div>
                    <span className="text-sm text-gray-500">Not enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">API Keys</span>
                    </div>
                    <span className="text-sm text-gray-500">0 active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">Email Notifications</span>
                    </div>
                    <span className="text-sm text-gray-500">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">Deployment Alerts</span>
                    </div>
                    <span className="text-sm text-gray-500">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 