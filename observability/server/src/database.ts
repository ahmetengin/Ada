/**
 * SQLite Database for Multi-Agent Observability
 * Uses WAL mode for concurrent read/write access
 */

import Database from 'better-sqlite3';
import type {
  ObservabilityEvent,
  EventFilter,
  FilterOptions,
  AgentInfo,
  SessionInfo,
  SystemStats,
  EventType
} from './types';

export class ObservabilityDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './observability.db') {
    this.db = new Database(dbPath);

    // Enable WAL mode for concurrent access
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');

    this.initSchema();
  }

  private initSchema(): void {
    // Events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        source_app TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        agent_id TEXT,
        agent_type TEXT,
        tool_name TEXT,
        input TEXT,
        output TEXT,
        error TEXT,
        metadata TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_source_app ON events(source_app);
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
      CREATE INDEX IF NOT EXISTS idx_events_agent_type ON events(agent_type);
      CREATE INDEX IF NOT EXISTS idx_events_composite ON events(source_app, session_id, event_type);
    `);

    console.log('✅ Database schema initialized');
  }

  insertEvent(event: ObservabilityEvent): number {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        timestamp, source_app, session_id, event_type,
        agent_id, agent_type, tool_name, input, output,
        error, metadata, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.timestamp,
      event.source_app,
      event.session_id,
      event.event_type,
      event.agent_id || null,
      event.agent_type || null,
      event.tool_name || null,
      event.input || null,
      event.output || null,
      event.error || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.description || null
    );

    return result.lastInsertRowid as number;
  }

  getRecentEvents(limit: number = 100, offset: number = 0): ObservabilityEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return rows.map(this.parseEvent);
  }

  getFilteredEvents(filter: EventFilter): ObservabilityEvent[] {
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    if (filter.source_app) {
      query += ' AND source_app = ?';
      params.push(filter.source_app);
    }

    if (filter.session_id) {
      query += ' AND session_id = ?';
      params.push(filter.session_id);
    }

    if (filter.event_type) {
      query += ' AND event_type = ?';
      params.push(filter.event_type);
    }

    if (filter.agent_id) {
      query += ' AND agent_id = ?';
      params.push(filter.agent_id);
    }

    if (filter.agent_type) {
      query += ' AND agent_type = ?';
      params.push(filter.agent_type);
    }

    if (filter.start_time) {
      query += ' AND timestamp >= ?';
      params.push(filter.start_time);
    }

    if (filter.end_time) {
      query += ' AND timestamp <= ?';
      params.push(filter.end_time);
    }

    query += ' ORDER BY timestamp DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.parseEvent);
  }

  getFilterOptions(): FilterOptions {
    const sourceApps = this.db.prepare('SELECT DISTINCT source_app FROM events ORDER BY source_app').all() as any[];
    const sessionIds = this.db.prepare('SELECT DISTINCT session_id FROM events ORDER BY session_id').all() as any[];
    const eventTypes = this.db.prepare('SELECT DISTINCT event_type FROM events ORDER BY event_type').all() as any[];
    const agentIds = this.db.prepare('SELECT DISTINCT agent_id FROM events WHERE agent_id IS NOT NULL ORDER BY agent_id').all() as any[];
    const agentTypes = this.db.prepare('SELECT DISTINCT agent_type FROM events WHERE agent_type IS NOT NULL ORDER BY agent_type').all() as any[];

    return {
      source_apps: sourceApps.map(r => r.source_app),
      session_ids: sessionIds.map(r => r.session_id),
      event_types: eventTypes.map(r => r.event_type),
      agent_ids: agentIds.map(r => r.agent_id),
      agent_types: agentTypes.map(r => r.agent_type)
    };
  }

  getAgents(): AgentInfo[] {
    const stmt = this.db.prepare(`
      SELECT
        agent_id,
        agent_type,
        session_id,
        source_app,
        MIN(timestamp) as created_at,
        MAX(timestamp) as last_activity,
        COUNT(*) as event_count,
        MAX(CASE WHEN event_type = 'agent_stopped' THEN 1 ELSE 0 END) as is_stopped,
        MAX(CASE WHEN event_type = 'agent_error' THEN 1 ELSE 0 END) as has_error,
        json_extract(metadata, '$.parentId') as parent_id,
        json_extract(metadata, '$.generation') as generation,
        json_extract(metadata, '$.load') as load
      FROM events
      WHERE agent_id IS NOT NULL
      GROUP BY agent_id, agent_type, session_id, source_app
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => ({
      agent_id: row.agent_id,
      agent_type: row.agent_type,
      session_id: row.session_id,
      source_app: row.source_app,
      status: row.has_error ? 'error' : (row.is_stopped ? 'stopped' : 'active'),
      created_at: row.created_at,
      last_activity: row.last_activity,
      event_count: row.event_count,
      parent_id: row.parent_id,
      generation: row.generation,
      load: row.load
    }));
  }

  getSessions(): SessionInfo[] {
    const stmt = this.db.prepare(`
      SELECT
        session_id,
        source_app,
        COUNT(DISTINCT agent_id) as agent_count,
        COUNT(*) as event_count,
        MIN(timestamp) as started_at,
        MAX(timestamp) as last_activity,
        MAX(CASE WHEN event_type = 'session_stopped' THEN 1 ELSE 0 END) as is_stopped
      FROM events
      GROUP BY session_id, source_app
      ORDER BY started_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => ({
      session_id: row.session_id,
      source_app: row.source_app,
      agent_count: row.agent_count,
      event_count: row.event_count,
      started_at: row.started_at,
      last_activity: row.last_activity,
      status: row.is_stopped ? 'stopped' : 'active'
    }));
  }

  getSystemStats(): SystemStats {
    const totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM events').get() as any;

    const agents = this.getAgents();
    const activeAgents = agents.filter(a => a.status === 'active').length;

    const sessions = this.getSessions();
    const activeSessions = sessions.filter(s => s.status === 'active').length;

    const eventTypeStats = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM events
      GROUP BY event_type
    `).all() as any[];

    const agentTypeStats = this.db.prepare(`
      SELECT agent_type, COUNT(DISTINCT agent_id) as count
      FROM events
      WHERE agent_type IS NOT NULL
      GROUP BY agent_type
    `).all() as any[];

    const events_by_type: Record<string, number> = {};
    eventTypeStats.forEach(row => {
      events_by_type[row.event_type] = row.count;
    });

    const agents_by_type: Record<string, number> = {};
    agentTypeStats.forEach(row => {
      agents_by_type[row.agent_type] = row.count;
    });

    return {
      total_events: totalEvents.count,
      total_agents: agents.length,
      active_agents: activeAgents,
      total_sessions: sessions.length,
      active_sessions: activeSessions,
      events_by_type: events_by_type as Record<EventType, number>,
      agents_by_type
    };
  }

  private parseEvent(row: any): ObservabilityEvent {
    return {
      id: row.id,
      timestamp: row.timestamp,
      source_app: row.source_app,
      session_id: row.session_id,
      event_type: row.event_type,
      agent_id: row.agent_id,
      agent_type: row.agent_type,
      tool_name: row.tool_name,
      input: row.input,
      output: row.output,
      error: row.error,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      description: row.description
    };
  }

  close(): void {
    this.db.close();
  }

  // Cleanup old events (optional maintenance)
  cleanupOldEvents(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const stmt = this.db.prepare(`
      DELETE FROM events
      WHERE timestamp < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  }
}
