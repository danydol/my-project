import React, { useState } from 'react';
import apiClient from '../../services/api';
import AddCredentialsModal from '../CloudConnections/AddCredentialsModal';

interface CloudConnection {
  id: string;
  provider: string;
  name: string;
  region?: string;
  description?: string;
  status?: string;
}

interface ImportCloudObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  cloudConnections: CloudConnection[];
  onImportSuccess: () => void;
}

const ImportCloudObjectModal: React.FC<ImportCloudObjectModalProps> = ({
  isOpen,
  onClose,
  repoId,
  cloudConnections,
  onImportSuccess,
}) => {
  const [cloudConnectionId, setCloudConnectionId] = useState('');
  const [objectType, setObjectType] = useState('');
  const [objectId, setObjectId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importLogs, setImportLogs] = useState<string[] | null>(null);
  const [stateFilePath, setStateFilePath] = useState<string | null>(null);
  
  // AddCredentialsModal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<CloudConnection | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImportLogs(null);
    setStateFilePath(null);
    
    try {
      const response = await apiClient.post(`/repositories/${repoId}/import-cloud-object`, {
        cloudConnectionId,
        objectType,
        objectId,
        resourceType,
        resourceName,
      });
      
      if (response.data.success) {
        setImportLogs(response.data.logs || []);
        setStateFilePath(response.data.stateFilePath || null);
        onImportSuccess();
      } else {
        // Check if the error is related to missing credentials
        if (response.data.error && (
          response.data.error.includes('credentials') || 
          response.data.error.includes('Failed to configure AWS') ||
          response.data.error.includes('authentication')
        )) {
          // Show credentials modal
          const connection = cloudConnections.find(conn => conn.id === cloudConnectionId);
          if (connection) {
            setSelectedConnection(connection);
            setShowCredentialsModal(true);
          }
        } else {
          setError(response.data.error || 'Failed to import cloud object');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to import cloud object';
      
      // Check if the error is related to missing credentials
      if (errorMessage.includes('credentials') || 
          errorMessage.includes('Failed to configure AWS') ||
          errorMessage.includes('authentication')) {
        // Show credentials modal
        const connection = cloudConnections.find(conn => conn.id === cloudConnectionId);
        if (connection) {
          setSelectedConnection(connection);
          setShowCredentialsModal(true);
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async (credentialsData: any) => {
    try {
      const response = await apiClient.put(`/cloud/connections/${credentialsData.connectionId}/credentials`, {
        config: credentialsData.config
      });
      
      if (response.data.success) {
        // Close credentials modal and retry import
        setShowCredentialsModal(false);
        setSelectedConnection(null);
        
        // Retry the import with updated credentials
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }, 100);
      } else {
        throw new Error(response.data.error || 'Failed to save credentials');
      }
    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      throw error;
    }
  };

  const handleCloseCredentialsModal = () => {
    setShowCredentialsModal(false);
    setSelectedConnection(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay">
        <div className="connect-cloud-modal">
          <div className="modal-header">
            <h2>Import Cloud Object</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          {importLogs ? (
            <div className="import-logs-modal">
              <h3>Import Process Logs</h3>
              <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f9f9f9', padding: 10, borderRadius: 4, marginBottom: 10 }}>
                {importLogs.map((log, idx) => (
                  <div key={idx} style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>{log}</div>
                ))}
              </div>
              {stateFilePath && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Terraform state saved at:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{stateFilePath}</div>
                </div>
              )}
              <button className="connect-button" onClick={onClose}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleImport} className="connection-form">
              <div className="form-group">
                <label htmlFor="cloudConnection">Cloud Connection</label>
                <select
                  id="cloudConnection"
                  value={cloudConnectionId}
                  onChange={e => setCloudConnectionId(e.target.value)}
                  required
                >
                  <option value="">Select a connection</option>
                  {cloudConnections.map(conn => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.provider}{conn.region ? `, ${conn.region}` : ''})
                      {conn.status === 'error' && ' - ⚠️ Needs credentials'}
                    </option>
                  ))}
                </select>
                {cloudConnectionId && cloudConnections.find(conn => conn.id === cloudConnectionId)?.status === 'error' && (
                  <div className="credentials-warning">
                    ⚠️ This connection needs valid credentials. You'll be prompted to add them when you try to import.
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="objectType">Object Type</label>
                <input
                  id="objectType"
                  type="text"
                  value={objectType}
                  onChange={e => setObjectType(e.target.value)}
                  placeholder="e.g. S3 Bucket, VM, etc."
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="objectId">Object ID</label>
                <input
                  id="objectId"
                  type="text"
                  value={objectId}
                  onChange={e => setObjectId(e.target.value)}
                  placeholder="e.g. bucket-name, i-1234567890abcdef0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="resourceType">Terraform Resource Type</label>
                <input
                  id="resourceType"
                  type="text"
                  value={resourceType}
                  onChange={e => {
                    // Clean up the input - remove parentheses and extra spaces
                    const cleaned = e.target.value.replace(/[()]/g, '').trim();
                    setResourceType(cleaned);
                  }}
                  placeholder="e.g. aws_instance, aws_s3_bucket, google_storage_bucket"
                  required
                />
                <small className="form-text">
                  The Terraform resource type (no parentheses or extra text). Examples: aws_instance, aws_s3_bucket, aws_vpc
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="resourceName">Terraform Resource Name</label>
                <input
                  id="resourceName"
                  type="text"
                  value={resourceName}
                  onChange={e => setResourceName(e.target.value)}
                  placeholder="e.g. my_bucket, my_instance"
                  required
                />
                <small className="form-text">
                  The name for this resource in Terraform configuration (use underscores, no spaces)
                </small>
              </div>
              {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-2">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="connect-button" disabled={loading || !cloudConnectionId || !objectType || !objectId || !resourceType || !resourceName}>
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* AddCredentialsModal */}
      {selectedConnection && (
        <AddCredentialsModal
          isOpen={showCredentialsModal}
          onClose={handleCloseCredentialsModal}
          onSave={handleSaveCredentials}
          provider={selectedConnection.provider}
          connectionName={selectedConnection.name}
          connectionId={selectedConnection.id}
        />
      )}
    </>
  );
};

export default ImportCloudObjectModal; 