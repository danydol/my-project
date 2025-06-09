import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Search as SearchIcon, ExpandMore as ExpandMoreIcon, Code as CodeIcon } from '@mui/icons-material';
import { repositoryService, SearchResult } from '../services/repositoryService';

interface RepositorySearchProps {
  repoId: string;
  onClose?: () => void;
}

const RepositorySearch: React.FC<RepositorySearchProps> = ({ repoId, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await repositoryService.searchRepository(repoId, query, 10);
      setResults(response.search);
    } catch (err: any) {
      setError(err.message || 'Failed to search repository');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      typescript: '#3178c6',
      javascript: '#f7df1e',
      python: '#3776ab',
      java: '#ed8b00',
      go: '#00add8',
      rust: '#000000',
      cpp: '#00599c',
      csharp: '#239120',
      php: '#777bb4',
      ruby: '#cc342d',
      default: '#666666'
    };
    return colors[language.toLowerCase()] || colors.default;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Search Repository Code
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Search query"
            placeholder="e.g., authentication, database connection, error handling..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {results && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Found {results.results.length} results
            </Typography>
            
            {results.results.length === 0 ? (
              <Alert severity="info">
                No results found. Try a different search query.
              </Alert>
            ) : (
              <List>
                {results.results.map((result, index) => (
                  <ListItem key={index} sx={{ p: 0, mb: 2 }}>
                    <Paper sx={{ width: '100%', p: 2 }}>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <CodeIcon color="primary" />
                            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                              {result.metadata.filePath}
                            </Typography>
                            <Chip 
                              label={result.metadata.language}
                              size="small"
                              sx={{ 
                                bgcolor: getLanguageColor(result.metadata.language),
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                            <Chip 
                              label={`${Math.round(result.score * 100)}% match`}
                              size="small"
                              color={result.score > 0.8 ? 'success' : result.score > 0.6 ? 'warning' : 'default'}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              File Type: {result.metadata.fileType} | Chunk: {result.metadata.chunkIndex + 1}
                            </Typography>
                            <Paper 
                              sx={{ 
                                p: 2, 
                                bgcolor: 'grey.50',
                                border: '1px solid',
                                borderColor: 'grey.200',
                                borderRadius: 1
                              }}
                            >
                              <Typography 
                                variant="body2" 
                                component="pre"
                                sx={{ 
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem',
                                  whiteSpace: 'pre-wrap',
                                  overflow: 'auto',
                                  maxHeight: '300px'
                                }}
                              >
                                {result.content}
                              </Typography>
                            </Paper>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RepositorySearch; 