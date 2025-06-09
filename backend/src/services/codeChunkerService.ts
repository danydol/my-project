import { RepoFile } from './githubFetcherService';
import { CodeChunk } from './vectorStoreService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface ChunkingStrategy {
  maxChunkSize: number;
  overlapSize: number;
  splitOn: string[];
  preserveStructure: boolean;
}

class CodeChunkerService {
  private strategies: Record<string, ChunkingStrategy> = {
    javascript: {
      maxChunkSize: 1000,
      overlapSize: 100,
      splitOn: ['function ', 'class ', 'const ', 'let ', 'var ', 'export ', 'import '],
      preserveStructure: true
    },
    typescript: {
      maxChunkSize: 1000,
      overlapSize: 100,
      splitOn: ['function ', 'class ', 'interface ', 'type ', 'const ', 'let ', 'export ', 'import '],
      preserveStructure: true
    },
    python: {
      maxChunkSize: 1000,
      overlapSize: 100,
      splitOn: ['def ', 'class ', 'import ', 'from ', 'if __name__'],
      preserveStructure: true
    },
    java: {
      maxChunkSize: 1200,
      overlapSize: 120,
      splitOn: ['public class ', 'private class ', 'public interface ', 'public void ', 'private void '],
      preserveStructure: true
    },
    go: {
      maxChunkSize: 1000,
      overlapSize: 100,
      splitOn: ['func ', 'type ', 'var ', 'const ', 'package ', 'import '],
      preserveStructure: true
    },
    yaml: {
      maxChunkSize: 800,
      overlapSize: 80,
      splitOn: ['apiVersion:', 'kind:', 'metadata:', 'spec:', 'data:'],
      preserveStructure: true
    },
    json: {
      maxChunkSize: 800,
      overlapSize: 80,
      splitOn: ['{', '}'],
      preserveStructure: false
    },
    markdown: {
      maxChunkSize: 1500,
      overlapSize: 150,
      splitOn: ['# ', '## ', '### ', '#### '],
      preserveStructure: true
    },
    default: {
      maxChunkSize: 1000,
      overlapSize: 100,
      splitOn: ['\n\n', '\n'],
      preserveStructure: false
    }
  };

