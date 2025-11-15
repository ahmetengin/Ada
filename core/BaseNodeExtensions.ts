/**
 * BaseNodeExtensions - Distributed communication support for BaseNode
 *
 * Provides factory methods and utilities to enable distributed communication
 * in existing BaseNode-based nodes without breaking backward compatibility.
 */

import { BaseNode, BaseNodeOptions } from './BaseNode.js';
import { NodeCommunication } from './NodeCommunication.js';
import { DistributedNodeCommunication, DistributedConfig } from './DistributedNodeCommunication.js';
import { NetworkTransport } from './transport/NetworkTransport.js';

/**
 * Extended options for BaseNode with distributed support
 */
export interface DistributedNodeOptions extends BaseNodeOptions {
  /** Enable distributed communication */
  distributed?: {
    /** Communication mode */
    mode?: 'local' | 'distributed' | 'hybrid';

    /** Network transport */
    transport?: NetworkTransport;

    /** Registry configuration */
    registry?: {
      url: string;
      authToken?: string;
    };

    /** Node metadata */
    metadata?: Record<string, any>;

    /** Load calculation function */
    loadFn?: () => number;
  };
}

/**
 * Create a communication instance based on configuration
 *
 * Factory method that returns either NodeCommunication (local)
 * or DistributedNodeCommunication based on options.
 *
 * @param nodeId - Node identifier
 * @param nodeType - Node type (e.g., 'ada.sea')
 * @param nodeName - Node name
 * @param options - Distributed options (optional)
 */
export function createCommunication(
  nodeId: string,
  nodeType: string,
  nodeName: string,
  options?: DistributedNodeOptions['distributed']
): NodeCommunication | DistributedNodeCommunication {
  // No distributed config → return standard NodeCommunication (backward compatible)
  if (!options) {
    return new NodeCommunication(nodeId);
  }

  // Distributed config provided → return DistributedNodeCommunication
  const config: DistributedConfig = {
    nodeId,
    nodeName,
    nodeType,
    mode: options.mode || 'hybrid',
    transport: options.transport,
    registry: options.registry,
    metadata: options.metadata,
    loadFn: options.loadFn,
  };

  return new DistributedNodeCommunication(config);
}

/**
 * Upgrade an existing node's communication to distributed
 *
 * Helper to migrate an existing BaseNode to use distributed communication.
 * Call this during node initialization to enable distributed features.
 *
 * @param node - The node to upgrade
 * @param transport - Network transport
 * @param registryUrl - Optional registry URL
 */
export async function enableDistributedCommunication(
  node: BaseNode,
  transport: NetworkTransport,
  registryUrl?: string
): Promise<void> {
  const identity = node.getIdentity();

  // Create distributed communication instance
  const distributedComm = new DistributedNodeCommunication({
    nodeId: identity.id,
    nodeName: identity.name,
    nodeType: identity.type,
    mode: 'hybrid',
    transport,
    registry: registryUrl ? { url: registryUrl } : undefined,
    loadFn: () => node.getState().load,
  });

  // Copy existing handlers from old communication
  const oldComm = node['communication'] as NodeCommunication;
  const handlers = oldComm['handlers'] as Map<string, any>;

  for (const [subject, handler] of handlers.entries()) {
    distributedComm.onMessage(subject, handler);
  }

  // Replace communication instance
  node['communication'] = distributedComm;

  // Start distributed communication
  await distributedComm.start();
}

/**
 * Migration Example
 *
 * Shows how to upgrade existing nodes to use distributed communication:
 *
 * ```typescript
 * // Option 1: Using DistributedNodeOptions (new nodes)
 * import { WebSocketTransport } from './core/transport/WebSocketTransport.js';
 *
 * const transport = new WebSocketTransport({
 *   nodeId: 'ada-sea-1',
 *   nodeName: 'Ada Sea',
 *   port: 8080
 * });
 *
 * const seaNode = new SeaNode({
 *   name: 'Ada Sea',
 *   type: 'ada.sea',
 *   capabilities: { ... },
 *   distributed: {
 *     mode: 'hybrid',
 *     transport,
 *     registry: { url: 'http://localhost:3000' }
 *   }
 * });
 *
 * await seaNode.start(); // Automatically uses distributed communication
 *
 *
 * // Option 2: Upgrading existing nodes (runtime)
 * const seaNode = new SeaNode({
 *   name: 'Ada Sea',
 *   type: 'ada.sea',
 *   capabilities: { ... }
 * });
 *
 * await seaNode.start(); // Uses local communication
 *
 * // Later, enable distributed
 * await enableDistributedCommunication(
 *   seaNode,
 *   transport,
 *   'http://localhost:3000'
 * );
 * ```
 */
