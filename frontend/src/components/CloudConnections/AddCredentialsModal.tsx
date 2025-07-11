import React, { useState, useEffect } from 'react';
import './AddCredentialsModal.css';

interface AddCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentials: any) => Promise<void>;
  provider: string;
  connectionName: string;
  connectionId: string;
  currentConfig?: any;
}

interface Region {
  id: string;
  name: string;
}

const AddCredentialsModal: React.FC<AddCredentialsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  provider,
  connectionName,
  connectionId,
  currentConfig
}) => {
  const [formData, setFormData] = useState({
    config: {} as any
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const providerConfigs = {
    aws: {
      name: 'Amazon Web Services',
      icon: '☁️',
      color: '#FF9900',
      fields: [
        { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'sessionToken', label: 'Session Token (Optional)', type: 'textarea', required: false }
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
    if (isOpen) {
      // Initialize form with current config if available
      setFormData({
        config: currentConfig || {}
      });
      setTestResult(null);
    }
  }, [isOpen, currentConfig]);

  const handleConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const testCredentials = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/cloud/connections/test', {
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

      const result = await response.json();
      
      if (result.success && result.valid) {
        setTestResult({
          success: true,
          message: '✅ Credentials are valid and connection test successful!'
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Credentials test failed: ${result.error || 'Invalid credentials'}`
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Connection test failed: ${error}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        connectionId,
        config: formData.config
      });
      onClose();
    } catch (error) {
      console.error('Failed to save credentials:', error);
      setTestResult({
        success: false,
        message: `❌ Failed to save credentials: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!config) return false;
    
    return config.fields.every((field: any) => {
      if (field.required) {
        return formData.config[field.key] && formData.config[field.key].trim() !== '';
      }
      return true;
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="add-credentials-modal">
        <div className="modal-header">
          <div className="provider-info">
            <div 
              className="provider-icon"
              style={{ backgroundColor: config?.color }}
            >
              {config?.icon}
            </div>
            <div>
              <h2>Add Credentials</h2>
              <p className="connection-name">{connectionName}</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="credentials-notice">
            <div className="notice-icon">⚠️</div>
            <div className="notice-text">
              <h3>Credentials Required</h3>
              <p>This cloud connection needs valid credentials to access resources and perform operations.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="credentials-form">
            {config?.fields.map((field: any) => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.key}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    required={field.required}
                    rows={4}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.key}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={testCredentials}
                disabled={testing || !validateForm()}
                className="test-button"
              >
                {testing ? 'Testing...' : 'Test Credentials'}
              </button>
              
              <div className="save-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="cancel-button"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !validateForm()}
                  className="save-button"
                >
                  {loading ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCredentialsModal; 