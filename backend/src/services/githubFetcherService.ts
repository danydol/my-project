import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger';

export interface RepoFile {
  path: string;
  content: string;
  size: number;
  language: string;
  sha: string;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  languages: Record<string, number>;
  topics: string[];
  hasDockerfile: boolean;
  hasKubernetes: boolean;
  hasCI: boolean;
  packageManagers: string[];
  frameworks: string[];
  totalFiles: number;
  totalSize: number;
}

class GitHubFetcherService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }

  // Fetch repository with optional user token for authentication
  async fetchRepository(owner: string, repo: string, userToken?: string): Promise<{ files: RepoFile[], metadata: RepoMetadata }> {
    try {
      logger.info(`Fetching repository: ${owner}/${repo}`);

      // Use user token if provided, otherwise fall back to system token
      const octokitInstance = userToken ? new Octokit({ auth: userToken }) : this.octokit;

      // Get repository metadata
      const repoData = await octokitInstance.repos.get({ owner, repo });
      const languages = await octokitInstance.repos.listLanguages({ owner, repo });

      // Get repository tree (all files)
      const tree = await octokitInstance.git.getTree({
        owner,
        repo,
        tree_sha: repoData.data.default_branch,
        recursive: 'true'
      });

      // Filter for code files and fetch content
      const codeFiles = tree.data.tree.filter(item => 
        item.type === 'blob' && 
        this.isCodeFile(item.path || '') &&
        (item.size || 0) < 1000000 // Skip files larger than 1MB
      );

      const files: RepoFile[] = [];
      const batchSize = 10; // Process files in batches to avoid rate limits

      for (let i = 0; i < codeFiles.length; i += batchSize) {
        const batch = codeFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          try {
            const content = await octokitInstance.git.getBlob({
              owner,
              repo,
              file_sha: file.sha!
            });

            // Decode base64 content
            const decodedContent = Buffer.from(content.data.content, 'base64').toString('utf-8');

            return {
              path: file.path!,
              content: decodedContent,
              size: file.size || 0,
              language: this.detectLanguage(file.path!),
              sha: file.sha!
            };
          } catch (error) {
            logger.warn(`Failed to fetch file ${file.path}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        files.push(...batchResults.filter(file => file !== null) as RepoFile[]);

        // Add delay between batches to respect rate limits
        if (i + batchSize < codeFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Analyze repository structure
      const metadata: RepoMetadata = {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        description: repoData.data.description || '',
        language: repoData.data.language || '',
        languages: languages.data,
        topics: repoData.data.topics || [],
        hasDockerfile: files.some(f => f.path.toLowerCase().includes('dockerfile')),
        hasKubernetes: files.some(f => f.path.includes('k8s/') || f.path.includes('kubernetes/') || f.path.includes('.yaml')),
        hasCI: files.some(f => 
          f.path.includes('.github/workflows/') || 
          f.path.includes('.gitlab-ci.yml') || 
          f.path.includes('Jenkinsfile')
        ),
        packageManagers: this.detectPackageManagers(files),
        frameworks: this.detectFrameworks(files),
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      };

      logger.info(`Successfully fetched ${files.length} files from ${owner}/${repo}`);
      return { files, metadata };

    } catch (error) {
      logger.error(`Error fetching repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  private isCodeFile(path: string): boolean {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h',
      '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs',
      '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
      '.yaml', '.yml', '.json', '.toml', '.ini', '.cfg', '.conf',
      '.sql', '.graphql', '.proto', '.thrift',
      '.html', '.css', '.scss', '.sass', '.less',
      '.md', '.rst', '.txt', '.dockerfile', 'Dockerfile',
      '.tf', '.hcl', '.nomad'
    ];

    const excludePaths = [
      'node_modules/', 'vendor/', '.git/', 'dist/', 'build/', 'target/',
      '.next/', '.nuxt/', 'coverage/', '__pycache__/', '.pytest_cache/',
      'venv/', 'env/', '.env/', 'logs/', 'tmp/', 'temp/'
    ];

    // Check if path should be excluded
    if (excludePaths.some(exclude => path.includes(exclude))) {
      return false;
    }

    // Check if it's a code file
    const extension = path.substring(path.lastIndexOf('.'));
    return codeExtensions.includes(extension) || path.endsWith('Dockerfile') || path.endsWith('Makefile');
  }

  private detectLanguage(path: string): string {
    const extension = path.substring(path.lastIndexOf('.'));
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.md': 'markdown',
      '.sh': 'bash',
      '.bash': 'bash',
      '.tf': 'terraform',
      '.hcl': 'hcl'
    };

    return languageMap[extension] || 'text';
  }

  private detectPackageManagers(files: RepoFile[]): string[] {
    const managers: string[] = [];
    const filePaths = files.map(f => f.path);

    if (filePaths.includes('package.json')) managers.push('npm');
    if (filePaths.includes('yarn.lock')) managers.push('yarn');
    if (filePaths.includes('pnpm-lock.yaml')) managers.push('pnpm');
    if (filePaths.includes('requirements.txt') || filePaths.includes('pyproject.toml')) managers.push('pip');
    if (filePaths.includes('Pipfile')) managers.push('pipenv');
    if (filePaths.includes('poetry.lock')) managers.push('poetry');
    if (filePaths.includes('go.mod')) managers.push('go');
    if (filePaths.includes('Cargo.toml')) managers.push('cargo');
    if (filePaths.includes('pom.xml')) managers.push('maven');
    if (filePaths.includes('build.gradle')) managers.push('gradle');

    return managers;
  }

  private detectFrameworks(files: RepoFile[]): string[] {
    const frameworks: string[] = [];
    const content = files.map(f => f.content.toLowerCase()).join(' ');
    const filePaths = files.map(f => f.path.toLowerCase());

    // Frontend frameworks
    if (content.includes('react') || filePaths.some(p => p.includes('react'))) frameworks.push('React');
    if (content.includes('vue') || filePaths.some(p => p.includes('vue'))) frameworks.push('Vue');
    if (content.includes('angular') || filePaths.some(p => p.includes('angular'))) frameworks.push('Angular');
    if (content.includes('next') || filePaths.some(p => p.includes('next'))) frameworks.push('Next.js');
    if (content.includes('nuxt') || filePaths.some(p => p.includes('nuxt'))) frameworks.push('Nuxt.js');

    // Backend frameworks
    if (content.includes('express') || content.includes('fastify')) frameworks.push('Express');
    if (content.includes('nestjs') || content.includes('@nestjs')) frameworks.push('NestJS');
    if (content.includes('fastapi') || content.includes('uvicorn')) frameworks.push('FastAPI');
    if (content.includes('django') || content.includes('django.')) frameworks.push('Django');
    if (content.includes('flask') || content.includes('from flask')) frameworks.push('Flask');
    if (content.includes('spring') || content.includes('springframework')) frameworks.push('Spring');

    // Databases
    if (content.includes('mongodb') || content.includes('mongoose')) frameworks.push('MongoDB');
    if (content.includes('postgresql') || content.includes('postgres')) frameworks.push('PostgreSQL');
    if (content.includes('mysql')) frameworks.push('MySQL');
    if (content.includes('redis')) frameworks.push('Redis');

    return frameworks;
  }
}

export const githubFetcherService = new GitHubFetcherService(); 