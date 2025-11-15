/**
 * NodeRegistry - Centralized service discovery for distributed nodes
 *
 * Provides a registry service where nodes can register themselves,
 * discover other nodes, and maintain health status.
 */

import { EventEmitter } from 'eventemitter3';
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { RemoteNodeInfo } from '../transport/NetworkTransport';

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** Port to listen on (default: 3000) */
  port?: number;

  /** Host to bind to (default: '0.0.0.0') */
  host?: string;

  /** Health check interval in milliseconds (default: 30000) */
  healthCheckInterval?: number;

  /** Node timeout in milliseconds (default: 60000) */
  nodeTimeout?: number;

  /** Enable authentication (default: false) */
  requireAuth?: boolean;

  /** Authentication token */
  authToken?: string;
}

/**
 * Node registration data
 */
export interface NodeRegistration extends RemoteNodeInfo {
  /** Capabilities */
  capabilities?: string[];

  /** Status (online, offline, degraded) */
  status?: 'online' | 'offline' | 'degraded';

  /** Load percentage (0-100) */
  load?: number;

  /** Health check endpoint */
  healthEndpoint?: string;
}

/**
 * Registry events
 */
export interface RegistryEvents {
  /** Node registered */
  'node:registered': (node: NodeRegistration) => void;

  /** Node updated */
  'node:updated': (node: NodeRegistration) => void;

  /** Node deregistered */
  'node:deregistered': (nodeId: string) => void;

  /** Node health changed */
  'node:health': (nodeId: string, status: 'online' | 'offline' | 'degraded') => void;
}

/**
 * Node Registry Service
 *
 * Features:
 * - RESTful API for node registration
 * - Service discovery
 * - Health monitoring
 * - Load balancing metadata
 * - Event-driven updates
 */
export class NodeRegistry extends EventEmitter<RegistryEvents> {
  private config: RegistryConfig;
  private app: Express;
  private server?: Server;
  private nodes: Map<string, NodeRegistration> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: RegistryConfig = {}) {
    super();
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      healthCheckInterval: 30000,
      nodeTimeout: 60000,
      requireAuth: false,
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Start the registry service
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`Node Registry listening on ${this.config.host}:${this.config.port}`);
        this.startHealthCheck();
        resolve();
      });
    });
  }

  /**
   * Stop the registry service
   */
  async stop(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = undefined;
    }
  }

  /**
   * Get all registered nodes
   */
  getAllNodes(): NodeRegistration[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string): NodeRegistration | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: string): NodeRegistration[] {
    return this.getAllNodes().filter(node => node.type === type);
  }

  /**
   * Get online nodes
   */
  getOnlineNodes(): NodeRegistration[] {
    return this.getAllNodes().filter(node => node.status === 'online');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Authentication middleware
    if (this.config.requireAuth) {
      this.app.use((req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token !== this.config.authToken) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      });
    }
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        nodeCount: this.nodes.size,
        timestamp: new Date().toISOString()
      });
    });

    // Register a node
    this.app.post('/nodes', (req: Request, res: Response) => {
      try {
        const registration = req.body as NodeRegistration;

        if (!registration.id || !registration.name || !registration.type) {
          res.status(400).json({ error: 'Missing required fields: id, name, type' });
          return;
        }

        const node: NodeRegistration = {
          ...registration,
          lastSeen: new Date(),
          status: registration.status || 'online'
        };

        const isNew = !this.nodes.has(node.id);
        this.nodes.set(node.id, node);

        if (isNew) {
          this.emit('node:registered', node);
        } else {
          this.emit('node:updated', node);
        }

        res.status(isNew ? 201 : 200).json(node);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get all nodes
    this.app.get('/nodes', (req: Request, res: Response) => {
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;

      let nodes = this.getAllNodes();

      if (type) {
        nodes = nodes.filter(node => node.type === type);
      }

      if (status) {
        nodes = nodes.filter(node => node.status === status);
      }

      res.json(nodes);
    });

    // Get a specific node
    this.app.get('/nodes/:nodeId', (req: Request, res: Response) => {
      const node = this.nodes.get(req.params.nodeId);

      if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
      }

      res.json(node);
    });

    // Update node status/metadata
    this.app.put('/nodes/:nodeId', (req: Request, res: Response) => {
      const node = this.nodes.get(req.params.nodeId);

      if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
      }

      const updates = req.body;
      const updated: NodeRegistration = {
        ...node,
        ...updates,
        id: node.id, // Prevent ID change
        lastSeen: new Date()
      };

      this.nodes.set(node.id, updated);
      this.emit('node:updated', updated);

      res.json(updated);
    });

    // Heartbeat (update lastSeen)
    this.app.post('/nodes/:nodeId/heartbeat', (req: Request, res: Response) => {
      const node = this.nodes.get(req.params.nodeId);

      if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
      }

      node.lastSeen = new Date();
      node.status = 'online';

      if (req.body.load !== undefined) {
        node.load = req.body.load;
      }

      this.nodes.set(node.id, node);

      res.json({ status: 'ok', lastSeen: node.lastSeen });
    });

    // Deregister a node
    this.app.delete('/nodes/:nodeId', (req: Request, res: Response) => {
      const node = this.nodes.get(req.params.nodeId);

      if (!node) {
        res.status(404).json({ error: 'Node not found' });
        return;
      }

      this.nodes.delete(req.params.nodeId);
      this.emit('node:deregistered', req.params.nodeId);

      res.json({ status: 'ok' });
    });

    // Get nodes by capability
    this.app.get('/capabilities/:capability', (req: Request, res: Response) => {
      const capability = req.params.capability;
      const nodes = this.getAllNodes().filter(node =>
        node.capabilities?.includes(capability)
      );

      res.json(nodes);
    });

    // Get registry statistics
    this.app.get('/stats', (req: Request, res: Response) => {
      const nodes = this.getAllNodes();
      const stats = {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter(n => n.status === 'online').length,
        offlineNodes: nodes.filter(n => n.status === 'offline').length,
        degradedNodes: nodes.filter(n => n.status === 'degraded').length,
        byType: {} as Record<string, number>,
        averageLoad: 0
      };

      // Count by type
      for (const node of nodes) {
        stats.byType[node.type] = (stats.byType[node.type] || 0) + 1;
      }

      // Calculate average load
      const nodesWithLoad = nodes.filter(n => n.load !== undefined);
      if (nodesWithLoad.length > 0) {
        stats.averageLoad = nodesWithLoad.reduce((sum, n) => sum + (n.load || 0), 0) / nodesWithLoad.length;
      }

      res.json(stats);
    });
  }

  /**
   * Start health checking
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.nodeTimeout!;

      for (const [nodeId, node] of this.nodes.entries()) {
        const age = now - node.lastSeen.getTime();

        if (age > timeout) {
          // Node timed out
          if (node.status !== 'offline') {
            node.status = 'offline';
            this.emit('node:health', nodeId, 'offline');
            console.warn(`Node ${nodeId} (${node.name}) went offline`);
          }
        } else if (age > timeout / 2) {
          // Node is degraded
          if (node.status !== 'degraded') {
            node.status = 'degraded';
            this.emit('node:health', nodeId, 'degraded');
            console.warn(`Node ${nodeId} (${node.name}) is degraded`);
          }
        } else {
          // Node is healthy
          if (node.status !== 'online') {
            node.status = 'online';
            this.emit('node:health', nodeId, 'online');
            console.log(`Node ${nodeId} (${node.name}) is back online`);
          }
        }
      }
    }, this.config.healthCheckInterval);
  }
}

/**
 * Registry Client - For nodes to interact with the registry
 */
