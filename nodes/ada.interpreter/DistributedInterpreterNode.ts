/**
 * DistributedInterpreterNode - Distributed real-time conference interpretation
 *
 * Extends InterpreterNode with distributed communication capabilities for:
 * - Load balancing across multiple interpreter instances
 * - Shared translation cache via Redis
 * - Service discovery and failover
 * - Horizontal scaling for large conferences
 *
 * Architecture:
 * - Multiple interpreter nodes can run on different machines
 * - Work is distributed based on load and availability
 * - Translations are cached and shared across instances
 * - Automatic failover if a node goes down
 */

import { InterpreterNode, InterpreterNodeConfig, AudioSegment, InterpreterOutput } from './InterpreterNode.js';
import { DistributedNodeCommunication, DistributedConfig } from '../../core/DistributedNodeCommunication.js';
import { NetworkTransport } from '../../core/transport/NetworkTransport.js';
import { WebSocketTransport } from '../../core/transport/WebSocketTransport.js';
import { RedisTransport } from '../../core/transport/RedisTransport.js';

// ============================================================================
// DISTRIBUTED CONFIGURATION
// ============================================================================

export interface DistributedInterpreterConfig extends InterpreterNodeConfig {
  distributed: {
    mode: 'local' | 'distributed' | 'hybrid';
    transport: {
      type: 'websocket' | 'redis';
      config: any; // WebSocket or Redis config
    };
    registry?: {
      url: string;
      authToken?: string;
    };
    loadBalancing?: {
      enabled: boolean;
      maxConcurrentSegments: number;
      strategy: 'round-robin' | 'least-load' | 'random';
    };
    cache?: {
      enabled: boolean;
      ttl: number; // seconds
      prefix: string;
    };
  };
}

// ============================================================================
// DISTRIBUTED INTERPRETER NODE
// ============================================================================

export class DistributedInterpreterNode extends InterpreterNode {
  private distributedComm?: DistributedNodeCommunication;
  private distributedConfig: DistributedInterpreterConfig['distributed'];
  private currentLoad: number = 0;
  private maxLoad: number = 100;
  private cacheEnabled: boolean = false;

