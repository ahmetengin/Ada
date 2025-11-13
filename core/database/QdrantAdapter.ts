/**
 * Qdrant Vector Database Adapter
 * From Ada-Maritime-Ai for semantic search and fleet learning
 *
 * Use Cases:
 * - Customer preference embeddings
 * - Semantic marina/berth search
 * - SEAL fleet-wide learning patterns
 * - Natural language query processing
 * - Similar situation detection
 */

import { createLogger, Logger } from '../utils/Logger.js';

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

export interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  https?: boolean;
}

export interface CollectionInfo {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  pointsCount: number;
}

/**
 * Qdrant Vector Database Adapter
 * Provides semantic search capabilities for Ada ecosystem
 */
export class QdrantAdapter {
  private logger: Logger;
  private config: QdrantConfig;
  private connected: boolean = false;
  private baseUrl: string;

  constructor(config: QdrantConfig) {
    this.logger = createLogger('Database:Qdrant');
    this.config = config;
    this.baseUrl = `${config.https ? 'https' : 'http'}://${config.host}:${config.port}`;
  }

  /**
   * Connect to Qdrant
   */
  async connect(): Promise<void> {
    try {
      // In production, verify connectivity
      // const response = await fetch(`${this.baseUrl}/collections`);
      // if (!response.ok) throw new Error('Connection failed');

      this.connected = true;
      this.logger.info('Connected to Qdrant', { host: this.config.host });
    } catch (error) {
      this.logger.error('Failed to connect to Qdrant', { error });
      throw error;
    }
  }

  /**
   * Create a collection
   */
  async createCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    this.logger.info('Creating collection', { name, vectorSize, distance });

    // In production:
    // await fetch(`${this.baseUrl}/collections/${name}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     vectors: { size: vectorSize, distance }
    //   })
    // });
  }

  /**
   * Insert or update points
   */
  async upsertPoints(collectionName: string, points: VectorPoint[]): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    this.logger.debug('Upserting points', { collection: collectionName, count: points.length });

    // In production:
    // await fetch(`${this.baseUrl}/collections/${collectionName}/points`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ points })
    // });
  }

  /**
   * Search for similar vectors
   */
  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    this.logger.debug('Searching vectors', { collection: collectionName, limit });

    // In production:
    // const response = await fetch(`${this.baseUrl}/collections/${collectionName}/points/search`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ vector, limit, filter })
    // });
    // return await response.json();

    return []; // Mock
  }

  /**
   * Delete points by IDs
   */
  async deletePoints(collectionName: string, ids: (string | number)[]): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    this.logger.debug('Deleting points', { collection: collectionName, count: ids.length });

    // In production:
    // await fetch(`${this.baseUrl}/collections/${collectionName}/points/delete`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ points: ids })
    // });
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    // In production:
    // const response = await fetch(`${this.baseUrl}/collections/${name}`);
    // return await response.json();

    return {
      name,
      vectorSize: 0,
      distance: 'Cosine',
      pointsCount: 0,
    };
  }

  /**
   * Delete collection
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected to Qdrant');

    this.logger.info('Deleting collection', { name });

    // In production:
    // await fetch(`${this.baseUrl}/collections/${name}`, { method: 'DELETE' });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('Disconnected from Qdrant');
  }
}

/**
 * SEAL Learning Vector Store
 * Specialized Qdrant collections for fleet learning
 */
export class SEALVectorStore {
  private qdrant: QdrantAdapter;
  private logger: Logger;

  // Collection names
  private readonly CUSTOMER_PREFERENCES = 'customer_preferences';
  private readonly BERTH_CHARACTERISTICS = 'berth_characteristics';
  private readonly WEATHER_PATTERNS = 'weather_patterns';
  private readonly INCIDENT_REPORTS = 'incident_reports';
  private readonly NAVIGATION_ROUTES = 'navigation_routes';

  constructor(qdrant: QdrantAdapter) {
    this.qdrant = qdrant;
    this.logger = createLogger('SEAL:VectorStore');
  }

