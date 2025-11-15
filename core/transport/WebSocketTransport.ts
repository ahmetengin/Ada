/**
 * WebSocketTransport - WebSocket-based network transport
 *
 * Provides bidirectional real-time communication between distributed nodes
 * using WebSocket protocol.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { NetworkTransport, TransportConfig, TransportStatus, RemoteNodeInfo } from './NetworkTransport';
import { NodeMessage } from '../types';

/**
 * WebSocket-specific configuration
 */
export interface WebSocketTransportConfig extends TransportConfig {
  options?: {
    /** Enable server mode (listen for incoming connections) */
    serverMode?: boolean;

    /** Heartbeat interval in milliseconds (default: 30000) */
    heartbeatInterval?: number;

    /** Connection timeout in milliseconds (default: 10000) */
    connectionTimeout?: number;

    /** Auto-reconnect on disconnect (default: true) */
    autoReconnect?: boolean;

    /** Max reconnection attempts (default: 5) */
    maxReconnectAttempts?: number;

    /** Reconnect delay in milliseconds (default: 5000) */
    reconnectDelay?: number;

    /** WebSocket server options */
    serverOptions?: WebSocket.ServerOptions;
  };
}

/**
 * WebSocket connection wrapper
 */
interface WSConnection {
  socket: WebSocket;
  nodeInfo?: RemoteNodeInfo;
  lastPing: Date;
  reconnectAttempts: number;
}

/**
 * WebSocket message types for internal protocol
 */
enum WSMessageType {
  /** Node identification handshake */
  HANDSHAKE = 'handshake',

  /** Heartbeat ping */
  PING = 'ping',

  /** Heartbeat pong */
  PONG = 'pong',

  /** Actual node message */
  MESSAGE = 'message',

  /** Disconnect notification */
  DISCONNECT = 'disconnect'
}

/**
 * WebSocket protocol message
 */
interface WSMessage {
  type: WSMessageType;
  payload: any;
}

/**
 * WebSocket Transport Implementation
 *
 * Features:
 * - Bidirectional communication
 * - Server and client modes
 * - Automatic heartbeat/health checking
 * - Auto-reconnection
 * - Connection pooling
 */
