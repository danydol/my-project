import OpenAI from 'openai';
import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger';

export interface CodeChunk {
  id: string;
  content: string;
  metadata: {
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    repoId: string;
  };
}

export interface StoredChunk extends CodeChunk {
  embedding: number[];
  createdAt: Date;
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
}

class VectorStoreService {
  private openai: OpenAI;
  private db: Db | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  private async getDatabase(): Promise<Db> {
    if (!this.db) {
      const client = new MongoClient(process.env.MONGODB_URL!);
      await client.connect();
      this.db = client.db('deployai_vectors');
    }
    return this.db;
  }

  private getCollectionName(repoId: string): string {
    return `repo_${repoId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  async initializeCollection(repoId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const collectionName = this.getCollectionName(repoId);
      
      // Create collection if it doesn't exist
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await db.createCollection(collectionName);
        logger.info(`Created collection: ${collectionName}`);
      } else {
        logger.info(`Collection ${collectionName} already exists`);
      }
    } catch (error) {
      logger.error('Error initializing collection:', error);
      throw error;
    }
  }

  async addChunks(repoId: string, chunks: CodeChunk[]): Promise<void> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection<StoredChunk>(this.getCollectionName(repoId));

      // Generate embeddings for chunks in batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Generate embeddings for the batch
        const embeddings = await this.generateEmbeddings(batch.map(chunk => chunk.content));
        
        // Prepare documents for insertion
        const documents: StoredChunk[] = batch.map((chunk, index) => ({
          ...chunk,
          embedding: embeddings[index],
          createdAt: new Date()
        }));

        // Insert batch
        await collection.insertMany(documents);
        
        logger.info(`Added batch ${Math.floor(i / batchSize) + 1} (${documents.length} chunks) to ${this.getCollectionName(repoId)}`);
        
        // Add delay to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Successfully added ${chunks.length} chunks to collection`);
    } catch (error) {
      logger.error('Error adding chunks to vector store:', error);
      throw error;
    }
  }

  async searchSimilar(repoId: string, query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection<StoredChunk>(this.getCollectionName(repoId));

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all documents (in a real implementation, you'd use vector search)
      const documents = await collection.find({}).toArray();

      // Calculate cosine similarity for each document
      const results = documents.map(doc => ({
        chunk: {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata
        },
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      // Sort by similarity score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error searching vector store:', error);
      throw error;
    }
  }

  async deleteCollection(repoId: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const collectionName = this.getCollectionName(repoId);
      await db.collection(collectionName).drop();
      logger.info(`Deleted collection: ${collectionName}`);
    } catch (error) {
      logger.error('Error deleting collection:', error);
      throw error;
    }
  }

  async getCollectionStats(repoId: string): Promise<{ count: number }> {
    try {
      const db = await this.getDatabase();
      const collection = db.collection(this.getCollectionName(repoId));
      const count = await collection.countDocuments();
      return { count };
    } catch (error) {
      logger.error('Error getting collection stats:', error);
      return { count: 0 };
    }
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const vectorStoreService = new VectorStoreService(); 