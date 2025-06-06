import React, { useState, useEffect } from 'react';
import './ConnectCloudModal.css';

interface ConnectCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connectionData: any) => Promise<void>;
  provider: string;
  projectId: string;
}

interface Region {
  id: string;
  name: string;
}

const ConnectCloudModal: React.FC<ConnectCloudModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  provider,
  projectId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    description: '',
    config: {} as any
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const providerConfigs = {
    aws: {
      name: 'Amazon Web Services',
      icon: '☁️',
      color: '#FF9900',
      fields: [
        { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true }
      ]
    },
    gcp: {
      name: 'Google Cloud Platform',
      icon: '🌐',
      color: '#4285F4',
      fields: [
        { key: 'projectId', label: 'Project ID', type: 'text', required: true },
        { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true }
      ]
    },
    azure: {
      name: 'Microsoft Azure',
      icon: '🔷',
      color: '#0078D4',
      fields: [
        { key: 'subscriptionId', label: 'Subscription ID', type: 'text', required: true },
        { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
        { key: 'clientId', label: 'Client ID', type: 'text', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
      ]
    }
  };

  const config = providerConfigs[provider as keyof typeof providerConfigs];

  useEffect(() => {
    if (isOpen && provider) {
      // Reset form when modal opens
      setFormData({
        name: `${config?.name} Connection`,
        region: '',
        description: '',
        config: {}
      });
      
      // Fetch available regions
      fetchRegions();
    }
  }, [isOpen, provider]);

  const fetchRegions = async () => {
    try {
      const response = await fetch(`/api/cloud/providers/${provider}/regions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'any'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRegions(data.regions || []);
        if (data.regions?.length > 0) {
          setFormData(prev => ({ ...prev, region: data.regions[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      // Create a temporary connection to test
      const testResponse = await fetch('/api/cloud/connections/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'ngrok-skip-browser-warning': 'any'
        },
        body: JSON.stringify({
          provider,
          config: formData.config
        })
      });

      const result = await testResponse.json();
      
      if (result.success && result.valid) {
        alert('✅ Connection test successful!');
      } else {
        alert(`❌ Connection test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onConnect({
        projectId,
        provider,
        name: formData.name,
        config: formData.config,
        region: formData.region,
        description: formData.description
      });
      onClose();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="connect-cloud-modal">
        <div className="modal-header">
          <div className="provider-info">
            <div 
              className="provider-icon"
              style={{ backgroundColor: config?.color }}
            >
              {config?.icon}
            </div>
            <h2>Connect to {config?.name}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="connection-form">
          <div className="form-group">
            <label htmlFor="name">Connection Name</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              value={formData.region}
              onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
              required
            >
              <option value="">Select a region</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div className="credentials-section">
            <h3>Credentials</h3>
            {config?.fields.map(field => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.key}
                    rows={6}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    required={field.required}
                    placeholder={field.key === 'serviceAccountKey' ? 'Paste your service account JSON here...' : ''}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.key}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this connection..."
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="test-button"
              onClick={testConnection}
              disabled={testing || !formData.config[config?.fields[0]?.key]}
            >
              {testing ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
            <div className="action-buttons">
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="connect-button"
                disabled={loading || !formData.name || !formData.region}
              >
                {loading ? '🔄 Connecting...' : '🔗 Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectCloudModal; 