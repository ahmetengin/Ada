/**
 * DistributedNodeCommunication - Distributed communication layer for Ada nodes
 *
 * Extends NodeCommunication to support distributed communication across
 * multiple processes and machines using pluggable transport layers.
 *
 * Features:
 * - Hybrid mode: Local (in-process) + Remote (network) communication
 * - Pluggable transports (WebSocket, Redis, etc.)
 * - Service discovery via registry
 * - Automatic routing (local vs remote)
 * - Backward compatible with NodeCommunication
 */

import { NodeCommunication, MessageHandler, MessageFilter } from './NodeCommunication.js';
import { NetworkTransport, RemoteNodeInfo, TransportStatus } from './transport/NetworkTransport.js';
import { RegistryClient, NodeRegistration } from './service/NodeRegistry.js';
import { NodeMessage } from './types.js';

/**
 * Distributed communication configuration
 */
export interface DistributedConfig {
  /** Node unique identifier */
  nodeId: string;

  /** Node name */
  nodeName: string;

  /** Node type (e.g., 'ada.sea', 'ada.marina') */
  nodeType: string;

  /** Communication mode */
  mode?: 'local' | 'distributed' | 'hybrid';

  /** Network transport (optional, required for distributed/hybrid) */
  transport?: NetworkTransport;

  /** Registry client (optional, for service discovery) */
  registry?: {
    url: string;
    authToken?: string;
  };

  /** Node capabilities */
  capabilities?: string[];

  /** Custom metadata */
  metadata?: Record<string, any>;

  /** Load calculation function */
  loadFn?: () => number;
}

/**
 * Distributed Node Communication
 *
 * Extends the base NodeCommunication with distributed capabilities.
 * Automatically routes messages to local or remote nodes based on availability.
 */
export class DistributedNodeCommunication extends NodeCommunication {
  private config: DistributedConfig;
  private transport?: NetworkTransport;
  private registryClient?: RegistryClient;
  private mode: 'local' | 'distributed' | 'hybrid';
  private remoteNodes: Map<string, RemoteNodeInfo> = new Map();

  constructor(config: DistributedConfig) {
    super(config.nodeId);

    this.config = config;
    this.mode = config.mode || 'hybrid';
    this.transport = config.transport;

    // Setup registry client if configured
    if (config.registry) {
      this.registryClient = new RegistryClient(
        config.registry.url,
        config.registry.authToken
      );
    }

    this.setupTransport();
  }

  /**
   * Start distributed communication
   */
  async start(): Promise<void> {
    // Start transport if in distributed or hybrid mode
    if (this.mode !== 'local' && this.transport) {
      await this.transport.start();
    }

    // Register with registry if configured
    if (this.registryClient) {
      await this.registerWithRegistry();
      this.startRegistryHeartbeat();
    }

    // Discover remote nodes if in distributed/hybrid mode
    if (this.mode !== 'local') {
      await this.discoverRemoteNodes();
    }
  }

  /**
   * Stop distributed communication
   */
  async stop(): Promise<void> {
    // Stop registry heartbeat
    if (this.registryClient) {
      this.registryClient.stopHeartbeat();
      await this.registryClient.deregister(this.config.nodeId);
    }

    // Stop transport
    if (this.transport) {
      await this.transport.stop();
    }

    // Cleanup
    this.destroy();
  }

  /**
   * Send a message (override to support distributed routing)
   */
  async send(
    to: string,
    type: NodeMessage['type'],
    subject: string,
    payload: any,
    options: {
      priority?: NodeMessage['priority'];
      requiresResponse?: boolean;
    } = {}
  ): Promise<string> {
    // Create message
    const message: NodeMessage = {
      id: this.generateMessageId(),
      from: this.config.nodeId,
      to,
      type,
      subject,
      payload,
      timestamp: new Date(),
      priority: options.priority || 'normal',
      requiresResponse: options.requiresResponse || false,
    };

    // Route message
    if (to === 'broadcast') {
      await this.sendBroadcast(message);
    } else {
      await this.routeMessage(message);
    }

    return message.id;
  }

