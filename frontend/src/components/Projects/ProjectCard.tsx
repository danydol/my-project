import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  CloudQueue as CloudIcon,
  Storage as RepoIcon,
  Rocket as DeployIcon,
  Circle as StatusIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface CloudConnection {
  id: string;
  provider: string;
  status: string;
  name: string;
}

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
  cloudConnections: CloudConnection[];
  _count: {
    repositories: number;
    deployments: number;
    cloudConnections: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleClose();
    onEdit?.(project);
  };

  const handleDelete = () => {
    handleClose();
    onDelete?.(project);
  };

  const handleSettings = () => {
    handleClose();
    navigate(`/projects/${project.id}/settings`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getCloudProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws': return '☁️';
      case 'gcp': return '🌐';
      case 'azure': return '🔷';
      default: return '☁️';
    }
  };

  const connectedProviders = Array.from(new Set(project.cloudConnections.map(c => c.provider)));
  const activeConnections = project.cloudConnections.filter(c => c.status === 'connected').length;
  const connectionHealthPercentage = project.cloudConnections.length > 0 
    ? (activeConnections / project.cloudConnections.length) * 100 
    : 0;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        borderLeft: `4px solid ${project.color || '#1976d2'}`,
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: project.color || '#1976d2',
                fontSize: '1.2rem'
              }}
            >
              {project.icon || project.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" component="h3" noWrap>
                {project.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <StatusIcon 
                  sx={{ 
                    fontSize: 12, 
                    color: getStatusColor(project.status) + '.main' 
                  }} 
                />
                <Typography variant="caption" color="textSecondary">
                  {project.status}
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton 
            size="small" 
            onClick={handleClick}
            sx={{ mt: -1 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Description */}
        {project.description && (
          <Typography 
            variant="body2" 
            color="textSecondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.description}
          </Typography>
        )}

        {/* Cloud Connections */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="textSecondary">
              Cloud Connections
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {activeConnections}/{project.cloudConnections.length}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={connectionHealthPercentage}
            sx={{ 
              height: 6, 
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: connectionHealthPercentage > 80 ? 'success.main' : 
                         connectionHealthPercentage > 50 ? 'warning.main' : 'error.main'
              }
            }}
          />
          <Box display="flex" gap={0.5} mt={1}>
            {connectedProviders.map(provider => (
              <Typography key={provider} variant="caption" sx={{ fontSize: '1rem' }}>
                {getCloudProviderIcon(provider)}
              </Typography>
            ))}
            {project.multiCloud && connectedProviders.length > 1 && (
              <Chip 
                label="Multi-Cloud" 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </Box>
        </Box>

        {/* Stats */}
        <Box display="flex" gap={2} mb={2}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <RepoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="textSecondary">
              {project._count.repositories} repos
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <DeployIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="textSecondary">
              {project._count.deployments} deploys
            </Typography>
          </Box>
        </Box>

        {/* Tags */}
        {project.tags.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {project.tags.slice(0, 3).map(tag => (
              <Chip 
                key={tag} 
                label={tag} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 22 }}
              />
            ))}
            {project.tags.length > 3 && (
              <Chip 
                label={`+${project.tags.length - 3}`} 
                size="small" 
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 22 }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={handleSettings}>
          <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
          Project Settings
        </MenuItem>
        <MenuItem onClick={handleEdit}>Edit Project</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete Project
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default ProjectCard; 