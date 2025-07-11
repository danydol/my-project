import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import './EC2InstancesModal.css';

interface EC2Instance {
  id: string;
  name: string;
  state: string;
  type: string;
  zone: string;
  privateIp: string;
  publicIp: string;
  launchTime: string;
  platform: string;
  vpcId: string;
  subnetId: string;
}

interface EC2InstancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
}

const EC2InstancesModal: React.FC<EC2InstancesModalProps> = ({
  isOpen,
  onClose,
  connectionId,
  connectionName
}) => {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');

  useEffect(() => {
    if (isOpen && connectionId) {
      fetchInstances();
    }
  }, [isOpen, connectionId]);

  const fetchInstances = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/cloud/connections/${connectionId}/ec2-instances`, {
        headers: {
          'ngrok-skip-browser-warning': 'any'
        }
      });
      
      if (response.data.success) {
        setInstances(response.data.instances);
      } else {
        setError(response.data.error || 'Failed to fetch instances');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return '#10b981';
      case 'stopped':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      case 'terminated':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'running':
        return '🟢';
      case 'stopped':
        return '🔴';
      case 'pending':
        return '🟡';
      case 'terminated':
        return '⚫';
      default:
        return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredInstances = instances.filter(instance => {
    if (filter === 'all') return true;
    return instance.state === filter;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="ec2-instances-modal">
        <div className="modal-header">
          <div className="header-content">
            <h2>EC2 Instances</h2>
            <p className="connection-name">{connectionName}</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="controls">
            <div className="filter-controls">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({instances.length})
              </button>
              <button
                className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
                onClick={() => setFilter('running')}
              >
                Running ({instances.filter(i => i.state === 'running').length})
              </button>
              <button
                className={`filter-btn ${filter === 'stopped' ? 'active' : ''}`}
                onClick={() => setFilter('stopped')}
              >
                Stopped ({instances.filter(i => i.state === 'stopped').length})
              </button>
            </div>
            <button
              className="refresh-button"
              onClick={fetchInstances}
              disabled={loading}
            >
              {loading ? '🔄' : '🔄'} Refresh
            </button>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading EC2 instances...</p>
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="no-instances">
              <p>No EC2 instances found.</p>
            </div>
          ) : (
            <div className="instances-grid">
              {filteredInstances.map((instance) => (
                <div key={instance.id} className="instance-card">
                  <div className="instance-header">
                    <div className="instance-name">
                      <h3>{instance.name}</h3>
                      <span className="instance-id">{instance.id}</span>
                    </div>
                    <div 
                      className="state-badge"
                      style={{ backgroundColor: getStateColor(instance.state) }}
                    >
                      {getStateIcon(instance.state)} {instance.state}
                    </div>
                  </div>
                  
                  <div className="instance-details">
                    <div className="detail-row">
                      <span className="label">Type:</span>
                      <span className="value">{instance.type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Zone:</span>
                      <span className="value">{instance.zone}</span>
                    </div>
                    {instance.privateIp && (
                      <div className="detail-row">
                        <span className="label">Private IP:</span>
                        <span className="value">{instance.privateIp}</span>
                      </div>
                    )}
                    {instance.publicIp && (
                      <div className="detail-row">
                        <span className="label">Public IP:</span>
                        <span className="value">{instance.publicIp}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Platform:</span>
                      <span className="value">{instance.platform}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Launch Time:</span>
                      <span className="value">{formatDate(instance.launchTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EC2InstancesModal; 