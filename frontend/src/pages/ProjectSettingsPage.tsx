import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Delete,
  Key,
  CheckCircle,
  Error,
  Info,
  GitHub,
  Security,
  Settings,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { projectService } from '../services/projectService';

interface ProjectSettings {
  id: string;
  name: string;
  description: string;
  defaultEnvironments: string[];
  multiCloud: boolean;
  hasGitHubToken: boolean;
  githubTokenUpdatedAt: string | null;
  tags: string[];
  icon: string | null;
  color: string | null;
}

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // GitHub token management
  const [githubToken, setGithubToken] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubTokenDialog, setGithubTokenDialog] = useState(false);
  const [updatingToken, setUpdatingToken] = useState(false);
  const [removingToken, setRemovingToken] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultEnvironments: ['dev', 'staging', 'prod'],
    multiCloud: false,
    tags: [] as string[],
    icon: '',
    color: ''
  });
  
  const [newTag, setNewTag] = useState('');
  const [newEnvironment, setNewEnvironment] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectSettings();
    }
  }, [projectId]);

  const fetchProjectSettings = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjectSettings(projectId!);
      setSettings(response.settings);
      setFormData({
        name: response.settings.name,
        description: response.settings.description || '',
        defaultEnvironments: response.settings.defaultEnvironments,
        multiCloud: response.settings.multiCloud,
        tags: response.settings.tags,
        icon: response.settings.icon || '',
        color: response.settings.color || ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await projectService.updateProjectSettings(projectId!, formData);
      setSuccess('Project settings updated successfully');
      
      // Refresh settings
      await fetchProjectSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update project settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGitHubToken = async () => {
    if (!githubToken.trim()) {
      setError('Please enter a valid GitHub token');
      return;
    }

    try {
      setUpdatingToken(true);
      setError(null);
      
      await projectService.updateGitHubToken(projectId!, githubToken);
      setSuccess('GitHub token updated successfully');
      setGithubToken('');
      setGithubTokenDialog(false);
      
      // Refresh settings
      await fetchProjectSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update GitHub token');
    } finally {
      setUpdatingToken(false);
    }
  };

  const handleRemoveGitHubToken = async () => {
    try {
      setRemovingToken(true);
      setError(null);
      
      await projectService.removeGitHubToken(projectId!);
      setSuccess('GitHub token removed successfully');
      
      // Refresh settings
      await fetchProjectSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to remove GitHub token');
    } finally {
      setRemovingToken(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddEnvironment = () => {
    if (newEnvironment.trim() && !formData.defaultEnvironments.includes(newEnvironment.trim())) {
      setFormData(prev => ({
        ...prev,
        defaultEnvironments: [...prev.defaultEnvironments, newEnvironment.trim()]
      }));
      setNewEnvironment('');
    }
  };

  const handleRemoveEnvironment = (envToRemove: string) => {
    if (formData.defaultEnvironments.length > 1) {
      setFormData(prev => ({
        ...prev,
        defaultEnvironments: prev.defaultEnvironments.filter(env => env !== envToRemove)
      }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!settings) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Project not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(`/projects/${projectId}`)} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Settings sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Project Settings
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Settings */}
        <Grid xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  margin="normal"
                  required
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  margin="normal"
                  multiline
                  rows={3}
                />

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Default Environments
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {formData.defaultEnvironments.map((env) => (
                      <Chip
                        key={env}
                        label={env}
                        onDelete={() => handleRemoveEnvironment(env)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  <Box display="flex" gap={1}>
                    <TextField
                      size="small"
                      label="Add Environment"
                      value={newEnvironment}
                      onChange={(e) => setNewEnvironment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEnvironment()}
                    />
                    <Button onClick={handleAddEnvironment} variant="outlined">
                      Add
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Tags
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {formData.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  <Box display="flex" gap={1}>
                    <TextField
                      size="small"
                      label="Add Tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button onClick={handleAddTag} variant="outlined">
                      Add
                    </Button>
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.multiCloud}
                      onChange={(e) => setFormData(prev => ({ ...prev, multiCloud: e.target.checked }))}
                    />
                  }
                  label="Multi-Cloud Deployment"
                  sx={{ mt: 2 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* GitHub Integration */}
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <GitHub sx={{ mr: 1 }} />
                <Typography variant="h6">
                  GitHub Integration
                </Typography>
              </Box>

              <List>
                <ListItem>
                  <ListItemIcon>
                    {settings.hasGitHubToken ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Error color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="GitHub Token"
                    secondary={
                      settings.hasGitHubToken
                        ? `Updated ${new Date(settings.githubTokenUpdatedAt!).toLocaleDateString()}`
                        : 'No token configured'
                    }
                  />
                  <ListItemSecondaryAction>
                    {settings.hasGitHubToken ? (
                      <Box>
                        <Button
                          size="small"
                          onClick={() => setGithubTokenDialog(true)}
                          sx={{ mr: 1 }}
                        >
                          Update
                        </Button>
                        <IconButton
                          size="small"
                          onClick={handleRemoveGitHubToken}
                          disabled={removingToken}
                          color="error"
                        >
                          {removingToken ? <CircularProgress size={20} /> : <Delete />}
                        </IconButton>
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setGithubTokenDialog(true)}
                        startIcon={<Key />}
                      >
                        Add Token
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  GitHub tokens are encrypted and stored securely. They're used for repository analysis and private repo access.
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Box sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSaveSettings}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* GitHub Token Dialog */}
      <Dialog open={githubTokenDialog} onClose={() => setGithubTokenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Key sx={{ mr: 1 }} />
          Update GitHub Token
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Enter your GitHub Personal Access Token. This will be encrypted and stored securely.
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            label="GitHub Personal Access Token"
            type={showGithubToken ? 'text' : 'password'}
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            margin="normal"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  edge="end"
                >
                  {showGithubToken ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGithubTokenDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateGitHubToken}
            variant="contained"
            disabled={updatingToken || !githubToken.trim()}
            startIcon={updatingToken ? <CircularProgress size={20} /> : <Save />}
          >
            {updatingToken ? 'Updating...' : 'Update Token'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectSettingsPage; 