  async chunkFiles(files: RepoFile[], repoId: string): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];

    for (const file of files) {
      try {
        const fileChunks = await this.chunkFile(file, repoId);
        chunks.push(...fileChunks);
      } catch (error) {
        logger.warn(`Failed to chunk file ${file.path}:`, error);
      }
    }

    logger.info(`Generated ${chunks.length} chunks from ${files.length} files`);
    return chunks;
  }

  private async chunkFile(file: RepoFile, repoId: string): Promise<CodeChunk[]> {
    const strategy = this.strategies[file.language] || this.strategies.default;
    const chunks: CodeChunk[] = [];

    // For small files, create a single chunk
    if (file.content.length <= strategy.maxChunkSize) {
      chunks.push({
        id: uuidv4(),
        content: this.enhanceChunkContent(file),
        metadata: {
          filePath: file.path,
          startLine: 1,
          endLine: file.content.split('\n').length,
          language: file.language,
          repoId
        }
      });
      return chunks;
    }

    // For larger files, use intelligent chunking
    if (strategy.preserveStructure) {
      return this.structureAwareChunking(file, strategy, repoId);
    } else {
      return this.simpleChunking(file, strategy, repoId);
    }
  }

  private structureAwareChunking(file: RepoFile, strategy: ChunkingStrategy, repoId: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = file.content.split('\n');
    
    // Find structural boundaries (functions, classes, etc.)
    const boundaries = this.findStructuralBoundaries(lines, strategy.splitOn);
    
    let currentChunk = '';
    let currentStartLine = 1;
    let currentEndLine = 1;

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      const nextBoundary = boundaries[i + 1];
      
      // Extract content between boundaries
      const sectionLines = lines.slice(
        boundary.lineNumber - 1, 
        nextBoundary ? nextBoundary.lineNumber - 1 : lines.length
      );
      const sectionContent = sectionLines.join('\n');

      // If adding this section would exceed max size, finalize current chunk
      if (currentChunk.length + sectionContent.length > strategy.maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          id: uuidv4(),
          content: this.enhanceChunkContent({
            ...file,
            content: currentChunk,
            path: file.path
          }),
          metadata: {
            filePath: file.path,
            startLine: currentStartLine,
            endLine: currentEndLine,
            language: file.language,
            repoId
          }
        });

        // Start new chunk with overlap
        const overlapLines = Math.min(strategy.overlapSize / 50, 5); // Approximate lines for overlap
        const overlapContent = lines.slice(
          Math.max(0, currentEndLine - overlapLines - 1),
          currentEndLine - 1
        ).join('\n');
        
        currentChunk = overlapContent + '\n' + sectionContent;
        currentStartLine = Math.max(1, currentEndLine - overlapLines);
      } else {
        currentChunk += (currentChunk ? '\n' : '') + sectionContent;
      }

      currentEndLine = nextBoundary ? nextBoundary.lineNumber - 1 : lines.length;
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim()) {
      chunks.push({
        id: uuidv4(),
        content: this.enhanceChunkContent({
          ...file,
          content: currentChunk,
          path: file.path
        }),
        metadata: {
          filePath: file.path,
          startLine: currentStartLine,
          endLine: currentEndLine,
          language: file.language,
          repoId
        }
      });
    }

    return chunks;
  }

  private simpleChunking(file: RepoFile, strategy: ChunkingStrategy, repoId: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const content = file.content;
    const lines = content.split('\n');

    for (let i = 0; i < content.length; i += strategy.maxChunkSize - strategy.overlapSize) {
      const chunkContent = content.slice(i, i + strategy.maxChunkSize);
      
      // Calculate line numbers for this chunk
      const beforeChunk = content.slice(0, i);
      const startLine = beforeChunk.split('\n').length;
      const endLine = startLine + chunkContent.split('\n').length - 1;

      chunks.push({
        id: uuidv4(),
        content: this.enhanceChunkContent({
          ...file,
          content: chunkContent,
          path: file.path
        }),
        metadata: {
          filePath: file.path,
          startLine,
          endLine,
          language: file.language,
          repoId
        }
      });
    }

    return chunks;
  }

  private findStructuralBoundaries(lines: string[], splitPatterns: string[]): Array<{ lineNumber: number, pattern: string }> {
    const boundaries: Array<{ lineNumber: number, pattern: string }> = [];

    lines.forEach((line, index) => {
      for (const pattern of splitPatterns) {
        if (line.trim().startsWith(pattern.trim()) || line.includes(pattern)) {
          boundaries.push({
            lineNumber: index + 1,
            pattern
          });
          break; // Only match first pattern per line
        }
      }
    });

    // Always include the first line as a boundary
    if (boundaries.length === 0 || boundaries[0].lineNumber !== 1) {
      boundaries.unshift({ lineNumber: 1, pattern: 'start' });
    }

    return boundaries.sort((a, b) => a.lineNumber - b.lineNumber);
  }

  private enhanceChunkContent(file: { content: string, path: string, language: string }): string {
    // Add context information to help with embedding quality
    const pathContext = `File: ${file.path}\nLanguage: ${file.language}\n\n`;
    
    // Add file type specific context
    let typeContext = '';
    if (file.path.includes('test') || file.path.includes('spec')) {
      typeContext = 'Type: Test file\n';
    } else if (file.path.includes('config') || file.path.includes('.config.')) {
      typeContext = 'Type: Configuration file\n';
    } else if (file.path.includes('docker') || file.path.toLowerCase().includes('dockerfile')) {
      typeContext = 'Type: Docker configuration\n';
    } else if (file.path.includes('k8s') || file.path.includes('kubernetes')) {
      typeContext = 'Type: Kubernetes configuration\n';
    } else if (file.path.includes('.github/workflows')) {
      typeContext = 'Type: GitHub Actions workflow\n';
    }

    return pathContext + typeContext + file.content;
  }

  // Utility method to get chunk statistics
  getChunkingStats(chunks: CodeChunk[]): {
    totalChunks: number;
    averageSize: number;
    languageDistribution: Record<string, number>;
    fileTypeDistribution: Record<string, number>;
  } {
    const languageDistribution: Record<string, number> = {};
    const fileTypeDistribution: Record<string, number> = {};
    let totalSize = 0;

    chunks.forEach(chunk => {
      languageDistribution[chunk.metadata.language] = (languageDistribution[chunk.metadata.language] || 0) + 1;
      
      const fileExtension = chunk.metadata.filePath.split('.').pop() || 'unknown';
      fileTypeDistribution[fileExtension] = (fileTypeDistribution[fileExtension] || 0) + 1;
      
      totalSize += chunk.content.length;
    });

    return {
      totalChunks: chunks.length,
      averageSize: chunks.length > 0 ? Math.round(totalSize / chunks.length) : 0,
      languageDistribution,
      fileTypeDistribution
    };
  }
}

export const codeChunkerService = new CodeChunkerService(); 