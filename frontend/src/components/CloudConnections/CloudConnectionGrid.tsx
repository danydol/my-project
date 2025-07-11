import React, { useState } from 'react';
import './CloudConnectionGrid.css';
import EC2InstancesModal from './EC2InstancesModal';

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

interface CloudConnectionGridProps {
  connections: CloudConnection[];
  onConnect: (provider: string) => void;
  onEdit: (connection: CloudConnection) => void;
  onDelete: (connection: CloudConnection) => void;
  onTest: (connection: CloudConnection) => void;
}

const CloudConnectionGrid: React.FC<CloudConnectionGridProps> = ({
  connections,
  onConnect,
  onEdit,
  onDelete,
  onTest
}) => {
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [showEC2Modal, setShowEC2Modal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<CloudConnection | null>(null);

  const providers = [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      icon: '☁️',
      color: '#FF9900',
      description: 'Deploy to AWS with EC2, EKS, Lambda, and more'
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      icon: '🌐',
      color: '#4285F4',
      description: 'Deploy to GCP with GKE, Cloud Run, and App Engine'
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      icon: '🔷',
      color: '#0078D4',
      description: 'Deploy to Azure with AKS, Container Instances, and App Service'
    }
  ];

  const getProviderConnections = (providerId: string) => {
    return connections.filter(conn => conn.provider === providerId);
  };

  const getConnectionStatus = (connections: CloudConnection[]): 'not-connected' | 'connected' | 'partial' | 'error' | 'pending' => {
    if (connections.length === 0) return 'not-connected';
    const connectedCount = connections.filter(conn => conn.status === 'connected').length;
    const pendingCount = connections.filter(conn => conn.status === 'pending').length;
    
    if (pendingCount > 0) return 'pending';
    if (connectedCount === connections.length) return 'connected';
    if (connectedCount > 0) return 'partial';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'partial': return '#FF9800';
      case 'error': return '#F44336';
      case 'pending': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const handleTestConnection = async (connection: CloudConnection) => {
    setTestingConnections(prev => new Set(prev).add(connection.id));
    try {
      await onTest(connection);
    } finally {
      setTestingConnections(prev => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const handleViewEC2Instances = (connection: CloudConnection) => {
    setSelectedConnection(connection);
    setShowEC2Modal(true);
  };

  const handleCloseEC2Modal = () => {
    setShowEC2Modal(false);
    setSelectedConnection(null);
  };

  const formatLastValidated = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <>
      <div className="cloud-connection-grid">
        <div className="grid-header">
          <h2>Cloud Connections</h2>
          <p>Connect your project to cloud providers for seamless deployments</p>
        </div>

        <div className="provider-grid">
          {providers.map(provider => {
            const providerConnections = getProviderConnections(provider.id);
            const status = getConnectionStatus(providerConnections);
            const statusColor = getStatusColor(status);

            return (
              <div 
                key={provider.id} 
                className={`provider-card ${status}`}
                style={{ borderColor: statusColor }}
              >
                <div className="provider-header">
                  <div className="provider-info">
                    <div 
                      className="provider-icon"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.icon}
                    </div>
                    <div>
                      <h3>{provider.name}</h3>
                      <p className="provider-description">{provider.description}</p>
                    </div>
                  </div>
                  <div className="status-indicator">
                    <div 
                      className={`status-dot ${status}`}
                      style={{ backgroundColor: statusColor }}
                    ></div>
                    <span className="status-text">
                      {status === 'not-connected' && 'Not Connected'}
                      {status === 'connected' && `Connected (${providerConnections.length})`}
                      {status === 'partial' && `Partial (${providerConnections.filter(c => c.status === 'connected').length}/${providerConnections.length})`}
                      {status === 'error' && 'Connection Error'}
                      {status === 'pending' && 'Connecting...'}
                    </span>
                  </div>
                </div>

                {providerConnections.length === 0 ? (
                  <div className="no-connections">
                    <p>No connections configured</p>
                    <button 
                      className="connect-button"
                      onClick={() => onConnect(provider.id)}
                    >
                      Connect to {provider.name}
                    </button>
                  </div>
                ) : (
                  <div className="connections-list">
                    {providerConnections.map(connection => (
                      <div key={connection.id} className={`connection-item ${connection.status}`}>
                        <div className="connection-info">
                          <div className="connection-header">
                            <h4>{connection.name}</h4>
                            {connection.isDefault && (
                              <span className="default-badge">Default</span>
                            )}
                            <div 
                              className={`connection-status ${connection.status}`}
                              style={{ backgroundColor: getStatusColor(connection.status) }}
                            >
                              {connection.status}
                            </div>
                          </div>
                          
                          {connection.description && (
                            <p className="connection-description">{connection.description}</p>
                          )}
                          
                          <div className="connection-meta">
                            {connection.region && (
                              <span className="meta-item">📍 {connection.region}</span>
                            )}
                            <span className="meta-item">
                              🕒 {formatLastValidated(connection.lastValidated)}
                            </span>
                          </div>

                          {connection.errorMessage && (
                            <div className="error-message">
                              ⚠️ {connection.errorMessage}
                            </div>
                          )}
                        </div>

                        <div className="connection-actions">
                          {connection.provider === 'aws' && connection.status === 'connected' && (
                            <button 
                              className="action-button ec2"
                              onClick={() => handleViewEC2Instances(connection)}
                            >
                              🖥️ EC2 Instances
                            </button>
                          )}
                          <button 
                            className="action-button test"
                            onClick={() => handleTestConnection(connection)}
                            disabled={testingConnections.has(connection.id)}
                          >
                            {testingConnections.has(connection.id) ? '🔄' : '🧪'} Test
                          </button>
                          <button 
                            className="action-button edit"
                            onClick={() => onEdit(connection)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="action-button delete"
                            onClick={() => onDelete(connection)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      className="add-connection-button"
                      onClick={() => onConnect(provider.id)}
                    >
                      + Add Connection
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* EC2 Instances Modal */}
      {selectedConnection && (
        <EC2InstancesModal
          isOpen={showEC2Modal}
          onClose={handleCloseEC2Modal}
          connectionId={selectedConnection.id}
          connectionName={selectedConnection.name}
        />
      )}
    </>
  );
};

export default CloudConnectionGrid;