export class WebSocketTransport extends NetworkTransport {
  private server?: WebSocketServer;
  private connections: Map<string, WSConnection> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: WebSocketTransportConfig) {
    super(config);
  }

  /**
   * Start the WebSocket transport
   */
  async start(): Promise<void> {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];

    // Start server if in server mode
    if (options?.serverMode !== false) {
      await this.startServer();
    }

    // Start heartbeat
    this.startHeartbeat();

    this.setStatus(TransportStatus.CONNECTED);
    this.emit('ready');
  }

  /**
   * Stop the WebSocket transport
   */
  async stop(): Promise<void> {
    this.setStatus(TransportStatus.DISCONNECTED);

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Clear reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Close all client connections
    for (const [nodeId, conn] of this.connections.entries()) {
      this.closeConnection(nodeId, conn);
    }
    this.connections.clear();

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = undefined;
    }
  }

  /**
   * Send message to a specific node
   */
  async sendToNode(nodeId: string, message: NodeMessage): Promise<void> {
    const conn = this.connections.get(nodeId);

    if (!conn || conn.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Node ${nodeId} is not connected`);
    }

    const wsMessage: WSMessage = {
      type: WSMessageType.MESSAGE,
      payload: message
    };

    conn.socket.send(JSON.stringify(wsMessage));
  }

  /**
   * Broadcast message to all connected nodes
   */
  async broadcast(message: NodeMessage): Promise<void> {
    const wsMessage: WSMessage = {
      type: WSMessageType.MESSAGE,
      payload: message
    };

    const serialized = JSON.stringify(wsMessage);

    for (const conn of this.connections.values()) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(serialized);
      }
    }
  }

  /**
   * Connect to a remote node
   */
  async connectToRemote(endpoint: string, nodeInfo?: Partial<RemoteNodeInfo>): Promise<void> {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];
    const timeout = options?.connectionTimeout || 10000;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(endpoint);
      const timeoutId = setTimeout(() => {
        socket.close();
        reject(new Error(`Connection timeout to ${endpoint}`));
      }, timeout);

      socket.on('open', () => {
        clearTimeout(timeoutId);

        // Send handshake
        const handshake: WSMessage = {
          type: WSMessageType.HANDSHAKE,
          payload: {
            id: this.config.nodeId,
            name: this.config.nodeName,
            type: nodeInfo?.type || 'unknown',
            endpoint: this.getServerEndpoint()
          }
        };

        socket.send(JSON.stringify(handshake));
      });

      socket.on('message', (data: WebSocket.Data) => {
        this.handleIncomingMessage(socket, data);
      });

      socket.on('close', () => {
        const conn = Array.from(this.connections.entries()).find(([_, c]) => c.socket === socket);
        if (conn) {
          const [nodeId, connection] = conn;
          this.handleDisconnect(nodeId, connection);
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeoutId);
        this.handleError(error);
        reject(error);
      });

      // Temporary connection until handshake completes
      const tempId = `temp_${Date.now()}`;
      this.connections.set(tempId, {
        socket,
        lastPing: new Date(),
        reconnectAttempts: 0
      });

      // Wait for handshake response
      const handshakeHandler = (data: WebSocket.Data) => {
        try {
          const wsMessage = JSON.parse(data.toString()) as WSMessage;
          if (wsMessage.type === WSMessageType.HANDSHAKE) {
            const remoteInfo = wsMessage.payload as RemoteNodeInfo;

            // Remove temp connection
            this.connections.delete(tempId);

            // Register with real node ID
            const finalInfo: RemoteNodeInfo = {
              ...remoteInfo,
              endpoint,
              lastSeen: new Date()
            };

            this.connections.set(remoteInfo.id, {
              socket,
              nodeInfo: finalInfo,
              lastPing: new Date(),
              reconnectAttempts: 0
            });

            this.registerNode(finalInfo);
            socket.off('message', handshakeHandler);
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };

      socket.on('message', handshakeHandler);
    });
  }

  /**
   * Disconnect from a remote node
   */
  async disconnectFromRemote(nodeId: string): Promise<void> {
    const conn = this.connections.get(nodeId);
    if (conn) {
      // Send disconnect message
      const disconnect: WSMessage = {
        type: WSMessageType.DISCONNECT,
        payload: { nodeId: this.config.nodeId }
      };

      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(JSON.stringify(disconnect));
      }

      this.closeConnection(nodeId, conn);
    }
  }

  /**
   * Start WebSocket server
   */
  private async startServer(): Promise<void> {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];
    const host = this.config.host || '0.0.0.0';
    const port = this.config.port || 8080;

    this.server = new WebSocketServer({
      host,
      port,
      ...options?.serverOptions
    });

    this.server.on('connection', (socket: WebSocket) => {
      this.handleNewConnection(socket);
    });

    this.server.on('error', (error) => {
      this.handleError(error);
    });

    await new Promise<void>((resolve) => {
      this.server!.once('listening', () => resolve());
    });

    console.log(`WebSocket server listening on ${host}:${port}`);
  }

  /**
   * Handle new incoming connection
   */
  private handleNewConnection(socket: WebSocket): void {
    // Wait for handshake
    const handshakeHandler = (data: WebSocket.Data) => {
      try {
        const wsMessage = JSON.parse(data.toString()) as WSMessage;

        if (wsMessage.type === WSMessageType.HANDSHAKE) {
          const remoteInfo = wsMessage.payload as RemoteNodeInfo;

          // Send handshake response
          const response: WSMessage = {
            type: WSMessageType.HANDSHAKE,
            payload: {
              id: this.config.nodeId,
              name: this.config.nodeName,
              endpoint: this.getServerEndpoint()
            }
          };

          socket.send(JSON.stringify(response));

          // Register connection
          const nodeInfo: RemoteNodeInfo = {
            ...remoteInfo,
            lastSeen: new Date()
          };

          this.connections.set(remoteInfo.id, {
            socket,
            nodeInfo,
            lastPing: new Date(),
            reconnectAttempts: 0
          });

          this.registerNode(nodeInfo);

          // Remove handshake handler, add message handler
          socket.off('message', handshakeHandler);
          socket.on('message', (data) => this.handleIncomingMessage(socket, data));
        }
      } catch (error) {
        this.handleError(error as Error);
        socket.close();
      }
    };

    socket.on('message', handshakeHandler);

    socket.on('close', () => {
      const conn = Array.from(this.connections.entries()).find(([_, c]) => c.socket === socket);
      if (conn) {
        const [nodeId, connection] = conn;
        this.handleDisconnect(nodeId, connection);
      }
    });

    socket.on('error', (error) => {
      this.handleError(error);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleIncomingMessage(socket: WebSocket, data: WebSocket.Data): void {
    try {
      const wsMessage = JSON.parse(data.toString()) as WSMessage;

      switch (wsMessage.type) {
        case WSMessageType.MESSAGE:
          this.handleMessage(wsMessage.payload as NodeMessage);
          break;

        case WSMessageType.PING:
          // Respond with pong
          const pong: WSMessage = { type: WSMessageType.PONG, payload: {} };
          socket.send(JSON.stringify(pong));
          break;

        case WSMessageType.PONG:
          // Update last ping time
          const conn = Array.from(this.connections.values()).find(c => c.socket === socket);
          if (conn) {
            conn.lastPing = new Date();
          }
          break;

        case WSMessageType.DISCONNECT:
          // Remote node is disconnecting
          const nodeId = wsMessage.payload.nodeId;
          const connection = this.connections.get(nodeId);
          if (connection) {
            this.closeConnection(nodeId, connection);
          }
          break;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];
    const interval = options?.heartbeatInterval || 30000;

    this.heartbeatTimer = setInterval(() => {
      const ping: WSMessage = { type: WSMessageType.PING, payload: {} };
      const serialized = JSON.stringify(ping);

      for (const [nodeId, conn] of this.connections.entries()) {
        if (conn.socket.readyState === WebSocket.OPEN) {
          conn.socket.send(serialized);

          // Check for stale connections (no pong received)
          const timeSinceLastPing = Date.now() - conn.lastPing.getTime();
          if (timeSinceLastPing > interval * 2) {
            console.warn(`Node ${nodeId} is not responding, closing connection`);
            this.closeConnection(nodeId, conn);
          }
        }
      }
    }, interval);
  }

  /**
   * Handle node disconnect
   */
  private handleDisconnect(nodeId: string, conn: WSConnection): void {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];

    // Unregister node
    this.unregisterNode(nodeId);
    this.connections.delete(nodeId);

    // Attempt reconnection if enabled and we have endpoint
    if (options?.autoReconnect !== false && conn.nodeInfo?.endpoint) {
      const maxAttempts = options?.maxReconnectAttempts || 5;
      if (conn.reconnectAttempts < maxAttempts) {
        this.scheduleReconnect(nodeId, conn);
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(nodeId: string, conn: WSConnection): void {
    const options = (this.config.options || {}) as WebSocketTransportConfig['options'];
    const delay = options?.reconnectDelay || 5000;

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(nodeId);

      if (!conn.nodeInfo?.endpoint) return;

      try {
        conn.reconnectAttempts++;
        await this.connectToRemote(conn.nodeInfo.endpoint, conn.nodeInfo);
        console.log(`Reconnected to node ${nodeId}`);
      } catch (error) {
        console.error(`Failed to reconnect to node ${nodeId}:`, error);
        this.handleDisconnect(nodeId, conn);
      }
    }, delay);

    this.reconnectTimers.set(nodeId, timer);
  }

  /**
   * Close a connection
   */
  private closeConnection(nodeId: string, conn: WSConnection): void {
    conn.socket.close();
    this.connections.delete(nodeId);

    // Cancel any pending reconnect
    const timer = this.reconnectTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(nodeId);
    }
  }

  /**
   * Get server endpoint URL
   */
  private getServerEndpoint(): string {
    const host = this.config.host || 'localhost';
    const port = this.config.port || 8080;
    return `ws://${host}:${port}`;
  }
}
