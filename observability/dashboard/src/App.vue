<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-content">
        <h1 class="title">
          <span class="icon">🌊</span>
          Ada Multi-Agent Observability
        </h1>
        <div class="status">
          <div class="status-indicator" :class="{ connected: wsConnected, disconnected: !wsConnected }"></div>
          <span>{{ wsConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>
    </header>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <main class="content">
      <!-- System Statistics -->
      <div v-show="activeTab === 'overview'" class="tab-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.total_agents }}</div>
            <div class="stat-label">Total Agents</div>
          </div>
          <div class="stat-card active">
            <div class="stat-value">{{ stats.active_agents }}</div>
            <div class="stat-label">Active Agents</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.total_sessions }}</div>
            <div class="stat-label">Total Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.total_events }}</div>
            <div class="stat-label">Total Events</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>Agents by Type</h3>
            <div class="chart-content">
              <div v-for="(count, type) in stats.agents_by_type" :key="type" class="chart-bar">
                <div class="bar-label">{{ type }}</div>
                <div class="bar-container">
                  <div class="bar" :style="{ width: getBarWidth(count, maxAgentCount) }"></div>
                  <span class="bar-value">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Events by Type (Top 10)</h3>
            <div class="chart-content">
              <div v-for="(count, type) in topEventTypes" :key="type" class="chart-bar">
                <div class="bar-label">{{ type }}</div>
                <div class="bar-container">
                  <div class="bar event" :style="{ width: getBarWidth(count, maxEventCount) }"></div>
                  <span class="bar-value">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agents View -->
      <div v-show="activeTab === 'agents'" class="tab-content">
        <div class="section-header">
          <h2>Active Agents ({{ agents.length }})</h2>
          <button class="refresh-btn" @click="fetchAgents">🔄 Refresh</button>
        </div>

        <div class="agents-grid">
          <div v-for="agent in agents" :key="agent.agent_id" class="agent-card" :class="agent.status">
            <div class="agent-header">
              <div class="agent-type">{{ getAgentIcon(agent.agent_type) }} {{ agent.agent_type }}</div>
              <div class="agent-status" :class="agent.status">{{ agent.status }}</div>
            </div>
            <div class="agent-id">ID: {{ agent.agent_id.substring(0, 8) }}...</div>
            <div class="agent-details">
              <div class="detail">
                <span class="detail-label">Session:</span>
                <span class="detail-value">{{ agent.session_id.substring(0, 12) }}...</span>
              </div>
              <div class="detail">
                <span class="detail-label">Events:</span>
                <span class="detail-value">{{ agent.event_count }}</span>
              </div>
              <div class="detail" v-if="agent.load !== null">
                <span class="detail-label">Load:</span>
                <span class="detail-value">{{ agent.load }}%</span>
              </div>
              <div class="detail" v-if="agent.generation">
                <span class="detail-label">Generation:</span>
                <span class="detail-value">{{ agent.generation }}</span>
              </div>
            </div>
            <div class="agent-time">
              <div>Created: {{ formatTime(agent.created_at) }}</div>
              <div>Last activity: {{ formatTimeAgo(agent.last_activity) }}</div>
            </div>
            <div v-if="agent.parent_id" class="agent-parent">
              Cloned from: {{ agent.parent_id.substring(0, 8) }}...
            </div>
          </div>
        </div>
      </div>

      <!-- Events View -->
      <div v-show="activeTab === 'events'" class="tab-content">
        <div class="section-header">
          <h2>Real-time Events</h2>
          <div class="controls">
            <label>
              <input type="checkbox" v-model="autoScroll" />
              Auto-scroll
            </label>
            <button class="clear-btn" @click="events = []">Clear</button>
          </div>
        </div>

        <div class="events-list" ref="eventsList">
          <div
            v-for="event in events.slice().reverse()"
            :key="event.id || event.timestamp"
            class="event-item"
            :class="event.event_type"
          >
            <div class="event-time">{{ formatTime(event.timestamp) }}</div>
            <div class="event-type-badge" :class="getEventCategory(event.event_type)">
              {{ event.event_type }}
            </div>
            <div class="event-details">
              <div v-if="event.agent_id" class="event-agent">
                {{ getAgentIcon(event.agent_type) }} {{ event.agent_type }}: {{ event.agent_id.substring(0, 8) }}...
              </div>
              <div v-if="event.description" class="event-description">{{ event.description }}</div>
              <div v-if="event.error" class="event-error">❌ {{ event.error }}</div>
            </div>
            <div class="event-source">{{ event.source_app }}</div>
          </div>
        </div>
      </div>

      <!-- Sessions View -->
      <div v-show="activeTab === 'sessions'" class="tab-content">
        <div class="section-header">
          <h2>Sessions ({{ sessions.length }})</h2>
          <button class="refresh-btn" @click="fetchSessions">🔄 Refresh</button>
        </div>

        <div class="sessions-list">
          <div v-for="session in sessions" :key="session.session_id" class="session-card" :class="session.status">
            <div class="session-header">
              <div class="session-id">{{ session.session_id }}</div>
              <div class="session-status" :class="session.status">{{ session.status }}</div>
            </div>
            <div class="session-details">
              <div class="detail">
                <span class="detail-label">App:</span>
                <span class="detail-value">{{ session.source_app }}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Agents:</span>
                <span class="detail-value">{{ session.agent_count }}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Events:</span>
                <span class="detail-value">{{ session.event_count }}</span>
              </div>
            </div>
            <div class="session-time">
              <div>Started: {{ formatTime(session.started_at) }}</div>
              <div>Last activity: {{ formatTimeAgo(session.last_activity) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ada Observer View -->
      <div v-show="activeTab === 'observer'" class="tab-content">
        <div class="observer-header">
          <h2>🧭 Ada Observer - Intelligent Yacht Monitoring</h2>
          <p class="observer-subtitle">Zora-style vessel state intelligence and navigation</p>
        </div>

        <PrimaryNavigationDisplay />

        <!-- Aegean-Specific Widgets -->
        <div class="aegean-section">
          <div class="section-title">
            <h3>🌊 Aegean Intelligence</h3>
            <p>Smart features designed for the Aegean Sea</p>
          </div>
          <div class="aegean-widgets-grid">
            <MeltemWidget :apiUrl="API_URL" />
            <GreekIslandsWidget
              :apiUrl="API_URL"
              :currentPosition="{ latitude: 37.0, longitude: 27.5 }"
            />
            <TurkishMarinaWidget
              :apiUrl="API_URL"
              :currentPosition="{ latitude: 37.0, longitude: 27.5 }"
            />
          </div>
        </div>

        <div class="observer-features-grid">
          <div class="feature-card">
            <div class="feature-icon">⚓</div>
            <h3>Smart Anchor Watch</h3>
            <p>Intelligent anchor monitoring with tide awareness</p>
            <button class="feature-btn">Coming Soon</button>
          </div>

          <div class="feature-card">
            <div class="feature-icon">📔</div>
            <h3>Automatic Logbook</h3>
            <p>Voice-enabled logging with photo support</p>
            <button class="feature-btn">Coming Soon</button>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🔧</div>
            <h3>Maintenance</h3>
            <p>Track tasks, costs, and schedules</p>
            <button class="feature-btn">Coming Soon</button>
          </div>

          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>Away Mode</h3>
            <p>SMS/Email notifications when off-boat</p>
            <button class="feature-btn">Coming Soon</button>
          </div>
        </div>
      </div>

      <!-- VHF Radio View -->
      <div v-show="activeTab === 'vhf'" class="tab-content">
        <VHFMonitor />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { formatDistanceToNow, format } from 'date-fns';
import VHFMonitor from './components/VHFMonitor.vue';
import PrimaryNavigationDisplay from './components/PrimaryNavigationDisplay.vue';
import MeltemWidget from './components/MeltemWidget.vue';
import GreekIslandsWidget from './components/GreekIslandsWidget.vue';
import TurkishMarinaWidget from './components/TurkishMarinaWidget.vue';

// API Configuration
const API_URL = 'http://localhost:8765';
const WS_URL = 'ws://localhost:8765/stream';

// State
const activeTab = ref('overview');
const wsConnected = ref(false);
const autoScroll = ref(true);
const stats = ref({
  total_agents: 0,
  active_agents: 0,
  total_sessions: 0,
  active_sessions: 0,
  total_events: 0,
  agents_by_type: {} as Record<string, number>,
  events_by_type: {} as Record<string, number>,
});
const agents = ref<any[]>([]);
const events = ref<any[]>([]);
const sessions = ref<any[]>([]);

const eventsList = ref<HTMLElement | null>(null);
let ws: WebSocket | null = null;

// Tabs
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'observer', label: 'Ada Observer', icon: '⛵' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'events', label: 'Events', icon: '📡' },
  { id: 'sessions', label: 'Sessions', icon: '🔗' },
  { id: 'vhf', label: 'VHF Radio', icon: '📻' },
];

