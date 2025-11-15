/**
 * NetworkTransport - Abstract interface for distributed node communication
 *
 * Provides a pluggable transport layer that can be implemented using
 * different technologies (WebSocket, Redis, gRPC, HTTP, etc.)
 */

import { EventEmitter } from 'eventemitter3';
import { NodeMessage } from '../types';

/**
 * Transport configuration options
 */
export interface TransportConfig {
  /** Unique identifier for this transport instance */
  nodeId: string;

  /** Human-readable node name */
  nodeName: string;

  /** Host address to bind to (for server mode) */
  host?: string;

  /** Port to listen on (for server mode) */
  port?: number;

  /** Additional transport-specific options */
  options?: Record<string, any>;
}

/**
 * Remote node information
 */
export interface RemoteNodeInfo {
  /** Node unique identifier */
  id: string;

  /** Node name */
  name: string;

  /** Node type (e.g., 'ada.sea', 'ada.marina') */
  type: string;

  /** Connection endpoint (e.g., 'ws://host:port') */
  endpoint: string;

  /** Last seen timestamp */
  lastSeen: Date;

  /** Node metadata */
  metadata?: Record<string, any>;
}

/**
 * Transport connection status
 */
export enum TransportStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Transport events
 */
export interface TransportEvents {
  /** Emitted when transport is ready */
  'ready': () => void;

  /** Emitted when connection status changes */
  'status': (status: TransportStatus) => void;

  /** Emitted when a message is received */
  'message': (message: NodeMessage) => void;

  /** Emitted when a remote node connects */
  'node:connected': (nodeInfo: RemoteNodeInfo) => void;

  /** Emitted when a remote node disconnects */
  'node:disconnected': (nodeId: string) => void;

  /** Emitted on transport errors */
  'error': (error: Error) => void;
}

/**
 * Abstract Network Transport
 *
 * Base class for all network transport implementations.
 * Handles message serialization, connection management, and event emission.
 */
export abstract class NetworkTransport extends EventEmitter<TransportEvents> {
  protected config: TransportConfig;
  protected status: TransportStatus = TransportStatus.DISCONNECTED;
  protected connectedNodes: Map<string, RemoteNodeInfo> = new Map();

  constructor(config: TransportConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize and start the transport
   */
  abstract start(): Promise<void>;

  /**
   * Stop the transport and close all connections
   */
  abstract stop(): Promise<void>;

  /**
   * Send a message to a specific node
   *
   * @param nodeId - Target node identifier
   * @param message - Message to send
   */
  abstract sendToNode(nodeId: string, message: NodeMessage): Promise<void>;

  /**
   * Broadcast a message to all connected nodes
   *
   * @param message - Message to broadcast
   */
  abstract broadcast(message: NodeMessage): Promise<void>;

  /**
   * Connect to a remote node
   *
   * @param endpoint - Remote node endpoint (e.g., 'ws://host:port')
   * @param nodeInfo - Optional node information
   */
  abstract connectToRemote(endpoint: string, nodeInfo?: Partial<RemoteNodeInfo>): Promise<void>;

  /**
   * Disconnect from a remote node
   *
   * @param nodeId - Node identifier to disconnect from
   */
  abstract disconnectFromRemote(nodeId: string): Promise<void>;

  /**
   * Get current transport status
   */
  getStatus(): TransportStatus {
    return this.status;
  }

  /**
   * Check if transport is connected
   */
  isConnected(): boolean {
    return this.status === TransportStatus.CONNECTED;
  }

  /**
   * Get list of connected nodes
   */
  getConnectedNodes(): RemoteNodeInfo[] {
    return Array.from(this.connectedNodes.values());
  }

  /**
   * Get information about a specific connected node
   *
   * @param nodeId - Node identifier
   */
  getNodeInfo(nodeId: string): RemoteNodeInfo | undefined {
    return this.connectedNodes.get(nodeId);
  }

  /**
   * Check if a specific node is connected
   *
   * @param nodeId - Node identifier
   */
  isNodeConnected(nodeId: string): boolean {
    return this.connectedNodes.has(nodeId);
  }

  /**
   * Get transport configuration
   */
  getConfig(): TransportConfig {
    return { ...this.config };
  }

  /**
   * Serialize a message for network transmission
   *
   * @param message - Message to serialize
   */
  protected serializeMessage(message: NodeMessage): string {
    return JSON.stringify(message);
  }

  /**
   * Deserialize a message received from network
   *
   * @param data - Serialized message data
   */
  protected deserializeMessage(data: string): NodeMessage {
    return JSON.parse(data) as NodeMessage;
  }

  /**
   * Update transport status and emit event
   *
   * @param status - New status
   */
  protected setStatus(status: TransportStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status', status);
    }
  }

  /**
   * Register a connected node
   *
   * @param nodeInfo - Node information
   */
  protected registerNode(nodeInfo: RemoteNodeInfo): void {
    this.connectedNodes.set(nodeInfo.id, nodeInfo);
    this.emit('node:connected', nodeInfo);
  }

  /**
   * Unregister a disconnected node
   *
   * @param nodeId - Node identifier
   */
  protected unregisterNode(nodeId: string): void {
    if (this.connectedNodes.delete(nodeId)) {
      this.emit('node:disconnected', nodeId);
    }
  }

  /**
   * Handle incoming message
   *
   * @param message - Received message
   */
  protected handleMessage(message: NodeMessage): void {
    this.emit('message', message);
  }

  /**
   * Handle transport error
   *
   * @param error - Error object
   */
  protected handleError(error: Error): void {
    this.emit('error', error);
  }
}
