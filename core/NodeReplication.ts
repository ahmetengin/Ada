/**
 * NodeReplication - Self-replication capability for Ada nodes
 * Nodes can clone themselves to handle increased load or specialized tasks
 */

import { v4 as uuidv4 } from 'uuid';
import { NodeConfig, NodeIdentity, NodeType } from './types.js';

export interface ReplicationOptions {
  inheritMemory?: boolean;
  inheritConnections?: boolean;
  customSettings?: Record<string, any>;
  purpose?: string; // Why this clone was created
}

export interface CloneInfo {
  id: string;
  parentId: string;
  generation: number;
  createdAt: Date;
  purpose?: string;
  status: 'active' | 'inactive' | 'terminated';
}

export class NodeReplication {
  private nodeId: string;
  private nodeType: NodeType;
  private generation: number;
  private parentId?: string;
  private clones: Map<string, CloneInfo> = new Map();

  constructor(
    nodeId: string,
    nodeType: NodeType,
    generation: number = 0,
    parentId?: string
  ) {
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.generation = generation;
    this.parentId = parentId;
  }

  /**
   * Create a clone of this node
   */
  async clone(
    name: string,
    options: ReplicationOptions = {}
  ): Promise<{
    identity: NodeIdentity;
    config: Partial<NodeConfig>;
  }> {
    const cloneId = uuidv4();
    const cloneIdentity: NodeIdentity = {
      id: cloneId,
      type: this.nodeType,
      name,
      createdAt: new Date(),
      parentId: this.nodeId,
      generation: this.generation + 1,
    };

    const cloneInfo: CloneInfo = {
      id: cloneId,
      parentId: this.nodeId,
      generation: this.generation + 1,
      createdAt: new Date(),
      purpose: options.purpose,
      status: 'active',
    };

    this.clones.set(cloneId, cloneInfo);

    const cloneConfig: Partial<NodeConfig> = {
      identity: cloneIdentity,
      settings: options.customSettings || {},
    };

    return {
      identity: cloneIdentity,
      config: cloneConfig,
    };
  }

  /**
   * Create multiple clones at once
   */
  async cloneBatch(
    count: number,
    namePrefix: string,
    options: ReplicationOptions = {}
  ): Promise<Array<{
    identity: NodeIdentity;
    config: Partial<NodeConfig>;
  }>> {
    const clones = [];

    for (let i = 0; i < count; i++) {
      const clone = await this.clone(`${namePrefix}-${i + 1}`, options);
      clones.push(clone);
    }

    return clones;
  }

  /**
   * Terminate a clone
   */
  terminateClone(cloneId: string): boolean {
    const clone = this.clones.get(cloneId);
    if (clone) {
      clone.status = 'terminated';
      return true;
    }
    return false;
  }

  /**
   * Get all active clones
   */
  getActiveClones(): CloneInfo[] {
    return Array.from(this.clones.values()).filter(c => c.status === 'active');
  }

  /**
   * Get clone information
   */
  getCloneInfo(cloneId: string): CloneInfo | undefined {
    return this.clones.get(cloneId);
  }

  /**
   * Get genealogy (family tree)
   */
  getGenealogy(): {
    nodeId: string;
    generation: number;
    parentId?: string;
    clones: CloneInfo[];
  } {
    return {
      nodeId: this.nodeId,
      generation: this.generation,
      parentId: this.parentId,
      clones: Array.from(this.clones.values()),
    };
  }

  /**
   * Check if this node is a clone
   */
  isClone(): boolean {
    return this.generation > 0 && this.parentId !== undefined;
  }

  /**
   * Get replication statistics
   */
  getStats(): {
    totalClones: number;
    activeClones: number;
    maxGeneration: number;
    averageGeneration: number;
  } {
    const clones = Array.from(this.clones.values());
    const activeClones = clones.filter(c => c.status === 'active');
    const generations = clones.map(c => c.generation);
    const maxGeneration = generations.length > 0 ? Math.max(...generations) : this.generation;
    const averageGeneration =
      generations.length > 0
        ? generations.reduce((a, b) => a + b, 0) / generations.length
        : this.generation;

    return {
      totalClones: clones.length,
      activeClones: activeClones.length,
      maxGeneration,
      averageGeneration,
    };
  }

  /**
   * Auto-scaling: Create clones based on load
   */
  async autoScale(
    currentLoad: number,
    threshold: number = 80,
    maxClones: number = 10
  ): Promise<CloneInfo[]> {
    const activeClones = this.getActiveClones();

    if (currentLoad > threshold && activeClones.length < maxClones) {
      // Calculate how many clones to create
      const loadPercentage = currentLoad / 100;
      const neededClones = Math.min(
        Math.ceil(loadPercentage * 2),
        maxClones - activeClones.length
      );

      const newClones = await this.cloneBatch(
        neededClones,
        `auto-scale-${this.nodeType}`,
        { purpose: 'load-balancing' }
      );

      return newClones.map(c => ({
        id: c.identity.id,
        parentId: this.nodeId,
        generation: c.identity.generation,
        createdAt: c.identity.createdAt,
        purpose: 'load-balancing',
        status: 'active' as const,
      }));
    }

    return [];
  }

  /**
   * Export replication data
   */
  export(): string {
    return JSON.stringify({
      nodeId: this.nodeId,
      nodeType: this.nodeType,
      generation: this.generation,
      parentId: this.parentId,
      clones: Array.from(this.clones.entries()),
    }, null, 2);
  }

  /**
   * Import replication data
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.clones = new Map(data.clones.map(([id, info]: [string, any]) => {
        return [id, {
          ...info,
          createdAt: new Date(info.createdAt),
        }];
      }));
    } catch (error) {
      throw new Error(`Failed to import replication data: ${error}`);
    }
  }
}
