import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Grid
} from '@mui/material';
import { 
  GitHub as GitHubIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Monitor as MonitoringIcon,
  Build as BuildIcon,
  AttachMoney as CostIcon,
  Key as KeyIcon,
  ContentCopy as CopyIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { repositoryService, AnalysisStatus, DevOpsAnalysis, DevOpsChecklistItem } from '../services/repositoryService';
import apiClient from '../services/api';

// Add CSS for spinning animation
const spinAnimation = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;

const RepositoryAnalysisPage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // GitHub token and SSH key states
  const [sshKey, setSshKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSshDialog, setShowSshDialog] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      setCheckingConnection(true);
      const response = await apiClient.get('/auth/me');
      setGithubConnected(!!response.data.user.githubAccessToken);
    } catch (error) {
      setGithubConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const generateSSHKey = async () => {
    try {
      setGeneratingKey(true);
      const response = await apiClient.get('/auth/ssh-key');
      setSshKey(response.data.sshKey);
      setShowSshDialog(true);
    } catch (error) {
      console.error('Failed to generate SSH key:', error);
      setError('Failed to generate SSH key. Please try again.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const copySSHKey = async () => {
    try {
      await navigator.clipboard.writeText(sshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy SSH key:', error);
    }
  };

  const openGitHubSettings = () => {
    window.open('https://github.com/settings/keys', '_blank');
  };

  const handleGitHubReconnect = () => {
    window.location.href = '/api/auth/github/reauth';
  };

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await repositoryService.startAnalysis(repoUrl);
      setAnalysis(response.analysis);
      
      // Start polling for status updates
      pollAnalysisStatus(response.analysis.analysisId);
    } catch (err: any) {
      setError(err.message || 'Failed to start analysis');
      setLoading(false);
    }
  };

  const pollAnalysisStatus = async (analysisId: string) => {
    const poll = async () => {
      try {
        const response = await repositoryService.getAnalysisStatus(analysisId);
        setAnalysis(response.analysis);

        if (response.analysis.status === 'completed' || response.analysis.status === 'failed') {
          setLoading(false);
          return;
        }

        // Continue polling
        setTimeout(poll, 2000);
      } catch (err) {
        console.error('Error polling analysis status:', err);
        setLoading(false);
      }
    };

    poll();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Application Architecture':
        return <CodeIcon />;
      case 'Security & Compliance':
        return <SecurityIcon />;
      case 'Infrastructure & Networking':
        return <CloudIcon />;
      case 'Monitoring & Operations':
        return <MonitoringIcon />;
      case 'Development & Deployment':
        return <BuildIcon />;
      case 'Cost & Resource Management':
        return <CostIcon />;
      default:
        return <AnalyticsIcon />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <style>{spinAnimation}</style>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Repository Analysis
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Analyze your GitHub repository for DevOps deployment readiness and get personalized recommendations.
      </Typography>

      {/* GitHub Integration Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <GitHubIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              GitHub Integration
            </Typography>
            {githubConnected && (
              <Chip 
                label="Connected" 
                color="success" 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <KeyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    SSH Key Setup
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Generate an SSH key to securely connect to your GitHub repositories.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={generateSSHKey}
                      disabled={generatingKey}
                      startIcon={generatingKey ? <RefreshIcon className="animate-spin" /> : <KeyIcon />}
                    >
                      {generatingKey ? 'Generating...' : 'Generate SSH Key'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={openGitHubSettings}
                      startIcon={<SettingsIcon />}
                    >
                      GitHub Settings
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    GitHub Connection
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Connect your GitHub account to access private repositories and enable advanced analysis.
                  </Typography>
                  {githubConnected ? (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        onClick={handleGitHubReconnect}
                        startIcon={<RefreshIcon />}
                      >
                        Reconnect GitHub
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => window.open('/settings', '_blank')}
                        startIcon={<SettingsIcon />}
                      >
                        Manage Settings
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleGitHubReconnect}
                      startIcon={<LinkIcon />}
                    >
                      Connect GitHub
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {!githubConnected && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> Connecting your GitHub account will allow you to analyze private repositories 
                and get more detailed insights. You can also generate SSH keys for secure repository access.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Input Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              label="GitHub Repository URL"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: <GitHubIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <Button
              variant="contained"
              onClick={handleAnalyze}
              disabled={loading || !repoUrl.trim()}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {analysis && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Progress
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Repository: {analysis.repoId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {analysis.currentStep}
              </Typography>
            </Box>

            <LinearProgress 
              variant="determinate" 
              value={analysis.progress} 
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {analysis.progress}% complete
            </Typography>

            {analysis.status === 'failed' && analysis.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {analysis.error}
              </Alert>
            )}

            {analysis.stats && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Files</Typography>
                  <Typography variant="h6">{analysis.stats.totalFiles}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Chunks</Typography>
                  <Typography variant="h6">{analysis.stats.totalChunks}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Embeddings</Typography>
                  <Typography variant="h6">{analysis.stats.embeddingsGenerated}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Score</Typography>
                  <Typography variant="h6">{analysis.stats.analysisScore}%</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* DevOps Analysis Results */}
      {analysis?.devopsAnalysis && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              DevOps Analysis Results
            </Typography>

            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {analysis.devopsAnalysis.overallScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Score
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h3" color="secondary">
                  {analysis.devopsAnalysis.deploymentReadiness}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deployment Ready
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Chip 
                  label={analysis.devopsAnalysis.estimatedComplexity.toUpperCase()} 
                  color={getComplexityColor(analysis.devopsAnalysis.estimatedComplexity) as any}
                  size="medium"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Complexity
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h3">
                  {analysis.devopsAnalysis.checklist.filter(item => item.confidence > 0.7).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Confidence
                </Typography>
              </Box>
            </Box>

            {/* Recommendations */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Key Recommendations
              </Typography>
              <List>
                {analysis.devopsAnalysis.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {rec.startsWith('✅') ? <CheckCircleIcon color="success" /> : <WarningIcon color="warning" />}
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Detailed Checklist */}
            <Typography variant="h6" gutterBottom>
              Detailed Analysis
            </Typography>
            
            {Object.entries(
              analysis.devopsAnalysis.checklist.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, DevOpsChecklistItem[]>)
            ).map(([category, items]) => (
              <Accordion key={category}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getCategoryIcon(category)}
                    <Typography variant="h6">{category}</Typography>
                    <Chip 
                      label={`${items.filter(item => item.confidence > 0.7).length}/${items.length}`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {items.map((item) => (
                      <ListItem key={item.id} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1">{item.title}</Typography>
                              <Chip 
                                label={`${Math.round(item.confidence * 100)}%`}
                                size="small"
                                color={getConfidenceColor(item.confidence) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                <strong>Detected:</strong> {item.detected || 'Not detected'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                <strong>Reasoning:</strong> {item.reasoning}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Recommendations:</strong>
                              </Typography>
                              <List dense>
                                {item.recommendations.map((rec, index) => (
                                  <ListItem key={index} sx={{ pl: 0 }}>
                                    <ListItemText primary={`• ${rec}`} />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* SSH Key Dialog */}
      <Dialog 
        open={showSshDialog} 
        onClose={() => setShowSshDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <KeyIcon sx={{ mr: 2 }} />
            SSH Key Generated
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Your SSH key has been generated successfully. Copy the public key below and add it to your GitHub account.
            </Typography>
          </Alert>
          
          <Typography variant="subtitle2" gutterBottom>
            Public SSH Key:
          </Typography>
          
          <Box sx={{ 
            position: 'relative',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'grey.50',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            wordBreak: 'break-all',
            maxHeight: 200,
            overflow: 'auto'
          }}>
            {sshKey}
            <IconButton
              onClick={copySSHKey}
              sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8,
                backgroundColor: 'background.paper',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              size="small"
            >
              {copied ? <CheckCircleIcon color="success" /> : <CopyIcon />}
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Next steps:</strong>
          </Typography>
          <List dense>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText primary="1. Copy the SSH key above" />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText primary="2. Go to GitHub Settings → SSH and GPG keys" />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText primary="3. Click 'New SSH key' and paste the key" />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText primary="4. Give it a descriptive title (e.g., 'DeployAI')" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSshDialog(false)}>
            Close
          </Button>
          <Button 
            onClick={openGitHubSettings}
            variant="contained"
            startIcon={<SettingsIcon />}
          >
            Open GitHub Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RepositoryAnalysisPage; 