export class RegistryClient {
  private registryUrl: string;
  private authToken?: string;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(registryUrl: string, authToken?: string) {
    this.registryUrl = registryUrl.replace(/\/$/, '');
    this.authToken = authToken;
  }

  /**
   * Register a node with the registry
   */
  async register(node: NodeRegistration): Promise<NodeRegistration> {
    const response = await fetch(`${this.registryUrl}/nodes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(node)
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Deregister a node
   */
  async deregister(nodeId: string): Promise<void> {
    const response = await fetch(`${this.registryUrl}/nodes/${nodeId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Deregistration failed: ${response.statusText}`);
    }
  }

  /**
   * Send heartbeat
   */
  async heartbeat(nodeId: string, load?: number): Promise<void> {
    const response = await fetch(`${this.registryUrl}/nodes/${nodeId}/heartbeat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ load })
    });

    if (!response.ok) {
      throw new Error(`Heartbeat failed: ${response.statusText}`);
    }
  }

  /**
   * Get all nodes
   */
  async getNodes(filters?: { type?: string; status?: string }): Promise<NodeRegistration[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const url = `${this.registryUrl}/nodes?${params.toString()}`;
    const response = await fetch(url, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to get nodes: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific node
   */
  async getNode(nodeId: string): Promise<NodeRegistration> {
    const response = await fetch(`${this.registryUrl}/nodes/${nodeId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get node: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update node metadata
   */
  async updateNode(nodeId: string, updates: Partial<NodeRegistration>): Promise<NodeRegistration> {
    const response = await fetch(`${this.registryUrl}/nodes/${nodeId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update node: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start automatic heartbeat
   */
  startHeartbeat(nodeId: string, interval: number = 30000, loadFn?: () => number): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(async () => {
      try {
        const load = loadFn ? loadFn() : undefined;
        await this.heartbeat(nodeId, load);
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, interval);
  }

  /**
   * Stop automatic heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Get HTTP headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}