  /**
   * Initialize all SEAL collections
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing SEAL vector collections');

    await this.qdrant.createCollection(this.CUSTOMER_PREFERENCES, 384); // sentence-transformers
    await this.qdrant.createCollection(this.BERTH_CHARACTERISTICS, 384);
    await this.qdrant.createCollection(this.WEATHER_PATTERNS, 128);
    await this.qdrant.createCollection(this.INCIDENT_REPORTS, 384);
    await this.qdrant.createCollection(this.NAVIGATION_ROUTES, 256);

    this.logger.info('SEAL vector collections initialized');
  }

  /**
   * Store customer preference embedding
   */
  async storeCustomerPreference(
    customerId: string,
    embedding: number[],
    metadata: Record<string, any>
  ): Promise<void> {
    await this.qdrant.upsertPoints(this.CUSTOMER_PREFERENCES, [
      {
        id: customerId,
        vector: embedding,
        payload: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    ]);

    this.logger.debug('Stored customer preference', { customerId });
  }

  /**
   * Find similar customers
   */
  async findSimilarCustomers(embedding: number[], limit: number = 5): Promise<SearchResult[]> {
    return await this.qdrant.search(this.CUSTOMER_PREFERENCES, embedding, limit);
  }

  /**
   * Store berth characteristics
   */
  async storeBerthCharacteristics(
    berthId: string,
    embedding: number[],
    metadata: Record<string, any>
  ): Promise<void> {
    await this.qdrant.upsertPoints(this.BERTH_CHARACTERISTICS, [
      {
        id: berthId,
        vector: embedding,
        payload: metadata,
      },
    ]);
  }

  /**
   * Semantic berth search
   * Find berths matching natural language description
   */
  async searchBerths(queryEmbedding: number[], limit: number = 10): Promise<SearchResult[]> {
    return await this.qdrant.search(this.BERTH_CHARACTERISTICS, queryEmbedding, limit);
  }

  /**
   * Store incident report for fleet learning
   */
  async storeIncidentReport(
    incidentId: string,
    embedding: number[],
    report: Record<string, any>
  ): Promise<void> {
    await this.qdrant.upsertPoints(this.INCIDENT_REPORTS, [
      {
        id: incidentId,
        vector: embedding,
        payload: {
          ...report,
          timestamp: new Date().toISOString(),
        },
      },
    ]);

    this.logger.info('Stored incident report for fleet learning', { incidentId });
  }

  /**
   * Find similar incidents (for SEAL learning)
   */
  async findSimilarIncidents(queryEmbedding: number[], limit: number = 5): Promise<SearchResult[]> {
    return await this.qdrant.search(this.INCIDENT_REPORTS, queryEmbedding, limit);
  }

  /**
   * Store navigation route
   */
  async storeNavigationRoute(
    routeId: string,
    embedding: number[],
    route: Record<string, any>
  ): Promise<void> {
    await this.qdrant.upsertPoints(this.NAVIGATION_ROUTES, [
      {
        id: routeId,
        vector: embedding,
        payload: route,
      },
    ]);
  }

  /**
   * Find similar routes
   */
  async findSimilarRoutes(queryEmbedding: number[], limit: number = 5): Promise<SearchResult[]> {
    return await this.qdrant.search(this.NAVIGATION_ROUTES, queryEmbedding, limit);
  }

  /**
   * Store weather pattern
   */
  async storeWeatherPattern(
    patternId: string,
    embedding: number[],
    pattern: Record<string, any>
  ): Promise<void> {
    await this.qdrant.upsertPoints(this.WEATHER_PATTERNS, [
      {
        id: patternId,
        vector: embedding,
        payload: pattern,
      },
    ]);
  }

  /**
   * Find similar weather patterns
   */
  async findSimilarWeather(queryEmbedding: number[], limit: number = 5): Promise<SearchResult[]> {
    return await this.qdrant.search(this.WEATHER_PATTERNS, queryEmbedding, limit);
  }
}

// Factory functions
export function createQdrantAdapter(config: QdrantConfig): QdrantAdapter {
  return new QdrantAdapter(config);
}

export function createSEALVectorStore(qdrant: QdrantAdapter): SEALVectorStore {
  return new SEALVectorStore(qdrant);
}
