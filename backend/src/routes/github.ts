import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import passport from 'passport';
import { logger } from '../utils/logger';
import databaseService from '../services/databaseService';

const router = Router();

// Middleware to authenticate all GitHub routes
router.use(passport.authenticate('jwt', { session: false }));

// Get user repositories that are not yet connected to DeployAI (FRESH - no cache)
router.get('/repositories/unconnected-fresh', async (req: any, res) => {
  try {
    // Set cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const user = req.user;
    
    if (!user) {
      logger.error('No user found in request');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!user.githubAccessToken) {
      logger.error('No GitHub access token found for user', { userId: user.id });
      return res.status(401).json({
        success: false,
        error: 'GitHub access token not found. Please reconnect your GitHub account.'
      });
    }

    logger.info('=== FRESH FETCH: Fetching unconnected repositories ===', { 
      userId: user.id, 
      hasToken: !!user.githubAccessToken,
      timestamp: new Date().toISOString()
    });

    // Initialize Octokit with user's GitHub token
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    // Check what scopes the current token has
    try {
      const { headers } = await octokit.rest.users.getAuthenticated();
      logger.info('=== FRESH FETCH: Token scopes ===', { 
        scopes: headers['x-oauth-scopes'],
        acceptedScopes: headers['x-accepted-oauth-scopes']
      });
    } catch (scopeError: any) {
      logger.warn('=== FRESH FETCH: Could not check token scopes ===', { error: scopeError.message });
    }

    // Fetch user's own repositories (including private ones)
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      logger.info(`=== FRESH FETCH: Fetching page ${page} of repositories ===`);
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        per_page: 100,
        page: page
      });
      
      logger.info(`=== FRESH FETCH: Page ${page} returned ${repos.length} repositories ===`);
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 10) {
        logger.warn('=== FRESH FETCH: Reached page limit of 10, stopping pagination ===');
        break;
      }
    }

    logger.info('=== FRESH FETCH: GitHub API returned repositories ===', { 
      totalCount: allRepos.length,
      privateCount: allRepos.filter(repo => repo.private).length,
      publicCount: allRepos.filter(repo => !repo.private).length,
      firstFew: allRepos.slice(0, 3).map(r => ({ name: r.name, private: r.private }))
    });

    // Get repositories already connected to DeployAI
    logger.info('=== FRESH FETCH: Fetching connected repositories from database ===');
    const connectedRepos = await databaseService.getUserRepositories(user.id);
    const connectedGithubIds = new Set(connectedRepos.map(repo => repo.githubId));

    logger.info('=== FRESH FETCH: Database returned connected repositories ===', { 
      connectedCount: connectedRepos.length,
      connectedIds: Array.from(connectedGithubIds)
    });

    // Filter out already connected repositories
    const unconnectedRepos = allRepos.filter(repo => 
      !connectedGithubIds.has(repo.id.toString())
    );

    logger.info('=== FRESH FETCH: Filtered unconnected repositories ===', { 
      unconnectedCount: unconnectedRepos.length,
      unconnectedPrivateCount: unconnectedRepos.filter(repo => repo.private).length,
      unconnectedPublicCount: unconnectedRepos.filter(repo => !repo.private).length,
      firstFewUnconnected: unconnectedRepos.slice(0, 5).map(r => ({ name: r.name, private: r.private }))
    });

    const responseRepos = unconnectedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      topics: repo.topics || []
    }));

    logger.info('=== FRESH FETCH: Sending response ===', { 
      responseCount: responseRepos.length,
      firstFewResponse: responseRepos.slice(0, 3).map(r => ({ name: r.name, private: r.private }))
    });

    return res.json({
      success: true,
      repositories: responseRepos
    });
  } catch (error: any) {
    logger.error('=== FRESH FETCH: Error fetching unconnected repositories ===', { 
      error: error.message, 
      stack: error.stack,
      status: error.status,
      response: error.response?.data 
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch unconnected repositories',
      details: error.message
    });
  }
});

