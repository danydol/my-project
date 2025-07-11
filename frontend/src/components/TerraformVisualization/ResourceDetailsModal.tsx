import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import apiClient from '../../services/api';
import './ResourceDetailsModal.css';

interface ResourceDetailsModalProps {
  node: Node;
  workspaceId: string;
  onClose: () => void;
}

const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({
  node,
  workspaceId,
  onClose,
}) => {
  const [resourceDetails, setResourceDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResourceDetails();
  }, [node, workspaceId]);

  const loadResourceDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const resourceId = `${node.data.resourceType}.${node.data.resourceName}`;
      const response = await apiClient.get(`/deployments/terraform/${workspaceId}/resource/${resourceId}`);
      
      if (response.data.success) {
        setResourceDetails(response.data.resource);
      } else {
        setError('Failed to load resource details');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load resource details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAttributeValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="resource-details-modal-backdrop" onClick={handleBackdropClick}>
      <div className="resource-details-modal">
        <div className="modal-header">
          <h3>Resource Details</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div className="resource-summary">
            <div className="resource-title">
              <span className="resource-icon">
                {node.data.resourceType === 'aws_instance' ? '🖥️' : '📦'}
              </span>
              <div>
                <h4>{node.data.resourceType}</h4>
                <p className="resource-name">{node.data.resourceName}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Loading resource details...</p>
            </div>
          ) : error ? (
            <div className="error-section">
              <p className="error-message">{error}</p>
              <button onClick={loadResourceDetails} className="retry-button">
                Try Again
              </button>
            </div>
          ) : resourceDetails ? (
            <div className="resource-details">
              <div className="detail-section">
                <h5>Attributes</h5>
                <div className="attributes-list">
                  {resourceDetails.instances?.[0]?.attributes && 
                    Object.entries(resourceDetails.instances[0].attributes).map(([key, value]) => (
                      <div key={key} className="attribute-item">
                        <span className="attribute-key">{key}:</span>
                        <span className="attribute-value">
                          {formatAttributeValue(value)}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {resourceDetails.instances?.[0]?.dependencies && 
                resourceDetails.instances[0].dependencies.length > 0 && (
                <div className="detail-section">
                  <h5>Dependencies</h5>
                  <div className="dependencies-list">
                    {resourceDetails.instances[0].dependencies.map((dep: string) => (
                      <div key={dep} className="dependency-item">
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h5>Resource Info</h5>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{resourceDetails.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{resourceDetails.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Provider:</span>
                    <span className="info-value">{resourceDetails.provider}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>No resource details available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailsModal; 