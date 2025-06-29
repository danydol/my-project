import React, { useState } from 'react';
import apiClient from '../../services/api';

interface CloudConnection {
  id: string;
  provider: string;
  name: string;
  region?: string;
  description?: string;
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
        setError(response.data.error || 'Failed to import cloud object');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import cloud object');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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
                  </option>
                ))}
              </select>
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
                placeholder="e.g. bucket-name, instance-id, etc."
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="resourceType">Resource Type</label>
              <input
                id="resourceType"
                type="text"
                value={resourceType}
                onChange={e => setResourceType(e.target.value)}
                placeholder="e.g. aws_s3_bucket, aws_instance, etc."
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="resourceName">Resource Name</label>
              <input
                id="resourceName"
                type="text"
                value={resourceName}
                onChange={e => setResourceName(e.target.value)}
                placeholder="Terraform resource name (e.g. my_bucket)"
                required
              />
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
  );
};

export default ImportCloudObjectModal; 