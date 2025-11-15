/**
 * RedisTransport - Redis Pub/Sub-based network transport
 *
 * Provides message broker-based communication between distributed nodes
 * using Redis Pub/Sub for reliable message delivery and broadcasting.
 */

import { createClient, RedisClientType } from 'redis';
import { NetworkTransport, TransportConfig, TransportStatus, RemoteNodeInfo } from './NetworkTransport';
import { NodeMessage } from '../types';

/**
 * Redis-specific configuration
 */
export interface RedisTransportConfig extends TransportConfig {
  options?: {
    /** Redis server URL (default: redis://localhost:6379) */
    redisUrl?: string;

    /** Redis password */
    password?: string;

    /** Redis database number (default: 0) */
    database?: number;

    /** Channel prefix (default: 'ada:node:') */
    channelPrefix?: string;

    /** Heartbeat interval in milliseconds (default: 30000) */
    heartbeatInterval?: number;

    /** Node timeout in milliseconds (default: 60000) */
    nodeTimeout?: number;

    /** Auto-reconnect on disconnect (default: true) */
    autoReconnect?: boolean;
  };
}

/**
 * Redis message envelope
 */
interface RedisMessageEnvelope {
  /** Sender node ID */
  from: string;

  /** Target node ID (or 'broadcast') */
  to: string;

  /** Message payload */
  message: NodeMessage;

  /** Timestamp */
  timestamp: number;
}

/**
 * Node presence information stored in Redis
 */
interface NodePresence {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  lastSeen: number;
  metadata?: Record<string, any>;
}

/**
 * Redis Transport Implementation
 *
 * Features:
 * - Pub/Sub messaging
 * - Broadcast and unicast
 * - Node presence/discovery via Redis
 * - Automatic cleanup of stale nodes
 * - Message persistence (optional)
 */
export class RedisTransport extends NetworkTransport {
  private publisher?: RedisClientType;
  private subscriber?: RedisClientType;
  private presenceClient?: RedisClientType;
  private heartbeatTimer?: NodeJS.Timeout;
  private presenceCheckTimer?: NodeJS.Timeout;
  private channelPrefix: string;

  constructor(config: RedisTransportConfig) {
    super(config);
    const options = (this.config.options || {}) as RedisTransportConfig['options'];
    this.channelPrefix = options?.channelPrefix || 'ada:node:';
  }

  /**
   * Start the Redis transport
   */
  async start(): Promise<void> {
    this.setStatus(TransportStatus.CONNECTING);

    const options = (this.config.options || {}) as RedisTransportConfig['options'];
    const redisUrl = options?.redisUrl || 'redis://localhost:6379';

    try {
      // Create Redis clients
      this.publisher = createClient({
        url: redisUrl,
        password: options?.password,
        database: options?.database || 0
      });

      this.subscriber = createClient({
        url: redisUrl,
        password: options?.password,
        database: options?.database || 0
      });

      this.presenceClient = createClient({
        url: redisUrl,
        password: options?.password,
        database: options?.database || 0
      });

      // Connect all clients
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect(),
        this.presenceClient.connect()
      ]);

      // Subscribe to node's dedicated channel
      const nodeChannel = this.getNodeChannel(this.config.nodeId);
      await this.subscriber.subscribe(nodeChannel, (message) => {
        this.handleRedisMessage(message);
      });

      // Subscribe to broadcast channel
      const broadcastChannel = this.getBroadcastChannel();
      await this.subscriber.subscribe(broadcastChannel, (message) => {
        this.handleRedisMessage(message);
      });

      // Register node presence
      await this.registerPresence();

      // Start heartbeat
      this.startHeartbeat();

      // Start presence checking
      this.startPresenceCheck();

      // Discover existing nodes
      await this.discoverNodes();

