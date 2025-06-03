import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import passport from 'passport';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to authenticate all GitHub routes
router.use(passport.authenticate('jwt', { session: false }));

// Get user repositories
router.get('/repositories', async (req: any, res) => {
  try {
    const user = req.user;
    
    // Initialize Octokit with user's GitHub token
    const octokit = new Octokit({
      auth: user.githubAccessToken
    });

    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: 'all',
      sort: 'updated',
      per_page: 100
    });

    res.json({
      success: true,
      repositories: repos.map(repo => ({
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
    res.status(500).json({
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

    res.json({
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
    res.status(500).json({
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

    res.json({
      success: true,
      contents: data
    });
  } catch (error) {
    logger.error('Error fetching repository contents', error);
    res.status(500).json({
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repository branches'
    });
  }
});

export default router; 