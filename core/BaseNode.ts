/**
 * BaseNode - Base template for all Ada ecosystem nodes
 * Provides core functionality: memory, communication, replication, and AI capabilities
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { NodeMemory } from './NodeMemory.js';
import { NodeCommunication } from './NodeCommunication.js';
import { NodeReplication, ReplicationOptions } from './NodeReplication.js';
import {
  NodeConfig,
  NodeIdentity,
  NodeType,
  NodeCapabilities,
  NodeState,
  NodeMessage,
} from './types.js';
import { getEventEmitter } from '../observability/hooks/EventEmitter.js';

export interface BaseNodeOptions {
  name: string;
  type: NodeType;
  capabilities: NodeCapabilities;
  settings?: Record<string, any>;
  parentId?: string;
  generation?: number;
}

export abstract class BaseNode extends EventEmitter {
  // Core identity
  protected identity: NodeIdentity;
  protected capabilities: NodeCapabilities;
  protected settings: Record<string, any>;

  // Core systems
  protected memory: NodeMemory;
  protected communication: NodeCommunication;
  protected replication: NodeReplication;

  // State
  protected state: NodeState;

  // Observability
  private observabilityEmitter = getEventEmitter();
  private sessionId: string;

  // Registry of all nodes
  private static nodeRegistry: Map<string, BaseNode> = new Map();

  constructor(options: BaseNodeOptions) {
    super();

    // Initialize identity
    this.identity = {
      id: uuidv4(),
      type: options.type,
      name: options.name,
      createdAt: new Date(),
      parentId: options.parentId,
      generation: options.generation || 0,
    };

    this.capabilities = options.capabilities;
    this.settings = options.settings || {};

    // Initialize session ID (from environment or generate)
    this.sessionId = process.env.ADA_SESSION_ID || `ada-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Initialize core systems
    this.memory = new NodeMemory();
    this.communication = new NodeCommunication(this.identity.id);
    this.replication = new NodeReplication(
      this.identity.id,
      this.identity.type,
      this.identity.generation,
      this.identity.parentId
    );

    // Initialize state
    this.state = {
      status: 'initializing',
      load: 0,
      lastActivity: new Date(),
      connectedNodes: [],
      pendingMessages: 0,
    };

    // Register this node
    BaseNode.nodeRegistry.set(this.identity.id, this);

    // Set up communication handlers
    this.setupCommunicationHandlers();

    // Log creation
    this.logEvent('Node created', { identity: this.identity });

    // Send observability event
    this.sendObservabilityEvent('agent_created', {
      parentId: this.identity.parentId,
      generation: this.identity.generation,
    }, `Agent ${this.identity.type} created: ${this.identity.name}`);
  }

  /**
   * Initialize the node - must be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Process a task specific to this node type
   */
  abstract processTask(task: any): Promise<any>;

  /**
   * Get node-specific status
   */
  abstract getStatus(): Record<string, any>;

  /**
   * Start the node
   */
  async start(): Promise<void> {
    this.state.status = 'initializing';
    await this.initialize();
    this.state.status = 'active';
    this.emit('started');
    this.logEvent('Node started', { id: this.identity.id });
    this.sendObservabilityEvent('agent_started', {}, `Agent ${this.identity.type} started: ${this.identity.name}`);
  }

  /**
   * Stop the node
   */
  async stop(): Promise<void> {
    this.state.status = 'offline';
    this.sendObservabilityEvent('agent_stopped', {}, `Agent ${this.identity.type} stopped: ${this.identity.name}`);
    this.communication.destroy();
    this.emit('stopped');
    this.logEvent('Node stopped', { id: this.identity.id });
    BaseNode.nodeRegistry.delete(this.identity.id);
  }

  /**
   * Connect to another node
   */
  connectToNode(nodeId: string): void {
    this.communication.connectTo(nodeId);
    this.state.connectedNodes.push(nodeId);
    this.logEvent('Connected to node', { nodeId });
  }

  /**
   * Disconnect from a node
   */
  disconnectFromNode(nodeId: string): void {
    this.communication.disconnect(nodeId);
    this.state.connectedNodes = this.state.connectedNodes.filter(id => id !== nodeId);
    this.logEvent('Disconnected from node', { nodeId });
  }

  /**
   * Send a message to another node
   */
  async sendMessage(
    to: string,
    subject: string,
    payload: any,
    options?: { priority?: NodeMessage['priority']; requiresResponse?: boolean }
  ): Promise<string> {
    const messageId = await this.communication.send(to, 'notification', subject, payload, options);
    this.updateActivity();
    return messageId;
  }

  /**
   * Request information from another node
   */
  async requestFromNode(to: string, subject: string, payload: any): Promise<any> {
    this.updateActivity();
    return await this.communication.request(to, subject, payload);
  }

  /**
   * Broadcast a message to all connected nodes
   */
  async broadcast(subject: string, payload: any): Promise<void> {
    await this.communication.send('broadcast', 'notification', subject, payload);
    this.updateActivity();
  }

  /**
   * Clone this node
   */
  async clone(name: string, options: ReplicationOptions = {}): Promise<BaseNode> {
    const cloneData = await this.replication.clone(name, options);

    // Create a new instance of the same class
    const CloneClass = this.constructor as new (options: BaseNodeOptions) => BaseNode;
    const clone = new CloneClass({
      name: cloneData.identity.name,
      type: this.identity.type,
      capabilities: { ...this.capabilities },
      settings: options.customSettings || { ...this.settings },
      parentId: this.identity.id,
      generation: cloneData.identity.generation,
    });

    // If inheriting memory
    if (options.inheritMemory) {
      const memoryData = this.memory.export();
      clone.memory.import(memoryData);
    }

    // If inheriting connections
    if (options.inheritConnections) {
      const connections = this.communication.getConnectedNodes();
      connections.forEach(nodeId => clone.connectToNode(nodeId));
    }

    await clone.start();

    this.logEvent('Node cloned', {
      cloneId: clone.identity.id,
      generation: clone.identity.generation,
    });

    // Send replication event
    this.observabilityEmitter.sendReplicationEvent(
      this.identity.id,
      clone.identity.id,
      this.identity.type,
      this.sessionId,
      clone.identity.generation,
      {
        purpose: options.purpose,
        inheritMemory: options.inheritMemory,
        inheritConnections: options.inheritConnections,
      }
    ).catch(() => {
      // Silently fail
    });

    return clone;
  }

  /**
   * Remember something
   */
  remember(
    type: 'conversation' | 'event' | 'data' | 'decision',
    content: any,
    tags: string[] = [],
    importance: number = 5
  ): string {
    const memoryId = this.memory.store(type, content, tags, importance);
    this.updateActivity();

    // Send memory event for important memories (importance >= 7)
    if (importance >= 7) {
      this.observabilityEmitter.sendMemoryEvent(
        this.identity.id,
        this.identity.type,
        this.sessionId,
        'memory_stored',
        type,
        { importance, tags }
      ).catch(() => {
        // Silently fail
      });
    }

    return memoryId;
  }

  /**
   * Recall memories
   */
  recall(options: any): any[] {
    return this.memory.search(options);
  }

  /**
   * Get node identity
   */
  getIdentity(): NodeIdentity {
    return { ...this.identity };
  }

  /**
   * Get node capabilities
   */
  getCapabilities(): NodeCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get current state
   */
  getState(): NodeState {
    return {
      ...this.state,
      pendingMessages: this.communication.getPendingCount(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): NodeConfig {
    return {
      identity: this.identity,
      capabilities: this.capabilities,
      settings: this.settings,
      connections: this.state.connectedNodes,
    };
  }

  /**
   * Update node settings
   */
  updateSettings(newSettings: Record<string, any>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.logEvent('Settings updated', { settings: newSettings });
  }

  /**
   * Calculate current load (0-100)
   */
  calculateLoad(): number {
    const messageLoad = Math.min(this.communication.getPendingCount() * 10, 50);
    const memoryLoad = Math.min((this.memory.getStats().total / 10000) * 50, 50);
    return Math.min(messageLoad + memoryLoad, 100);
  }

  /**
   * Auto-scale based on load
   */
  async autoScale(threshold: number = 80, maxClones: number = 10): Promise<BaseNode[]> {
    const load = this.calculateLoad();
    this.state.load = load;

    if (load > threshold) {
      // Send auto-scale triggered event
      this.sendObservabilityEvent('auto_scale_triggered', {
        load,
        threshold,
      }, `Auto-scale triggered for ${this.identity.type} at ${load}% load`);

      const cloneInfos = await this.replication.autoScale(load, threshold, maxClones);
      const clones: BaseNode[] = [];

      for (const cloneInfo of cloneInfos) {
        const clone = await this.clone(`auto-scale-${cloneInfo.id.slice(0, 8)}`, {
          purpose: 'load-balancing',
          inheritConnections: true,
        });
        clones.push(clone);
      }

      this.logEvent('Auto-scaled', { load, clonesCreated: clones.length });
      return clones;
    }

    return [];
  }

  /**
   * Get comprehensive node information
   */
  getInfo(): {
    identity: NodeIdentity;
    capabilities: NodeCapabilities;
    state: NodeState;
    memory: any;
    communication: any;
    replication: any;
    status: any;
  } {
    return {
      identity: this.identity,
      capabilities: this.capabilities,
      state: this.getState(),
      memory: this.memory.getStats(),
      communication: this.communication.getStats(),
      replication: this.replication.getStats(),
      status: this.getStatus(),
    };
  }

  /**
   * Log an event to memory
   */
  protected logEvent(event: string, data: any): void {
    this.remember('event', { event, data, timestamp: new Date() }, ['system'], 3);
    this.emit('event', { event, data });
  }

  /**
   * Send observability event to tracking server
   */
  private sendObservabilityEvent(
    eventType: string,
    metadata?: Record<string, any>,
    description?: string
  ): void {
    // Fire and forget - don't block on observability
    this.observabilityEmitter.sendAgentEvent(
      this.identity.id,
      this.identity.type,
      this.sessionId,
      eventType,
      { ...metadata, load: this.state.load },
      description
    ).catch((error) => {
      // Silently fail - observability should not break the agent
      console.error('Failed to send observability event:', error.message);
    });
  }

  /**
   * Update last activity timestamp
   */
  protected updateActivity(): void {
    this.state.lastActivity = new Date();
  }

  /**
   * Setup communication handlers
   */
  private setupCommunicationHandlers(): void {
    // Handle incoming messages
    this.communication.on('message-received', (message: NodeMessage) => {
      this.logEvent('Message received', { from: message.from, subject: message.subject });
      this.updateActivity();

      // Send observability event
      this.observabilityEmitter.sendCommunicationEvent(
        message.from,
        this.identity.id,
        message.id,
        message.type,
        this.sessionId,
        message.subject,
        { priority: message.priority }
      ).catch(() => {
        // Silently fail
      });
    });

    // Handle sent messages
    this.communication.on('message-sent', (message: NodeMessage) => {
      this.logEvent('Message sent', { to: message.to, subject: message.subject });

      // Send observability event
      if (message.to === 'broadcast') {
        this.sendObservabilityEvent('message_broadcast', {
          subject: message.subject,
          priority: message.priority,
        }, `Broadcast message: ${message.subject}`);
      } else {
        this.observabilityEmitter.sendCommunicationEvent(
          this.identity.id,
          message.to,
          message.id,
          message.type,
          this.sessionId,
          message.subject,
          { priority: message.priority }
        ).catch(() => {
          // Silently fail
        });
      }
    });

    // Standard message handlers
    this.communication.onMessage('ping', async () => {
      return { status: 'ok', timestamp: new Date() };
    });

    this.communication.onMessage('get-status', async () => {
      return this.getInfo();
    });

    this.communication.onMessage('get-capabilities', async () => {
      return this.getCapabilities();
    });
  }

  /**
   * Find a node by ID
   */
  static findNode(nodeId: string): BaseNode | undefined {
    return BaseNode.nodeRegistry.get(nodeId);
  }

  /**
   * Find nodes by type
   */
  static findNodesByType(type: NodeType): BaseNode[] {
    return Array.from(BaseNode.nodeRegistry.values()).filter(node => node.identity.type === type);
  }

  /**
   * Get all active nodes
   */
  static getAllNodes(): BaseNode[] {
    return Array.from(BaseNode.nodeRegistry.values());
  }

  /**
   * Get ecosystem statistics
   */
  static getEcosystemStats(): {
    totalNodes: number;
    byType: Record<NodeType, number>;
    totalClones: number;
    totalConnections: number;
    averageLoad: number;
  } {
    const nodes = BaseNode.getAllNodes();
    const byType: Record<NodeType, number> = {
      'ada.sea': 0,
      'ada.marina': 0,
      'ada.travel': 0,
      'ada.congress': 0,
      'ada.finance': 0,
      'ada.maintenance': 0,
      'ada.weather': 0,
    };

    let totalClones = 0;
    let totalConnections = 0;
    let totalLoad = 0;

    nodes.forEach(node => {
      byType[node.identity.type]++;
      totalClones += node.replication.getStats().totalClones;
      totalConnections += node.state.connectedNodes.length;
      totalLoad += node.calculateLoad();
    });

    return {
      totalNodes: nodes.length,
      byType,
      totalClones,
      totalConnections,
      averageLoad: nodes.length > 0 ? totalLoad / nodes.length : 0,
    };
  }
}
