/**
 * NodeMemory - Memory management system for Ada nodes
 * Each node maintains its own memory with retrieval and importance-based retention
 */

import { v4 as uuidv4 } from 'uuid';
import { NodeMemoryEntry } from './types.js';

export interface MemorySearchOptions {
  tags?: string[];
  type?: NodeMemoryEntry['type'];
  minImportance?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class NodeMemory {
  private memories: Map<string, NodeMemoryEntry> = new Map();
  private maxMemories: number;
  private retentionPeriodDays: number;

  constructor(
    maxMemories: number = 10000,
    retentionPeriodDays: number = 365
  ) {
    this.maxMemories = maxMemories;
    this.retentionPeriodDays = retentionPeriodDays;
  }

  /**
   * Store a new memory entry
   */
  store(
    type: NodeMemoryEntry['type'],
    content: any,
    tags: string[] = [],
    importance: number = 5
  ): string {
    const id = uuidv4();
    const entry: NodeMemoryEntry = {
      id,
      timestamp: new Date(),
      type,
      content,
      tags,
      importance: Math.max(0, Math.min(10, importance)), // Clamp between 0-10
    };

    this.memories.set(id, entry);
    this.cleanup();

    return id;
  }

  /**
   * Retrieve a specific memory by ID
   */
  retrieve(id: string): NodeMemoryEntry | undefined {
    return this.memories.get(id);
  }

  /**
   * Search memories based on criteria
   */
  search(options: MemorySearchOptions): NodeMemoryEntry[] {
    let results = Array.from(this.memories.values());

    // Filter by type
    if (options.type) {
      results = results.filter(m => m.type === options.type);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(m =>
        options.tags!.some(tag => m.tags.includes(tag))
      );
    }

    // Filter by importance
    if (options.minImportance !== undefined) {
      results = results.filter(m => m.importance >= options.minImportance!);
    }

    // Filter by date range
    if (options.startDate) {
      results = results.filter(m => m.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(m => m.timestamp <= options.endDate!);
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get recent memories
   */
  getRecent(count: number = 10): NodeMemoryEntry[] {
    return this.search({ limit: count });
  }

  /**
   * Get memories by importance
   */
  getImportant(minImportance: number = 7, limit?: number): NodeMemoryEntry[] {
    return this.search({ minImportance, limit });
  }

  /**
   * Update a memory's importance
   */
  updateImportance(id: string, importance: number): boolean {
    const memory = this.memories.get(id);
    if (memory) {
      memory.importance = Math.max(0, Math.min(10, importance));
      return true;
    }
    return false;
  }

  /**
   * Delete a specific memory
   */
  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    averageImportance: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const memories = Array.from(this.memories.values());
    const byType: Record<string, number> = {};

    memories.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    const totalImportance = memories.reduce((sum, m) => sum + m.importance, 0);
    const averageImportance = memories.length > 0 ? totalImportance / memories.length : 0;

    const timestamps = memories.map(m => m.timestamp.getTime());
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      total: memories.length,
      byType,
      averageImportance,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Cleanup old and low-importance memories
   */
  private cleanup(): void {
    if (this.memories.size <= this.maxMemories) {
      return;
    }

    const memories = Array.from(this.memories.values());
    const now = new Date();
    const retentionDate = new Date(now.getTime() - this.retentionPeriodDays * 24 * 60 * 60 * 1000);

    // Remove old low-importance memories
    memories
      .filter(m => m.timestamp < retentionDate && m.importance < 7)
      .forEach(m => this.memories.delete(m.id));

    // If still over limit, remove lowest importance memories
    if (this.memories.size > this.maxMemories) {
      const sorted = Array.from(this.memories.values())
        .sort((a, b) => {
          // Sort by importance first, then by date
          if (a.importance !== b.importance) {
            return a.importance - b.importance;
          }
          return a.timestamp.getTime() - b.timestamp.getTime();
        });

      const toRemove = sorted.slice(0, this.memories.size - this.maxMemories);
      toRemove.forEach(m => this.memories.delete(m.id));
    }
  }

  /**
   * Export memories to JSON
   */
  export(): string {
    const memories = Array.from(this.memories.values());
    return JSON.stringify(memories, null, 2);
  }

  /**
   * Import memories from JSON
   */
  import(jsonData: string): number {
    try {
      const memories: NodeMemoryEntry[] = JSON.parse(jsonData);
      let imported = 0;

      memories.forEach(m => {
        // Reconstruct Date objects
        m.timestamp = new Date(m.timestamp);
        this.memories.set(m.id, m);
        imported++;
      });

      this.cleanup();
      return imported;
    } catch (error) {
      throw new Error(`Failed to import memories: ${error}`);
    }
  }
}