// Computed
const topEventTypes = computed(() => {
  const entries = Object.entries(stats.value.events_by_type);
  return Object.fromEntries(
    entries.sort((a, b) => b[1] - a[1]).slice(0, 10)
  );
});

const maxAgentCount = computed(() => {
  return Math.max(...Object.values(stats.value.agents_by_type), 1);
});

const maxEventCount = computed(() => {
  return Math.max(...Object.values(topEventTypes.value), 1);
});

// Functions
function getBarWidth(value: number, max: number): string {
  return `${(value / max) * 100}%`;
}

function getAgentIcon(agentType: string): string {
  const icons: Record<string, string> = {
    sea: '⛵',
    marina: '🏖️',
    travel: '✈️',
    congress: '🎤',
    test: '🧪',
  };
  return icons[agentType] || '🤖';
}

function getEventCategory(eventType: string): string {
  if (eventType.startsWith('agent_')) return 'agent';
  if (eventType.startsWith('message_')) return 'message';
  if (eventType.startsWith('task_')) return 'task';
  if (eventType.startsWith('memory_')) return 'memory';
  if (eventType.startsWith('clone_')) return 'clone';
  if (eventType.startsWith('load_')) return 'performance';
  return 'system';
}

function formatTime(timestamp: string): string {
  return format(new Date(timestamp), 'HH:mm:ss.SSS');
}

