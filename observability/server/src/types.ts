/**
 * Multi-Agent Observability Types for Ada Ecosystem
 */

export interface ObservabilityEvent {
  id?: number;
  timestamp: string;
  source_app: string;
  session_id: string;
  event_type: EventType;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  input?: string;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
  description?: string;
}

export type EventType =
  // Agent lifecycle events
  | 'agent_created'
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_cloned'
  | 'agent_error'

  // Communication events
  | 'message_sent'
  | 'message_received'
  | 'message_broadcast'
  | 'request_timeout'

  // Task execution events
  | 'task_started'
  | 'task_completed'
  | 'task_failed'

  // Memory events
  | 'memory_stored'
  | 'memory_recalled'
  | 'memory_cleanup'

  // Replication events
  | 'clone_created'
  | 'clone_terminated'
  | 'auto_scale_triggered'

  // Performance events
  | 'load_high'
  | 'load_normal'
  | 'operation_slow'

  // System events
  | 'notification'
  | 'tool_use_pre'
  | 'tool_use_post'
  | 'user_prompt_submitted'
  | 'session_stopped';

export interface EventFilter {
  source_app?: string;
  session_id?: string;
  event_type?: EventType;
  agent_id?: string;
  agent_type?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  event_types: EventType[];
  agent_ids: string[];
  agent_types: string[];
}

export interface AgentInfo {
  agent_id: string;
  agent_type: string;
  session_id: string;
  source_app: string;
  status: 'active' | 'stopped' | 'error';
  created_at: string;
  last_activity: string;
  event_count: number;
  parent_id?: string;
  generation?: number;
  load?: number;
}

export interface SessionInfo {
  session_id: string;
  source_app: string;
  agent_count: number;
  event_count: number;
  started_at: string;
  last_activity: string;
  status: 'active' | 'stopped';
}

export interface SystemStats {
  total_events: number;
  total_agents: number;
  active_agents: number;
  total_sessions: number;
  active_sessions: number;
  events_by_type: Record<EventType, number>;
  agents_by_type: Record<string, number>;
}