  /**
   * Connect to a remote node
   */
  async connectToRemote(endpoint: string, nodeInfo?: Partial<RemoteNodeInfo>): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not configured');
    }

    await this.transport.connectToRemote(endpoint, nodeInfo);
  }

  /**
   * Disconnect from a remote node
   */
  async disconnectFromRemote(nodeId: string): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not configured');
    }

    await this.transport.disconnectFromRemote(nodeId);
    this.remoteNodes.delete(nodeId);
  }

  /**
   * Get all known nodes (local + remote)
   */
  getAllKnownNodes(): Array<{ id: string; type: 'local' | 'remote'; info?: RemoteNodeInfo }> {
    const nodes: Array<{ id: string; type: 'local' | 'remote'; info?: RemoteNodeInfo }> = [];

    // Local nodes
    const localNodes = this.getConnectedNodes();
    for (const nodeId of localNodes) {
      nodes.push({ id: nodeId, type: 'local' });
    }

    // Remote nodes
    for (const [nodeId, info] of this.remoteNodes.entries()) {
      nodes.push({ id: nodeId, type: 'remote', info });
    }

    return nodes;
  }

  /**
   * Get remote node information
   */
  getRemoteNodeInfo(nodeId: string): RemoteNodeInfo | undefined {
    return this.remoteNodes.get(nodeId);
  }

  /**
   * Check if a node is local or remote
   */
  isLocalNode(nodeId: string): boolean {
    return this.isConnected(nodeId);
  }

  /**
   * Check if a node is remote
   */
  isRemoteNode(nodeId: string): boolean {
    return this.remoteNodes.has(nodeId);
  }

  /**
   * Get transport status
   */
  getTransportStatus(): TransportStatus | null {
    return this.transport?.getStatus() || null;
  }

  /**
   * Get communication statistics (extended)
   */
  getDistributedStats(): {
    mode: string;
    localNodes: number;
    remoteNodes: number;
    transportStatus: TransportStatus | null;
    registryConnected: boolean;
  } & ReturnType<typeof NodeCommunication.prototype.getStats> {
    const baseStats = this.getStats();

    return {
      ...baseStats,
      mode: this.mode,
      localNodes: this.getConnectedNodes().length,
      remoteNodes: this.remoteNodes.size,
      transportStatus: this.getTransportStatus(),
      registryConnected: !!this.registryClient,
    };
  }

  /**
   * Setup transport event handlers
   */
  private setupTransport(): void {
    if (!this.transport) return;

    // Handle incoming messages from transport
    this.transport.on('message', (message: NodeMessage) => {
      this.handleRemoteMessage(message);
    });

    // Handle remote node connections
    this.transport.on('node:connected', (nodeInfo: RemoteNodeInfo) => {
      this.remoteNodes.set(nodeInfo.id, nodeInfo);
      this.emit('remote-node-connected', nodeInfo);
      console.log(`Remote node connected: ${nodeInfo.name} (${nodeInfo.id})`);
    });

    // Handle remote node disconnections
    this.transport.on('node:disconnected', (nodeId: string) => {
      this.remoteNodes.delete(nodeId);
      this.emit('remote-node-disconnected', nodeId);
      console.log(`Remote node disconnected: ${nodeId}`);
    });

    // Handle transport errors
    this.transport.on('error', (error: Error) => {
      this.emit('transport-error', error);
      console.error('Transport error:', error);
    });

    // Handle transport status changes
    this.transport.on('status', (status: TransportStatus) => {
      this.emit('transport-status', status);
      console.log(`Transport status: ${status}`);
    });
  }

  /**
   * Route message to appropriate destination (local or remote)
   */
  private async routeMessage(message: NodeMessage): Promise<void> {
    const targetId = message.to;

    // Check if it's a local node first (faster)
    if (this.mode !== 'distributed' && this.isLocalNode(targetId)) {
      // Use local delivery (original NodeCommunication method)
      await super.send(
        message.to,
        message.type,
        message.subject,
        message.payload,
        {
          priority: message.priority,
          requiresResponse: message.requiresResponse,
        }
      );
      return;
    }

    // Check if it's a remote node
    if (this.mode !== 'local' && this.isRemoteNode(targetId)) {
      await this.sendToRemote(message);
      return;
    }

    // Node not found locally, try to discover from registry
    if (this.registryClient) {
      try {
        const nodeInfo = await this.registryClient.getNode(targetId);

        // Add to remote nodes
        const remoteInfo: RemoteNodeInfo = {
          id: nodeInfo.id,
          name: nodeInfo.name,
          type: nodeInfo.type,
          endpoint: nodeInfo.endpoint,
          lastSeen: nodeInfo.lastSeen,
          metadata: nodeInfo.metadata,
        };

        this.remoteNodes.set(targetId, remoteInfo);

        // Connect to remote node if using WebSocket
        if (this.transport && nodeInfo.endpoint) {
          await this.transport.connectToRemote(nodeInfo.endpoint, remoteInfo);
        }

        // Send message
        await this.sendToRemote(message);
        return;
      } catch (error) {
        // Node not found in registry either
      }
    }

    // Node not found anywhere
    this.emit('delivery-failed', message, 'Node not found (local or remote)');
  }

  /**
   * Send message to remote node via transport
   */
  private async sendToRemote(message: NodeMessage): Promise<void> {
    if (!this.transport) {
      throw new Error('Transport not configured for remote communication');
    }

    try {
      await this.transport.sendToNode(message.to, message);
      this.emit('message-sent', message);
    } catch (error) {
      this.emit('delivery-failed', message, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Send broadcast message (local + remote)
   */
  private async sendBroadcast(message: NodeMessage): Promise<void> {
    // Broadcast to local nodes if in local or hybrid mode
    if (this.mode !== 'distributed') {
      await super.send(
        'broadcast',
        message.type,
        message.subject,
        message.payload,
        {
          priority: message.priority,
          requiresResponse: message.requiresResponse,
        }
      );
    }

    // Broadcast to remote nodes if in distributed or hybrid mode
    if (this.mode !== 'local' && this.transport) {
      try {
        await this.transport.broadcast(message);
      } catch (error) {
        this.emit('broadcast-error', error);
      }
    }
  }

  /**
   * Handle message received from remote transport
   */
  private async handleRemoteMessage(message: NodeMessage): Promise<void> {
    // Store in received messages
    this.emit('message-received', message);

    // Handle message using base class handler
    // This will trigger registered handlers
    const handler = this['handlers'].get(message.subject);

    if (handler) {
      try {
        const result = await handler(message);

        if (message.requiresResponse) {
          // Send response back via transport
          const response: NodeMessage = {
            id: this.generateMessageId(),
            from: this.config.nodeId,
            to: message.from,
            type: 'response',
            subject: `Re: ${message.subject}`,
            payload: {
              inReplyTo: message.id,
              data: result,
            },
            timestamp: new Date(),
            priority: message.priority,
            requiresResponse: false,
          };

          await this.sendToRemote(response);

          // Also emit response event for local promise resolution
          this.emit(`response:${message.id}`, result);
        }
      } catch (error) {
        this.emit('handler-error', message, error);

        if (message.requiresResponse) {
          const errorResponse: NodeMessage = {
            id: this.generateMessageId(),
            from: this.config.nodeId,
            to: message.from,
            type: 'response',
            subject: `Re: ${message.subject}`,
            payload: {
              inReplyTo: message.id,
              error: true,
              message: error instanceof Error ? error.message : 'Handler error',
            },
            timestamp: new Date(),
            priority: message.priority,
            requiresResponse: false,
          };

          await this.sendToRemote(errorResponse);
        }
      }
    } else {
      this.emit('unhandled-message', message);
    }
  }

  /**
   * Register this node with the registry
   */
  private async registerWithRegistry(): Promise<void> {
    if (!this.registryClient) return;

    const registration: NodeRegistration = {
      id: this.config.nodeId,
      name: this.config.nodeName,
      type: this.config.nodeType,
      endpoint: this.getNodeEndpoint(),
      lastSeen: new Date(),
      capabilities: this.config.capabilities,
      status: 'online',
      load: this.config.loadFn ? this.config.loadFn() : 0,
      metadata: this.config.metadata,
    };

    await this.registryClient.register(registration);
    console.log(`Registered with registry: ${this.config.nodeName}`);
  }

  /**
   * Start registry heartbeat
   */
  private startRegistryHeartbeat(): void {
    if (!this.registryClient) return;

    this.registryClient.startHeartbeat(
      this.config.nodeId,
      30000,
      this.config.loadFn
    );
  }

  /**
   * Discover remote nodes from registry or transport
   */
  private async discoverRemoteNodes(): Promise<void> {
    // Discover from registry
    if (this.registryClient) {
      try {
        const nodes = await this.registryClient.getNodes({ status: 'online' });

        for (const node of nodes) {
          if (node.id === this.config.nodeId) continue;

          const remoteInfo: RemoteNodeInfo = {
            id: node.id,
            name: node.name,
            type: node.type,
            endpoint: node.endpoint,
            lastSeen: node.lastSeen,
            metadata: node.metadata,
          };

          this.remoteNodes.set(node.id, remoteInfo);
        }

        console.log(`Discovered ${this.remoteNodes.size} remote nodes from registry`);
      } catch (error) {
        console.error('Failed to discover nodes from registry:', error);
      }
    }

    // Discover from transport
    if (this.transport) {
      const connectedNodes = this.transport.getConnectedNodes();
      for (const nodeInfo of connectedNodes) {
        this.remoteNodes.set(nodeInfo.id, nodeInfo);
      }
    }
  }

  /**
   * Get this node's endpoint
   */
  private getNodeEndpoint(): string {
    if (this.transport) {
      const config = this.transport.getConfig();
      const host = config.host || 'localhost';
      const port = config.port || 8080;
      return `ws://${host}:${port}`;
    }

    return `local://${this.config.nodeId}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `${this.config.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