// Get user repositories that are not yet connected to DeployAI
router.get('/repositories/unconnected', async (req: any, res) => {
  try {
    // Set cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const user = req.user;
    
    if (!user) {
      logger.error('No user found in request');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!user.githubAccessToken) {
      logger.error('No GitHub access token found for user', { userId: user.id });
      return res.status(401).json({
        success: false,
        error: 'GitHub access token not found. Please reconnect your GitHub account.'
      });
    }

    logger.info('Fetching unconnected repositories', { 
      userId: user.id, 
      hasToken: !!user.githubAccessToken,
      timestamp: new Date().toISOString()
    });

    // Initialize Octokit with user's GitHub token
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    // Get all user repositories from GitHub with pagination and including organization repos
    logger.info('=== FRESH FETCH: Calling GitHub API to list repositories ===');
    
    // Check what scopes the current token has
    try {
      const { headers } = await octokit.rest.users.getAuthenticated();
      logger.info('=== FRESH FETCH: Token scopes ===', { 
        scopes: headers['x-oauth-scopes'],
        acceptedScopes: headers['x-accepted-oauth-scopes']
      });
    } catch (scopeError: any) {
      logger.warn('=== FRESH FETCH: Could not check token scopes ===', { error: scopeError.message });
    }
    
    // Fetch user's own repositories (including private ones)
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      logger.info(`Fetching page ${page} of repositories`);
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        per_page: 100,
        page: page
      });
      
      logger.info(`Page ${page} returned ${repos.length} repositories`);
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 10) {
        logger.warn('Reached page limit of 10, stopping pagination');
        break;
      }
    }

    logger.info('GitHub API returned repositories', { 
      totalCount: allRepos.length,
      privateCount: allRepos.filter(repo => repo.private).length,
      publicCount: allRepos.filter(repo => !repo.private).length,
      firstFew: allRepos.slice(0, 3).map(r => ({ name: r.name, private: r.private }))
    });

    // Get repositories already connected to DeployAI
    logger.info('Fetching connected repositories from database');
    const connectedRepos = await databaseService.getUserRepositories(user.id);
    const connectedGithubIds = new Set(connectedRepos.map(repo => repo.githubId));

    logger.info('Database returned connected repositories', { 
      connectedCount: connectedRepos.length,
      connectedIds: Array.from(connectedGithubIds)
    });

    // Filter out already connected repositories
    const unconnectedRepos = allRepos.filter(repo => 
      !connectedGithubIds.has(repo.id.toString())
    );

    logger.info('Filtered unconnected repositories', { 
      unconnectedCount: unconnectedRepos.length,
      unconnectedPrivateCount: unconnectedRepos.filter(repo => repo.private).length,
      unconnectedPublicCount: unconnectedRepos.filter(repo => !repo.private).length,
      firstFewUnconnected: unconnectedRepos.slice(0, 5).map(r => ({ name: r.name, private: r.private }))
    });

    const responseRepos = unconnectedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      topics: repo.topics || []
    }));

    logger.info('Sending response', { 
      responseCount: responseRepos.length,
      firstFewResponse: responseRepos.slice(0, 3).map(r => ({ name: r.name, private: r.private }))
    });

    return res.json({
      success: true,
      repositories: responseRepos
    });
  } catch (error: any) {
    logger.error('Error fetching unconnected repositories', { 
      error: error.message, 
      stack: error.stack,
      status: error.status,
      response: error.response?.data 
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch unconnected repositories',
      details: error.message
    });
  }
});

// Connect a new repository to DeployAI
router.post('/repositories/connect', async (req: any, res) => {
  try {
    const { githubId } = req.body;
    const user = req.user;

    if (!githubId) {
      return res.status(400).json({
        success: false,
        error: 'GitHub repository ID is required'
      });
    }

    // Initialize Octokit with user's GitHub token
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    // First, get all user repositories to find the one with matching ID
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        per_page: 100,
        page: page
      });
      
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 10) break;
    }

    // Find the repository with matching GitHub ID
    const repo = allRepos.find(r => r.id.toString() === githubId.toString());
    
    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found in your GitHub account'
      });
    }

    // Check if repository is already connected
    const existingRepo = await databaseService.getUserRepositories(user.id);
    const isAlreadyConnected = existingRepo.some(r => r.githubId === repo.id.toString());
    
    if (isAlreadyConnected) {
      return res.status(409).json({
        success: false,
        error: 'Repository is already connected'
      });
    }

    // Create repository in database
    const newRepository = await databaseService.createRepository({
      userId: user.id,
      githubId: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || undefined,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url || undefined,
    });

    return res.status(201).json({
      success: true,
      repository: newRepository
    });
  } catch (error: any) {
    logger.error('Error connecting repository', error);
    
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found on GitHub'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to connect repository'
    });
  }
});

// Get user repositories
router.get('/repositories', async (req: any, res) => {
  try {
    const user = req.user;
    
    // Initialize Octokit with user's GitHub token
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    // Fetch all repositories with pagination and including organization repos
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        per_page: 100,
        page: page
      });
      
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 10) break;
    }

    return res.json({
      success: true,
      repositories: allRepos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch
      }))
    });
  } catch (error) {
    logger.error('Error fetching repositories', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch repositories'
    });
  }
});

// Get repository details
router.get('/repositories/:owner/:repo', async (req: any, res) => {
  try {
    const { owner, repo } = req.params;
    const user = req.user;
    
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    const { data } = await octokit.rest.repos.get({
      owner,
      repo
    });

    return res.json({
      success: true,
      repository: {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        htmlUrl: data.html_url,
        cloneUrl: data.clone_url,
        language: data.language,
        defaultBranch: data.default_branch,
        topics: data.topics
      }
    });
  } catch (error) {
    logger.error('Error fetching repository details', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch repository details'
    });
  }
});

// Get repository contents
router.get('/repositories/:owner/:repo/contents', async (req: any, res) => {
  try {
    const { owner, repo } = req.params;
    const { path = '' } = req.query;
    const user = req.user;
    
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path as string
    });

    return res.json({
      success: true,
      contents: data
    });
  } catch (error) {
    logger.error('Error fetching repository contents', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch repository contents'
    });
  }
});

// Get repository branches
router.get('/repositories/:owner/:repo/branches', async (req: any, res) => {
  try {
    const { owner, repo } = req.params;
    const user = req.user;
    
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo
    });

    return res.json({
      success: true,
      branches: data.map(branch => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url
        },
        protected: branch.protected
      }))
    });
  } catch (error) {
    logger.error('Error fetching repository branches', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch repository branches'
    });
  }
});

export default router; 