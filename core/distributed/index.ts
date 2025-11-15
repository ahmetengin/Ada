/**
 * Distributed Communication Module
 *
 * Export all distributed communication components for easy import
 */

// Main distributed communication class
export { DistributedNodeCommunication } from '../DistributedNodeCommunication.js';
export type { DistributedConfig } from '../DistributedNodeCommunication.js';

// Transport layer
export { NetworkTransport, TransportStatus } from '../transport/NetworkTransport.js';
export type {
  TransportConfig,
  RemoteNodeInfo,
  TransportEvents,
} from '../transport/NetworkTransport.js';

export { WebSocketTransport } from '../transport/WebSocketTransport.js';
export type { WebSocketTransportConfig } from '../transport/WebSocketTransport.js';

export { RedisTransport } from '../transport/RedisTransport.js';
export type { RedisTransportConfig } from '../transport/RedisTransport.js';

// Service discovery
export { NodeRegistry, RegistryClient } from '../service/NodeRegistry.js';
export type {
  RegistryConfig,
  NodeRegistration,
  RegistryEvents,
} from '../service/NodeRegistry.js';
