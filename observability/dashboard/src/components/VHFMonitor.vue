<template>
  <div class="vhf-monitor">
    <!-- VHF Scanner Status -->
    <div class="scanner-status-card">
      <div class="status-header">
        <h2>📡 VHF Scanner Status</h2>
        <div class="scanner-controls">
          <button
            class="control-btn"
            :class="{ active: scannerState.isScanning }"
            @click="toggleScanner"
          >
            {{ scannerState.isScanning ? '⏸️ Stop' : '▶️ Start' }}
          </button>
          <button class="control-btn" @click="refreshData">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="scanner-stats">
        <div class="stat-box">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">Ch {{ scannerState.currentChannel }}</div>
            <div class="stat-label">Current Channel</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ scannerState.signalStrength }} dBm</div>
            <div class="stat-label">Signal Strength</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon">📻</div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.transmissionsDetected }}</div>
            <div class="stat-label">Transmissions</div>
          </div>
        </div>

        <div class="stat-box" :class="{ alert: statistics.emergencyCallsDetected > 0 }">
          <div class="stat-icon">🚨</div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.emergencyCallsDetected }}</div>
            <div class="stat-label">Emergency Calls</div>
          </div>
        </div>

        <div class="stat-box">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatUptime(statistics.uptime) }}</div>
            <div class="stat-label">Uptime</div>
          </div>
        </div>
      </div>

      <!-- Active Channels -->
      <div class="active-channels">
        <h3>🎛️ Monitoring Channels</h3>
        <div class="channel-pills">
          <div
            v-for="ch in scannerState.activeChannels"
            :key="ch"
            class="channel-pill"
            :class="{
              current: ch === scannerState.currentChannel,
              emergency: ch === 16,
              marina: ch === 73 || ch === 72
            }"
          >
            <span class="channel-num">{{ ch }}</span>
            <span class="channel-freq">{{ getChannelFrequency(ch) }}</span>
            <span class="channel-type">{{ getChannelType(ch) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Alerts -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <h2>🚨 Active Alerts</h2>
      <div class="alerts-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-card"
          :class="alert.severity"
        >
          <div class="alert-header">
            <div class="alert-severity">{{ getSeverityIcon(alert.severity) }} {{ alert.severity.toUpperCase() }}</div>
            <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
          </div>
          <div class="alert-channel">Channel {{ alert.channel }}</div>
          <div class="alert-message">{{ alert.message }}</div>
          <button v-if="alert.requiresAction" class="alert-action-btn">
            Take Action
          </button>
        </div>
      </div>
    </div>

    <!-- Recent Transmissions -->
    <div class="transmissions-section">
      <div class="section-header">
        <h2>📝 Recent Transmissions</h2>
        <div class="transmission-controls">
          <select v-model="filterType" class="filter-select">
            <option value="all">All Types</option>
            <option value="emergency">Emergency</option>
            <option value="marina">Marina</option>
            <option value="intership">Intership</option>
            <option value="safety">Safety</option>
          </select>
          <button class="control-btn" @click="clearTransmissions">
            🗑️ Clear
          </button>
        </div>
      </div>

      <div class="transmissions-list">
        <div
          v-for="tx in filteredTransmissions"
          :key="tx.id"
          class="transmission-card"
          :class="tx.classification"
        >
          <div class="tx-header">
            <div class="tx-channel">
              <span class="channel-badge" :class="getChannelClass(tx.channel)">
                Ch {{ tx.channel }}
              </span>
              <span class="tx-type">{{ getClassificationLabel(tx.classification) }}</span>
            </div>
            <div class="tx-time">{{ formatTime(tx.timestamp) }}</div>
          </div>

          <div class="tx-info">
            <div class="tx-detail">
              <span class="tx-label">Frequency:</span>
              <span class="tx-value">{{ tx.frequency.toFixed(3) }} MHz</span>
            </div>
            <div class="tx-detail">
              <span class="tx-label">Duration:</span>
              <span class="tx-value">{{ tx.duration.toFixed(1) }}s</span>
            </div>
            <div class="tx-detail">
              <span class="tx-label">Signal:</span>
              <span class="tx-value">{{ tx.signalStrength }} dBm</span>
            </div>
            <div v-if="tx.location" class="tx-detail">
              <span class="tx-label">Location:</span>
              <span class="tx-value">{{ formatLocation(tx.location) }}</span>
            </div>
          </div>

          <div v-if="tx.transcription" class="tx-transcription">
            <div class="tx-label">Transcription:</div>
            <div class="transcription-text">{{ tx.transcription }}</div>
          </div>

          <div v-else-if="tx.hasVoice" class="tx-transcription pending">
            <div class="transcription-text">⏳ Transcribing...</div>
          </div>
        </div>

        <div v-if="filteredTransmissions.length === 0" class="no-data">
          <div class="no-data-icon">📡</div>
          <div class="no-data-text">No transmissions detected</div>
        </div>
      </div>
    </div>

    <!-- Geographic Profile -->
    <div class="geo-section">
      <h2>🗺️ Geographic Profile</h2>
      <div class="geo-card">
        <div v-if="geographicProfile" class="geo-info">
          <div class="geo-region">{{ geographicProfile.region }}</div>
          <div class="geo-details">
            <div class="geo-detail">
              <span class="geo-label">Priority Channels:</span>
              <span class="geo-value">{{ geographicProfile.priorityChannels.join(', ') }}</span>
            </div>
            <div class="geo-detail">
              <span class="geo-label">Marina Channels:</span>
              <span class="geo-value">{{ geographicProfile.marinaChannels.join(', ') }}</span>
            </div>
            <div class="geo-notes">{{ geographicProfile.notes }}</div>
          </div>
        </div>
        <div v-else class="geo-info">
          <div class="geo-region">No location data</div>
          <div class="geo-notes">Update vessel location to auto-tune channels</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatDistanceToNow, format } from 'date-fns';

// API Configuration
const API_URL = 'http://localhost:8000'; // Ada.Sea API

// State
const scannerState = ref({
  isScanning: false,
  currentChannel: 16,
  currentFrequency: 156.800,
  signalStrength: -100,
  activeChannels: [16, 73, 72, 6, 13],
  priorityMode: true,
});

const statistics = ref({
  totalScans: 0,
  transmissionsDetected: 0,
  emergencyCallsDetected: 0,
  transcriptionsCompleted: 0,
  uptime: 0,
});

const transmissions = ref<any[]>([]);
const alerts = ref<any[]>([]);
const geographicProfile = ref<any>(null);
const filterType = ref('all');

let refreshInterval: any = null;

// Computed
const filteredTransmissions = computed(() => {
  if (filterType.value === 'all') {
    return transmissions.value;
  }
  return transmissions.value.filter(tx => tx.classification === filterType.value);
});

// Functions
function formatTime(timestamp: string | Date): string {
  return format(new Date(timestamp), 'HH:mm:ss');
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function formatLocation(location: { latitude: number; longitude: number }): string {
  return `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`;
}

function getChannelFrequency(channel: number): string {
  const frequencies: Record<number, number> = {
    6: 156.300,
    8: 156.400,
    9: 156.450,
    10: 156.500,
    11: 156.550,
    12: 156.600,
    13: 156.650,
    16: 156.800,
    67: 156.375,
    70: 156.525,
    72: 156.625,
    73: 156.675,
    77: 156.875,
  };
  return `${frequencies[channel] || 0} MHz`;
}

function getChannelType(channel: number): string {
  if (channel === 16) return '🚨 Emergency';
  if (channel === 73 || channel === 72) return '⚓️ Marina';
  if (channel === 6) return '🔵 Intership';
  if (channel === 13) return '🔐 Safety';
  return '📡 Radio';
}

function getChannelClass(channel: number): string {
  if (channel === 16) return 'emergency';
  if (channel === 73 || channel === 72) return 'marina';
  if (channel === 6) return 'intership';
  return 'default';
}

function getClassificationLabel(classification: string): string {
  const labels: Record<string, string> = {
    emergency: '🚨 Emergency',
    intership: '🔵 Intership',
    marina: '⚓️ Marina',
    port_ops: '🏗️ Port Ops',
    coast_guard: '🚨 Coast Guard',
    weather: '🌤️ Weather',
    safety: '🔐 Safety',
    unknown: '❓ Unknown',
  };
  return labels[classification] || classification;
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    emergency: '🚨',
    critical: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
  };
  return icons[severity] || 'ℹ️';
}

// API Calls
async function fetchScannerState() {
  try {
    const response = await fetch(`${API_URL}/api/vhf-radio/state`);
    if (response.ok) {
      scannerState.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching scanner state:', error);
  }
}

async function fetchStatistics() {
  try {
    const response = await fetch(`${API_URL}/api/vhf-radio/statistics`);
    if (response.ok) {
      const data = await response.json();
      statistics.value = data;
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
}

async function fetchTransmissions() {
  try {
    const response = await fetch(`${API_URL}/api/vhf-radio/transmissions?limit=50`);
    if (response.ok) {
      transmissions.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching transmissions:', error);
  }
}

async function fetchAlerts() {
  try {
    const response = await fetch(`${API_URL}/api/vhf-radio/alerts`);
    if (response.ok) {
      alerts.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
}

async function toggleScanner() {
  try {
    const action = scannerState.value.isScanning ? 'stop-scanner' : 'start-scanner';
    const response = await fetch(`${API_URL}/api/vhf-radio/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (response.ok) {
      await refreshData();
    }
  } catch (error) {
    console.error('Error toggling scanner:', error);
  }
}

async function clearTransmissions() {
  transmissions.value = [];
}

async function refreshData() {
  await Promise.all([
    fetchScannerState(),
    fetchStatistics(),
    fetchTransmissions(),
    fetchAlerts(),
  ]);
}

// Lifecycle
onMounted(() => {
  refreshData();

  // Auto-refresh every 2 seconds
  refreshInterval = setInterval(refreshData, 2000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.vhf-monitor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Scanner Status Card */
.scanner-status-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-header h2 {
  color: #e0e0e0;
  font-size: 1.5rem;
  margin: 0;
}

.scanner-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
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

.control-btn:hover {
  background: rgba(96, 165, 250, 0.2);
}

.control-btn.active {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

/* Scanner Stats */
.scanner-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-box.alert {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  animation: pulse 2s infinite;
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 0.25rem;
}

.stat-box.alert .stat-value {
  color: #ef4444;
}

.stat-label {
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Active Channels */
.active-channels {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.active-channels h3 {
  color: #e0e0e0;
  font-size: 1.125rem;
  margin-bottom: 1rem;
}

.channel-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.channel-pill {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid #60a5fa;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 100px;
  transition: all 0.2s;
}

.channel-pill.current {
  background: rgba(96, 165, 250, 0.3);
  border-width: 2px;
  transform: scale(1.05);
}

.channel-pill.emergency {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.channel-pill.marina {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.channel-num {
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
}

.channel-pill.emergency .channel-num {
  color: #ef4444;
}

.channel-pill.marina .channel-num {
  color: #4ade80;
}

.channel-freq,
.channel-type {
  font-size: 0.75rem;
  color: #a0a0a0;
}

/* Alerts Section */
.alerts-section {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 12px;
  padding: 1.5rem;
}

.alerts-section h2 {
  color: #ef4444;
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
}

.alert-card.emergency {
  border-left: 4px solid #ef4444;
}

.alert-card.critical {
  border-left: 4px solid #f59e0b;
}

.alert-card.warning {
  border-left: 4px solid #eab308;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.alert-severity {
  font-size: 0.875rem;
  font-weight: 700;
  color: #ef4444;
}

.alert-time {
  font-size: 0.75rem;
  color: #a0a0a0;
}

.alert-channel {
  font-size: 0.875rem;
  color: #60a5fa;
  margin-bottom: 0.5rem;
}

.alert-message {
  color: #e0e0e0;
  margin-bottom: 1rem;
}

.alert-action-btn {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Transmissions Section */
.transmissions-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  color: #e0e0e0;
  font-size: 1.5rem;
  margin: 0;
}

.transmission-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e0e0e0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.transmissions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.transmission-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.transmission-card:hover {
  transform: translateX(4px);
  border-color: rgba(96, 165, 250, 0.3);
}

.transmission-card.emergency {
  border-left: 4px solid #ef4444;
}

.transmission-card.marina {
  border-left: 4px solid #4ade80;
}

.transmission-card.intership {
  border-left: 4px solid #60a5fa;
}

.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.tx-channel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.channel-badge {
  background: rgba(96, 165, 250, 0.2);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.channel-badge.emergency {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.channel-badge.marina {
  background: rgba(74, 222, 128, 0.2);
  border-color: #4ade80;
  color: #4ade80;
}

.tx-type {
  font-size: 0.875rem;
  color: #a0a0a0;
}

.tx-time {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

.tx-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tx-detail {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.tx-label {
  color: #a0a0a0;
  font-weight: 500;
}

.tx-value {
  color: #e0e0e0;
  font-family: monospace;
}

.tx-transcription {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tx-transcription .tx-label {
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.transcription-text {
  color: #d1d5db;
  font-size: 0.875rem;
  line-height: 1.6;
  font-style: italic;
}

.tx-transcription.pending .transcription-text {
  color: #a0a0a0;
}

/* Geographic Section */
.geo-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.geo-section h2 {
  color: #e0e0e0;
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
}

.geo-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
}

.geo-region {
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 1rem;
}

.geo-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.geo-detail {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.geo-label {
  color: #a0a0a0;
  font-weight: 600;
  min-width: 140px;
}

.geo-value {
  color: #e0e0e0;
}

.geo-notes {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #a0a0a0;
  font-size: 0.875rem;
  font-style: italic;
}

/* No Data */
.no-data {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.no-data-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-data-text {
  font-size: 1.125rem;
}

/* Scrollbar */
.transmissions-list::-webkit-scrollbar {
  width: 8px;
}

.transmissions-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.transmissions-list::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.5);
  border-radius: 4px;
}

.transmissions-list::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 165, 250, 0.7);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