      this.setStatus(TransportStatus.CONNECTED);
      this.emit('ready');
    } catch (error) {
      this.setStatus(TransportStatus.FAILED);
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the Redis transport
   */
  async stop(): Promise<void> {
    this.setStatus(TransportStatus.DISCONNECTED);

    // Stop timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.presenceCheckTimer) {
      clearInterval(this.presenceCheckTimer);
      this.presenceCheckTimer = undefined;
    }

    // Unregister presence
    await this.unregisterPresence();

    // Disconnect clients
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = undefined;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = undefined;
    }

    if (this.presenceClient) {
      await this.presenceClient.quit();
      this.presenceClient = undefined;
    }

    this.connectedNodes.clear();
  }

  /**
   * Send message to a specific node
   */
  async sendToNode(nodeId: string, message: NodeMessage): Promise<void> {
    if (!this.publisher) {
      throw new Error('Transport not started');
    }

    const envelope: RedisMessageEnvelope = {
      from: this.config.nodeId,
      to: nodeId,
      message,
      timestamp: Date.now()
    };

    const channel = this.getNodeChannel(nodeId);
    await this.publisher.publish(channel, JSON.stringify(envelope));
  }

  /**
   * Broadcast message to all nodes
   */
  async broadcast(message: NodeMessage): Promise<void> {
    if (!this.publisher) {
      throw new Error('Transport not started');
    }

    const envelope: RedisMessageEnvelope = {
      from: this.config.nodeId,
      to: 'broadcast',
      message,
      timestamp: Date.now()
    };

    const channel = this.getBroadcastChannel();
    await this.publisher.publish(channel, JSON.stringify(envelope));
  }

  /**
   * Connect to a remote node (no-op for Redis, uses presence discovery)
   */
  async connectToRemote(endpoint: string, nodeInfo?: Partial<RemoteNodeInfo>): Promise<void> {
    // Redis uses presence-based discovery, not direct connections
    // This method is here for interface compatibility
    console.log(`Redis transport uses presence-based discovery. Endpoint ${endpoint} noted.`);
  }

  /**
   * Disconnect from a remote node
   */
  async disconnectFromRemote(nodeId: string): Promise<void> {
    this.unregisterNode(nodeId);
  }

  /**
   * Handle incoming Redis message
   */
  private handleRedisMessage(data: string): void {
    try {
      const envelope = JSON.parse(data) as RedisMessageEnvelope;

      // Ignore messages from self
      if (envelope.from === this.config.nodeId) {
        return;
      }

      // Update node presence
      this.updateNodePresence(envelope.from);

      // Handle message
      this.handleMessage(envelope.message);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Register this node's presence in Redis
   */
  private async registerPresence(): Promise<void> {
    if (!this.presenceClient) return;

    const presence: NodePresence = {
      id: this.config.nodeId,
      name: this.config.nodeName,
      type: 'unknown', // Can be set via config
      endpoint: `redis://${this.config.nodeId}`,
      lastSeen: Date.now(),
      metadata: {}
    };

    const key = this.getPresenceKey(this.config.nodeId);
    await this.presenceClient.set(key, JSON.stringify(presence));

    // Set expiration (2x heartbeat interval)
    const options = (this.config.options || {}) as RedisTransportConfig['options'];
    const ttl = ((options?.heartbeatInterval || 30000) * 2) / 1000;
    await this.presenceClient.expire(key, Math.ceil(ttl));
  }

  /**
   * Unregister this node's presence
   */
  private async unregisterPresence(): Promise<void> {
    if (!this.presenceClient) return;

    const key = this.getPresenceKey(this.config.nodeId);
    await this.presenceClient.del(key);
  }

  /**
   * Update presence timestamp
   */
  private async updatePresence(): Promise<void> {
    await this.registerPresence();
  }

  /**
   * Update remote node's last seen time
   */
  private updateNodePresence(nodeId: string): void {
    const node = this.connectedNodes.get(nodeId);
    if (node) {
      node.lastSeen = new Date();
    }
  }

  /**
   * Discover active nodes from Redis
   */
  private async discoverNodes(): Promise<void> {
    if (!this.presenceClient) return;

    const pattern = this.getPresenceKey('*');
    const keys = await this.presenceClient.keys(pattern);

    for (const key of keys) {
      const data = await this.presenceClient.get(key);
      if (!data) continue;

      try {
        const presence = JSON.parse(data) as NodePresence;

        // Skip self
        if (presence.id === this.config.nodeId) continue;

        // Check if node is active
        const options = (this.config.options || {}) as RedisTransportConfig['options'];
        const timeout = options?.nodeTimeout || 60000;
        const age = Date.now() - presence.lastSeen;

        if (age < timeout) {
          const nodeInfo: RemoteNodeInfo = {
            id: presence.id,
            name: presence.name,
            type: presence.type,
            endpoint: presence.endpoint,
            lastSeen: new Date(presence.lastSeen),
            metadata: presence.metadata
          };

          this.registerNode(nodeInfo);
        }
      } catch (error) {
        this.handleError(error as Error);
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    const options = (this.config.options || {}) as RedisTransportConfig['options'];
    const interval = options?.heartbeatInterval || 30000;

    this.heartbeatTimer = setInterval(async () => {
      await this.updatePresence();
    }, interval);
  }

  /**
   * Start presence checking (cleanup stale nodes)
   */
  private startPresenceCheck(): void {
    const options = (this.config.options || {}) as RedisTransportConfig['options'];
    const interval = options?.heartbeatInterval || 30000;
    const timeout = options?.nodeTimeout || 60000;

    this.presenceCheckTimer = setInterval(() => {
      const now = Date.now();

      for (const [nodeId, nodeInfo] of this.connectedNodes.entries()) {
        const age = now - nodeInfo.lastSeen.getTime();
        if (age > timeout) {
          console.warn(`Node ${nodeId} timed out, removing from connected nodes`);
          this.unregisterNode(nodeId);
        }
      }
    }, interval);
  }

  /**
   * Get Redis channel for a specific node
   */
  private getNodeChannel(nodeId: string): string {
    return `${this.channelPrefix}${nodeId}`;
  }

  /**
   * Get Redis broadcast channel
   */
  private getBroadcastChannel(): string {
    return `${this.channelPrefix}broadcast`;
  }

  /**
   * Get Redis key for node presence
   */
  private getPresenceKey(nodeId: string): string {
    return `${this.channelPrefix}presence:${nodeId}`;
  }
}