function formatTimeAgo(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

// API Calls
async function fetchStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    stats.value = await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

async function fetchAgents() {
  try {
    const response = await fetch(`${API_URL}/agents`);
    agents.value = await response.json();
  } catch (error) {
    console.error('Error fetching agents:', error);
  }
}

async function fetchSessions() {
  try {
    const response = await fetch(`${API_URL}/sessions`);
    sessions.value = await response.json();
  } catch (error) {
    console.error('Error fetching sessions:', error);
  }
}

// WebSocket
function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
    wsConnected.value = true;
  };

  ws.onmessage = (event) => {
    try {
      const newEvent = JSON.parse(event.data);
      events.value.push(newEvent);

      // Keep only last 1000 events
      if (events.value.length > 1000) {
        events.value = events.value.slice(-1000);
      }

      // Refresh data
      fetchStats();
      if (activeTab.value === 'agents') {
        fetchAgents();
      }
      if (activeTab.value === 'sessions') {
        fetchSessions();
      }

      // Auto-scroll
      if (autoScroll.value) {
        nextTick(() => {
          if (eventsList.value) {
            eventsList.value.scrollTop = eventsList.value.scrollHeight;
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    wsConnected.value = false;
    // Reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    wsConnected.value = false;
  };
}

// Lifecycle
onMounted(() => {
  fetchStats();
  fetchAgents();
  fetchSessions();
  connectWebSocket();

  // Refresh stats every 5 seconds
  const interval = setInterval(fetchStats, 5000);

  onUnmounted(() => {
    clearInterval(interval);
    if (ws) {
      ws.close();
    }
  });
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

.header {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 2rem;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #a0a0a0;
  font-size: 0.875rem;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #4ade80;
}

.status-indicator.disconnected {
  background: #f87171;
  animation: none;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.tabs {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem 2rem 0;
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab {
  background: transparent;
  border: none;
  color: #a0a0a0;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e0e0e0;
}

.tab.active {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
  border-bottom-color: #60a5fa;
}

.content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.stat-card.active {
  border-color: #4ade80;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 0.5rem;
}

.stat-card.active .stat-value {
  color: #4ade80;
}

.stat-label {
  color: #a0a0a0;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.chart-card h3 {
  color: #e0e0e0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  min-width: 120px;
  color: #a0a0a0;
  font-size: 0.875rem;
}

.bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar {
  height: 24px;
  background: linear-gradient(90deg, #60a5fa, #3b82f6);
  border-radius: 4px;
  transition: width 0.3s;
}

.bar.event {
  background: linear-gradient(90deg, #a78bfa, #8b5cf6);
}

.bar-value {
  color: #e0e0e0;
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 30px;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  color: #e0e0e0;
  font-size: 1.5rem;
}

.refresh-btn, .clear-btn {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.refresh-btn:hover, .clear-btn:hover {
  background: rgba(96, 165, 250, 0.2);
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.controls label {
  color: #a0a0a0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Agents Grid */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.agent-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.2s;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.agent-card.active {
  border-color: #4ade80;
}

.agent-card.stopped {
  border-color: #94a3b8;
  opacity: 0.7;
}

.agent-card.error {
  border-color: #f87171;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.agent-type {
  font-size: 1.125rem;
  font-weight: 600;
  color: #60a5fa;
}

.agent-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.agent-status.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.agent-status.stopped {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.agent-status.error {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.agent-id {
  color: #a0a0a0;
  font-size: 0.875rem;
  font-family: monospace;
  margin-bottom: 1rem;
}

.agent-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-label {
  color: #a0a0a0;
}

.detail-value {
  color: #e0e0e0;
  font-weight: 500;
}

.agent-time {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.agent-time div {
  margin-bottom: 0.25rem;
}

.agent-parent {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(168, 139, 250, 0.1);
  border-radius: 6px;
  color: #a78bfa;
  font-size: 0.75rem;
}

/* Events List */
.events-list {
  max-height: 600px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
}

.event-item {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  align-items: center;
}

.event-time {
  color: #6b7280;
  font-family: monospace;
  font-size: 0.75rem;
}

.event-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.event-type-badge.agent {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.event-type-badge.message {
  background: rgba(168, 139, 250, 0.2);
  color: #a78bfa;
}

.event-type-badge.task {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.event-type-badge.memory {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.event-type-badge.clone {
  background: rgba(249, 115, 22, 0.2);
  color: #f97316;
}

.event-type-badge.performance {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.event-type-badge.system {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.event-details {
  color: #e0e0e0;
}

.event-agent {
  color: #a78bfa;
  margin-bottom: 0.25rem;
}

.event-description {
  color: #d1d5db;
}

.event-error {
  color: #f87171;
}

.event-source {
  color: #6b7280;
  font-size: 0.75rem;
}

/* Sessions List */
.sessions-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.session-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
}

.session-card.active {
  border-color: #4ade80;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.session-id {
  font-family: monospace;
  color: #60a5fa;
  font-size: 0.875rem;
}

.session-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.session-status.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.session-status.stopped {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.session-time {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.session-time div {
  margin-bottom: 0.25rem;
}

/* Scrollbar */
.events-list::-webkit-scrollbar {
  width: 8px;
}

.events-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.5);
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 165, 250, 0.7);
}

/* Ada Observer Styles */
.observer-header {
  text-align: center;
  margin-bottom: 2rem;
}

.observer-header h2 {
  color: #e0e0e0;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.observer-subtitle {
  color: #a0a0a0;
  font-size: 1rem;
}

.observer-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  transition: all 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(96, 165, 250, 0.3);
  box-shadow: 0 8px 24px rgba(96, 165, 250, 0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #e0e0e0;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #a0a0a0;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.feature-btn {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.feature-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  transform: scale(1.05);
}

/* Aegean Section */
.aegean-section {
  margin: 3rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(29, 78, 216, 0.05) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
}

.section-title {
  text-align: center;
  margin-bottom: 2rem;
}

.section-title h3 {
  color: #60a5fa;
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.section-title p {
  color: #93c5fd;
  font-size: 1rem;
  font-weight: 400;
}

.aegean-widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

@media (max-width: 768px) {
  .aegean-widgets-grid {
    grid-template-columns: 1fr;
  }

  .aegean-section {
    padding: 1rem;
  }
}
</style>