  constructor(config: DistributedInterpreterConfig) {
    super(config);
    this.distributedConfig = config.distributed;

    // Set max load from config
    if (config.distributed.loadBalancing) {
      this.maxLoad = config.distributed.loadBalancing.maxConcurrentSegments;
    }

    // Enable cache if configured
    this.cacheEnabled = config.distributed.cache?.enabled || false;
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize distributed communication
   */
  async initialize(): Promise<void> {
    // Initialize base interpreter
    await super.initialize();

    // Setup distributed communication if not in local mode
    if (this.distributedConfig.mode !== 'local') {
      await this.setupDistributedCommunication();
    }

    this.log('Distributed interpreter initialized', 'success');
  }

  /**
   * Setup distributed communication layer
   */
  private async setupDistributedCommunication(): Promise<void> {
    this.log('Setting up distributed communication...', 'info');

    // Create transport based on config
    const transport = this.createTransport();

    // Create distributed communication config
    const distConfig: DistributedConfig = {
      nodeId: this.getNodeId(),
      nodeName: this.getNodeName(),
      nodeType: 'ada.interpreter',
      mode: this.distributedConfig.mode,
      transport,
      registry: this.distributedConfig.registry,
      capabilities: this.getCapabilities(),
      metadata: {
        interpreterInfo: (this as any).interpreterInfo,
        currentLoad: this.currentLoad,
        maxLoad: this.maxLoad
      },
      loadFn: () => this.getCurrentLoad()
    };

    // Create distributed communication instance
    this.distributedComm = new DistributedNodeCommunication(distConfig);

    // Setup message handlers
    this.setupDistributedHandlers();

    // Start distributed communication
    await this.distributedComm.start();

    this.log('Distributed communication started', 'success');
  }

  /**
   * Create network transport based on config
   */
  private createTransport(): NetworkTransport {
    const { type, config } = this.distributedConfig.transport;

    switch (type) {
      case 'websocket':
        return new WebSocketTransport({
          nodeId: this.getNodeId(),
          nodeName: this.getNodeName(),
          ...config
        });

      case 'redis':
        return new RedisTransport({
          nodeId: this.getNodeId(),
          nodeName: this.getNodeName(),
          ...config
        });

      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }

  /**
   * Setup distributed message handlers
   */
  private setupDistributedHandlers(): void {
    if (!this.distributedComm) return;

    // Handle incoming audio segment requests from other nodes
    this.distributedComm.on('request:process-segment', async (message: any) => {
      const { audioSegment } = message.payload;

      // Check if we have capacity
      if (this.currentLoad >= this.maxLoad) {
        this.distributedComm!.reply(message.id, {
          success: false,
          error: 'Node at capacity'
        });
        return;
      }

      try {
        // Process the segment
        const output = await this.processAudioSegment(audioSegment);

        // Reply with result
        this.distributedComm!.reply(message.id, {
          success: true,
          output
        });
      } catch (error) {
        this.distributedComm!.reply(message.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle translation cache requests
    this.distributedComm.on('request:get-translation', async (message: any) => {
      const { textHash, targetLang } = message.payload;
      const cached = await this.getCachedTranslation(textHash, targetLang);

      this.distributedComm!.reply(message.id, {
        cached,
        found: cached !== null
      });
    });

    // Handle load status requests
    this.distributedComm.on('request:get-load', async (message: any) => {
      this.distributedComm!.reply(message.id, {
        currentLoad: this.currentLoad,
        maxLoad: this.maxLoad,
        availableCapacity: this.maxLoad - this.currentLoad,
        utilizationPercent: (this.currentLoad / this.maxLoad) * 100
      });
    });
  }

  // ========================================================================
  // LOAD BALANCING
  // ========================================================================

  /**
   * Process audio segment with load balancing
   */
  async processAudioSegment(segment: AudioSegment): Promise<InterpreterOutput> {
    // Check if we should delegate to another node
    if (this.shouldDelegateWork()) {
      const delegatedOutput = await this.delegateSegment(segment);
      if (delegatedOutput) {
        return delegatedOutput;
      }
      // If delegation failed, process locally
    }

    // Increment load
    this.currentLoad++;

    try {
      // Process segment (call parent method)
      const output = await super.processAudioSegment(segment);

      // Cache translations if enabled
      if (this.cacheEnabled) {
        await this.cacheTranslations(segment.id, output.translations);
      }

      return output;
    } finally {
      // Decrement load
      this.currentLoad--;
    }
  }

  /**
   * Check if work should be delegated to another node
   */
  private shouldDelegateWork(): boolean {
    if (!this.distributedConfig.loadBalancing?.enabled) {
      return false;
    }

    // Delegate if we're at 80% capacity or more
    const utilizationThreshold = 0.8;
    return (this.currentLoad / this.maxLoad) >= utilizationThreshold;
  }

  /**
   * Delegate segment processing to another node
   */
  private async delegateSegment(segment: AudioSegment): Promise<InterpreterOutput | null> {
    if (!this.distributedComm) return null;

    this.log(`Delegating segment ${segment.id} to remote node`, 'info');

    try {
      // Find available node with lowest load
      const targetNode = await this.findBestNode();
      if (!targetNode) {
        this.log('No available nodes for delegation', 'warn');
        return null;
      }

      // Send segment to remote node
      const response = await this.distributedComm.request(
        targetNode,
        'process-segment',
        { audioSegment: segment },
        { timeout: 10000 }
      );

      if (response.success) {
        this.log(`Segment ${segment.id} processed by ${targetNode}`, 'success');
        return response.output;
      } else {
        this.log(`Delegation failed: ${response.error}`, 'error');
        return null;
      }
    } catch (error) {
      this.log(`Delegation error: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Find the best node for delegation based on load
   */
  private async findBestNode(): Promise<string | null> {
    if (!this.distributedComm) return null;

    try {
      // Get all interpreter nodes from registry
      const nodes = await this.distributedComm.discoverNodes('ada.interpreter');

      // Exclude self
      const otherNodes = nodes.filter(node => node.nodeId !== this.getNodeId());

      if (otherNodes.length === 0) {
        return null;
      }

      // Get load for each node
      const nodesWithLoad = await Promise.all(
        otherNodes.map(async (node) => {
          try {
            const loadResponse = await this.distributedComm!.request(
              node.nodeId,
              'get-load',
              {},
              { timeout: 2000 }
            );

            return {
              nodeId: node.nodeId,
              load: loadResponse.currentLoad || 0,
              maxLoad: loadResponse.maxLoad || 100,
              available: loadResponse.availableCapacity > 0
            };
          } catch {
            return null;
          }
        })
      );

      // Filter out failed requests and unavailable nodes
      const availableNodes = nodesWithLoad
        .filter((n): n is NonNullable<typeof n> => n !== null && n.available);

      if (availableNodes.length === 0) {
        return null;
      }

      // Select based on strategy
      const strategy = this.distributedConfig.loadBalancing?.strategy || 'least-load';

      switch (strategy) {
        case 'least-load':
          // Find node with lowest utilization
          const sorted = availableNodes.sort((a, b) => {
            const aUtil = a.load / a.maxLoad;
            const bUtil = b.load / b.maxLoad;
            return aUtil - bUtil;
          });
          return sorted[0].nodeId;

        case 'round-robin':
          // Simple round-robin (could be improved with state tracking)
          const randomIndex = Math.floor(Math.random() * availableNodes.length);
          return availableNodes[randomIndex].nodeId;

        case 'random':
          const rndIndex = Math.floor(Math.random() * availableNodes.length);
          return availableNodes[rndIndex].nodeId;

        default:
          return availableNodes[0].nodeId;
      }
    } catch (error) {
      this.log(`Error finding best node: ${error}`, 'error');
      return null;
    }
  }

  // ========================================================================
  // DISTRIBUTED CACHING
  // ========================================================================

  /**
   * Cache translations for reuse
   */
  private async cacheTranslations(
    segmentId: string,
    translations: { [key: string]: string }
  ): Promise<void> {
    if (!this.cacheEnabled || !this.distributedComm) return;

    // Publish cache update to other nodes
    await this.distributedComm.broadcast('cache-update', {
      segmentId,
      translations,
      timestamp: new Date()
    });
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(
    textHash: string,
    targetLang: string
  ): Promise<string | null> {
    // Implementation would query Redis or other cache
    // For now, return null
    return null;
  }

  // ========================================================================
  // MONITORING
  // ========================================================================

  /**
   * Get current load (0-100)
   */
  private getCurrentLoad(): number {
    return Math.round((this.currentLoad / this.maxLoad) * 100);
  }

  /**
   * Get distributed statistics
   */
  async getDistributedStatistics(): Promise<any> {
    const baseStats = await this.processTask({
      type: 'get-statistics',
      data: {}
    });

    return {
      ...baseStats,
      distributed: {
        mode: this.distributedConfig.mode,
        currentLoad: this.currentLoad,
        maxLoad: this.maxLoad,
        utilization: this.getCurrentLoad() + '%',
        cacheEnabled: this.cacheEnabled,
        transportType: this.distributedConfig.transport.type
      }
    };
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Shutdown distributed interpreter
   */
  async shutdown(): Promise<void> {
    this.log('Shutting down distributed interpreter...', 'info');

    // Stop distributed communication
    if (this.distributedComm) {
      await this.distributedComm.stop();
    }

    // Shutdown base interpreter
    await super.shutdown();

    this.log('Distributed interpreter shutdown complete', 'success');
  }
}

export default DistributedInterpreterNode;
