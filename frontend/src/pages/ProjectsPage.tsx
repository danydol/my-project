import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import ProjectCard from '../components/Projects/ProjectCard';
import CloudConnectionGrid from '../components/CloudConnections/CloudConnectionGrid';
import ConnectCloudModal from '../components/CloudConnections/ConnectCloudModal';
import ProjectRepositoryGrid from '../components/Projects/ProjectRepositoryGrid';
import CreateProjectModal from '../components/Projects/CreateProjectModal';
import apiClient from '../services/api';

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

interface CloudConnection {
  id: string;
  provider: string;
  name: string;
  status: string;
  region?: string;
  description?: string;
  isDefault: boolean;
  lastValidated?: string;
  errorMessage?: string;
}

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [cloudConnections, setCloudConnections] = useState<CloudConnection[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCloudConnections, setShowCloudConnections] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'repositories' | 'cloud'>('repositories');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
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

  const fetchCloudConnections = async (projectId: string) => {
    try {
      const response = await apiClient.get(`/cloud/connections/${projectId}`);
      setCloudConnections(response.data.connections || []);
    } catch (err: any) {
      console.error('Failed to fetch cloud connections:', err);
      setCloudConnections([]);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    fetchCloudConnections(project.id);
    setShowCloudConnections(true);
  };

  const handleCreateProject = () => {
    setShowCreateProject(true);
  };

  const handleProjectCreated = (newProject: Project) => {
    try {
      console.log('New project created:', newProject);
      setProjects(prev => {
        const updated = [newProject, ...prev];
        console.log('Updated projects list:', updated);
        return updated;
      });
      // Show success message or toast notification here if desired
    } catch (error) {
      console.error('Error handling project creation:', error);
      // Don't break the app, just log the error
    }
  };

  const handleConnect = (provider: string) => {
    setSelectedProvider(provider);
    setShowConnectModal(true);
  };

  const handleCloudConnect = async (connectionData: any) => {
    try {
      const response = await apiClient.post('/cloud/connections', connectionData);
      if (response.data.success) {
        // Refresh cloud connections
        if (selectedProject) {
          await fetchCloudConnections(selectedProject.id);
        }
        alert('✅ Cloud connection created successfully!');
      }
    } catch (error: any) {
      console.error('Failed to create cloud connection:', error);
      alert(`❌ Failed to create connection: ${error.response?.data?.error || error.message}`);
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleEdit = (connection: CloudConnection) => {
    console.log('Edit connection:', connection);
    // TODO: Implement connection editing modal
    alert('Edit functionality coming soon!');
  };

  const handleDelete = async (connection: CloudConnection) => {
    if (!window.confirm(`Are you sure you want to delete the connection "${connection.name}"?`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/cloud/connections/${connection.id}`);
      if (response.data.success) {
        // Refresh cloud connections
        if (selectedProject) {
          await fetchCloudConnections(selectedProject.id);
        }
        alert('✅ Cloud connection deleted successfully!');
      }
    } catch (error: any) {
      console.error('Failed to delete cloud connection:', error);
      alert(`❌ Failed to delete connection: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleTest = async (connection: CloudConnection) => {
    try {
      const response = await apiClient.post(`/cloud/connections/${connection.id}/test`);
      if (response.data.success && response.data.valid) {
        alert('✅ Connection test successful!');
        // Refresh cloud connections to update status
        if (selectedProject) {
          await fetchCloudConnections(selectedProject.id);
        }
      } else {
        alert(`❌ Connection test failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Failed to test cloud connection:', error);
      alert(`❌ Connection test failed: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  if (showCloudConnections && selectedProject) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCloudConnections(false);
            }}
            className="text-blue-600 hover:text-blue-500 mb-4"
            style={{ 
              zIndex: 1000, 
              position: 'relative',
              display: 'block',
              padding: '8px 0',
              margin: '0 0 16px 0'
            }}
          >
            ← Back to Projects
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedProject.name}
              </h1>
              <p className="text-gray-600">
                Manage repositories and cloud connections for your project
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('repositories')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'repositories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Repositories
              </button>
              <button
                onClick={() => setActiveTab('cloud')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cloud'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cloud Connections
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'repositories' ? (
            <ProjectRepositoryGrid 
              projectId={selectedProject.id}
              onRepositoryUpdate={() => {
                // Optionally refresh project data or show success message
              }}
            />
          ) : (
            <CloudConnectionGrid
              connections={cloudConnections}
              onConnect={handleConnect}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          )}
        </div>

        {/* ConnectCloudModal - moved here so it's available in cloud connections view */}
        <ConnectCloudModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnect={handleCloudConnect}
          provider={selectedProvider}
          projectId={selectedProject?.id || ''}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">
              Organize your repositories and manage multi-cloud deployments
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <PlusIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first project to organize your repositories and deployments.
          </p>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} onClick={() => handleProjectSelect(project)} className="cursor-pointer">
              <ProjectCard
                project={project}
                onEdit={(project) => console.log('Edit project:', project)}
                onDelete={(project) => console.log('Delete project:', project)}
              />
            </div>
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* ConnectCloudModal - also available in main projects view */}
      <ConnectCloudModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleCloudConnect}
        provider={selectedProvider}
        projectId={selectedProject?.id || ''}
      />
    </div>
  );
};

export default ProjectsPage; 