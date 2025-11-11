/**
 * Event Emitter for Ada Multi-Agent Observability
 *
 * TypeScript/Node.js utility to send observability events
 * to the observability server from Ada ecosystem nodes.
 */

import http from 'http';

export interface ObservabilityEvent {
  timestamp?: string;
  source_app: string;
  session_id: string;
  event_type: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  input?: string;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
  description?: string;
}

export class EventEmitter {
  private serverUrl: string;
  private hostname: string;
  private port: number;
  private path: string;

  constructor(serverUrl: string = 'http://localhost:8765') {
    this.serverUrl = serverUrl;

    // Parse URL
    const url = new URL(serverUrl);
    this.hostname = url.hostname;
    this.port = parseInt(url.port) || 8765;
    this.path = '/events';
  }

  /**
   * Send an observability event to the server
   */
  async sendEvent(event: ObservabilityEvent): Promise<boolean> {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    const data = JSON.stringify(event);

    return new Promise((resolve) => {
      const options = {
        hostname: this.hostname,
        port: this.port,
        path: this.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(true);
          } else {
            console.error(`Event send failed with status ${res.statusCode}: ${body}`);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error sending event:', error.message);
        resolve(false);
      });

      req.on('timeout', () => {
        console.error('Event send timeout');
        req.destroy();
        resolve(false);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Send an agent lifecycle event
   */
  async sendAgentEvent(
    agentId: string,
    agentType: string,
    sessionId: string,
    eventType: string,
    metadata?: Record<string, any>,
    description?: string
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: eventType,
      agent_id: agentId,
      agent_type: agentType,
      metadata,
      description,
    });
  }

  /**
   * Send a communication event
   */
  async sendCommunicationEvent(
    fromAgentId: string,
    toAgentId: string,
    messageId: string,
    messageType: string,
    sessionId: string,
    subject: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: 'message_sent',
      agent_id: fromAgentId,
      metadata: {
        from_agent: fromAgentId,
        to_agent: toAgentId,
        message_id: messageId,
        message_type: messageType,
        subject,
        ...metadata,
      },
      description: `Message from ${fromAgentId} to ${toAgentId}: ${subject}`,
    });
  }

  /**
   * Send a task execution event
   */
  async sendTaskEvent(
    agentId: string,
    agentType: string,
    sessionId: string,
    taskName: string,
    eventType: 'task_started' | 'task_completed' | 'task_failed',
    input?: string,
    output?: string,
    error?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: eventType,
      agent_id: agentId,
      agent_type: agentType,
      tool_name: taskName,
      input,
      output,
      error,
      metadata: {
        task_name: taskName,
        ...metadata,
      },
      description: `Task '${taskName}' ${eventType.replace('task_', '')}`,
    });
  }

  /**
   * Send a memory event
   */
  async sendMemoryEvent(
    agentId: string,
    agentType: string,
    sessionId: string,
    eventType: 'memory_stored' | 'memory_recalled' | 'memory_cleanup',
    memoryType: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: eventType,
      agent_id: agentId,
      agent_type: agentType,
      metadata: {
        memory_type: memoryType,
        ...metadata,
      },
      description: `Memory ${eventType.replace('memory_', '')} - type: ${memoryType}`,
    });
  }

  /**
   * Send a replication event
   */
  async sendReplicationEvent(
    parentId: string,
    cloneId: string,
    agentType: string,
    sessionId: string,
    generation: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: 'clone_created',
      agent_id: cloneId,
      agent_type: agentType,
      metadata: {
        parent_id: parentId,
        generation,
        ...metadata,
      },
      description: `Clone created from ${parentId} (generation ${generation})`,
    });
  }

  /**
   * Send a performance event
   */
  async sendPerformanceEvent(
    agentId: string,
    agentType: string,
    sessionId: string,
    eventType: 'load_high' | 'load_normal' | 'operation_slow',
    load?: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.sendEvent({
      source_app: 'ada-ecosystem',
      session_id: sessionId,
      event_type: eventType,
      agent_id: agentId,
      agent_type: agentType,
      metadata: {
        load,
        ...metadata,
      },
      description: `Performance event: ${eventType}${load ? ` (load: ${load}%)` : ''}`,
    });
  }
}

// Global singleton instance
let globalEmitter: EventEmitter | null = null;

/**
 * Get the global event emitter instance
 */
export function getEventEmitter(serverUrl?: string): EventEmitter {
  if (!globalEmitter) {
    globalEmitter = new EventEmitter(serverUrl);
  }
  return globalEmitter;
}

/**
 * Reset the global event emitter (useful for testing)
 */
export function resetEventEmitter(): void {
  globalEmitter = null;
}
