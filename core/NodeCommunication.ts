/**
 * NodeCommunication - Inter-node communication system
 * Enables Ada nodes to communicate with each other like humans do
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { NodeMessage } from './types.js';

export type MessageHandler = (message: NodeMessage) => Promise<any>;

export interface MessageFilter {
  from?: string;
  type?: NodeMessage['type'];
  subject?: string;
  priority?: NodeMessage['priority'];
}

export class NodeCommunication extends EventEmitter {
  private nodeId: string;
  private handlers: Map<string, MessageHandler> = new Map();
  private messageQueue: NodeMessage[] = [];
  private sentMessages: Map<string, NodeMessage> = new Map();
  private receivedMessages: Map<string, NodeMessage> = new Map();
  private connectedNodes: Set<string> = new Set();

  // Network simulation - in production this would be a real network layer
  private static globalMessageBus: Map<string, NodeCommunication> = new Map();

  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
    NodeCommunication.globalMessageBus.set(nodeId, this);
  }

  /**
   * Connect to another node
   */
  connectTo(nodeId: string): void {
    this.connectedNodes.add(nodeId);
    this.emit('node-connected', nodeId);
  }

  /**
   * Disconnect from a node
   */
  disconnect(nodeId: string): void {
    this.connectedNodes.delete(nodeId);
    this.emit('node-disconnected', nodeId);
  }

  /**
   * Check if connected to a node
   */
  isConnected(nodeId: string): boolean {
    return this.connectedNodes.has(nodeId);
  }

  /**
   * Get all connected nodes
   */
  getConnectedNodes(): string[] {
    return Array.from(this.connectedNodes);
  }

  /**
   * Send a message to another node
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
    const message: NodeMessage = {
      id: uuidv4(),
      from: this.nodeId,
      to,
      type,
      subject,
      payload,
      timestamp: new Date(),
      priority: options.priority || 'normal',
      requiresResponse: options.requiresResponse || false,
    };

    this.sentMessages.set(message.id, message);
    this.emit('message-sent', message);

    // Deliver message
    if (to === 'broadcast') {
      await this.broadcast(message);
    } else {
      await this.deliver(message);
    }

    return message.id;
  }

  /**
   * Send a request and wait for response
   */
  async request(
    to: string,
    subject: string,
    payload: any,
    timeout: number = 30000
  ): Promise<any> {
    const messageId = await this.send(to, 'request', subject, payload, {
      requiresResponse: true,
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(`response:${messageId}`, responseHandler);
        reject(new Error(`Request timeout: ${subject}`));
      }, timeout);

      const responseHandler = (response: any) => {
        clearTimeout(timer);
        resolve(response);
      };

      this.once(`response:${messageId}`, responseHandler);
    });
  }

  /**
   * Send a response to a message
   */
  async respond(originalMessageId: string, payload: any): Promise<void> {
    const originalMessage = this.receivedMessages.get(originalMessageId);
    if (!originalMessage) {
      throw new Error(`Original message not found: ${originalMessageId}`);
    }

    await this.send(originalMessage.from, 'response', `Re: ${originalMessage.subject}`, {
      inReplyTo: originalMessageId,
      data: payload,
    });

    // Notify the original sender
    const senderComm = NodeCommunication.globalMessageBus.get(originalMessage.from);
    if (senderComm) {
      senderComm.emit(`response:${originalMessageId}`, payload);
    }
  }

  /**
   * Broadcast a message to all connected nodes
   */
  private async broadcast(message: NodeMessage): Promise<void> {
    for (const nodeId of this.connectedNodes) {
      const modifiedMessage = { ...message, to: nodeId };
      await this.deliver(modifiedMessage);
    }
  }

  /**
   * Deliver a message to its recipient
   */
  private async deliver(message: NodeMessage): Promise<void> {
    const recipient = NodeCommunication.globalMessageBus.get(message.to);

    if (!recipient) {
      this.emit('delivery-failed', message, 'Recipient not found');
      return;
    }

    if (!this.connectedNodes.has(message.to) && message.to !== 'broadcast') {
      this.emit('delivery-failed', message, 'Not connected to recipient');
      return;
    }

    recipient.receive(message);
  }

  /**
   * Receive a message
   */
  private async receive(message: NodeMessage): Promise<void> {
    this.receivedMessages.set(message.id, message);
    this.messageQueue.push(message);
    this.emit('message-received', message);

    // Try to handle the message
    await this.handleMessage(message);
  }

  /**
   * Register a message handler
   */
  onMessage(subject: string, handler: MessageHandler): void {
    this.handlers.set(subject, handler);
  }

  /**
   * Register a pattern-based message handler
   */
  onMessagePattern(pattern: RegExp, handler: MessageHandler): void {
    this.on('message-received', async (message: NodeMessage) => {
      if (pattern.test(message.subject)) {
        try {
          const result = await handler(message);
          if (message.requiresResponse) {
            await this.respond(message.id, result);
          }
        } catch (error) {
          this.emit('handler-error', message, error);
        }
      }
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: NodeMessage): Promise<void> {
    // Find handler for this subject
    const handler = this.handlers.get(message.subject);

    if (handler) {
      try {
        const result = await handler(message);

        // Auto-respond if response is required
        if (message.requiresResponse) {
          await this.respond(message.id, result);
        }
      } catch (error) {
        this.emit('handler-error', message, error);

        if (message.requiresResponse) {
          await this.respond(message.id, {
            error: true,
            message: error instanceof Error ? error.message : 'Handler error',
          });
        }
      }
    } else {
      // No handler found
      this.emit('unhandled-message', message);

      if (message.requiresResponse) {
        await this.respond(message.id, {
          error: true,
          message: 'No handler found for this message',
        });
      }
    }
  }

  /**
   * Get message history
   */
  getMessageHistory(filter?: MessageFilter): NodeMessage[] {
    let messages = [
      ...Array.from(this.sentMessages.values()),
      ...Array.from(this.receivedMessages.values()),
    ];

    if (filter) {
      if (filter.from) {
        messages = messages.filter(m => m.from === filter.from);
      }
      if (filter.type) {
        messages = messages.filter(m => m.type === filter.type);
      }
      if (filter.subject) {
        messages = messages.filter(m => m.subject.includes(filter.subject));
      }
      if (filter.priority) {
        messages = messages.filter(m => m.priority === filter.priority);
      }
    }

    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get pending messages count
   */
  getPendingCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    sent: number;
    received: number;
    pending: number;
    connectedNodes: number;
    byPriority: Record<string, number>;
  } {
    const allMessages = this.getMessageHistory();
    const byPriority: Record<string, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };

    allMessages.forEach(m => {
      byPriority[m.priority]++;
    });

    return {
      sent: this.sentMessages.size,
      received: this.receivedMessages.size,
      pending: this.messageQueue.length,
      connectedNodes: this.connectedNodes.size,
      byPriority,
    };
  }

  /**
   * Cleanup - remove from global bus
   */
  destroy(): void {
    NodeCommunication.globalMessageBus.delete(this.nodeId);
    this.removeAllListeners();
    this.connectedNodes.clear();
    this.handlers.clear();
    this.messageQueue = [];
  }
}
