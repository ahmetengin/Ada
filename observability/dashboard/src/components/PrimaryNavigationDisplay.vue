<template>
  <div class="pnd-container">
    <div class="pnd-compass" :class="{ inactive: !data }">
      <!-- Outer ring with heading markings -->
      <svg class="compass-ring" viewBox="0 0 400 400">
        <!-- Background circle -->
        <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(96, 165, 250, 0.2)" stroke-width="2" />

        <!-- Cardinal directions -->
        <g v-for="(dir, idx) in cardinalDirections" :key="dir.label">
          <text
            :x="200 + 170 * Math.sin((idx * 90) * Math.PI / 180)"
            :y="200 - 170 * Math.cos((idx * 90) * Math.PI / 180)"
            text-anchor="middle"
            dominant-baseline="middle"
            class="cardinal-text"
          >
            {{ dir.label }}
          </text>
        </g>

        <!-- Heading ticks -->
        <g v-for="deg in 360" :key="`tick-${deg}`">
          <line
            v-if="deg % 10 === 0"
            :x1="200 + 180 * Math.sin(deg * Math.PI / 180)"
            :y1="200 - 180 * Math.cos(deg * Math.PI / 180)"
            :x2="200 + (deg % 30 === 0 ? 165 : 175) * Math.sin(deg * Math.PI / 180)"
            :y2="200 - (deg % 30 === 0 ? 165 : 175) * Math.cos(deg * Math.PI / 180)"
            :stroke="deg % 30 === 0 ? 'rgba(96, 165, 250, 0.6)' : 'rgba(96, 165, 250, 0.3)'"
            :stroke-width="deg % 30 === 0 ? 2 : 1"
          />
        </g>

        <!-- Apparent wind indicator -->
        <line
          v-if="data?.wind"
          :transform="`rotate(${data.wind.apparentAngle} 200 200)`"
          x1="200"
          y1="200"
          x2="200"
          y2="50"
          stroke="#a78bfa"
          stroke-width="3"
          stroke-dasharray="5,5"
          class="wind-arrow apparent"
        />
        <polygon
          v-if="data?.wind"
          :transform="`rotate(${data.wind.apparentAngle} 200 200)`"
          points="200,40 190,60 210,60"
          fill="#a78bfa"
        />

        <!-- True wind indicator -->
        <line
          v-if="data?.wind"
          :transform="`rotate(${data.wind.trueAngle} 200 200)`"
          x1="200"
          y1="200"
          x2="200"
          y2="60"
          stroke="#4ade80"
          stroke-width="3"
          class="wind-arrow true"
        />
        <polygon
          v-if="data?.wind"
          :transform="`rotate(${data.wind.trueAngle} 200 200)`"
          points="200,50 192,68 208,68"
          fill="#4ade80"
        />

        <!-- Autopilot target heading -->
        <g v-if="data?.autopilot?.active && data?.autopilot?.targetHeading">
          <line
            :transform="`rotate(${data.autopilot.targetHeading - (data.heading?.magnetic || 0)} 200 200)`"
            x1="200"
            y1="155"
            x2="200"
            y2="170"
            stroke="#fbbf24"
            stroke-width="4"
          />
        </g>
      </svg>

      <!-- Center data display -->
      <div class="center-display">
        <!-- Heading -->
        <div class="heading-display">
          <div class="heading-value">{{ formatHeading(data?.heading?.magnetic) }}°</div>
          <div class="heading-label">MAG</div>
          <div class="heading-true">{{ formatHeading(data?.heading?.true) }}° TRUE</div>
        </div>

        <!-- Horizontal line separator -->
        <div class="horizon-line"></div>

        <!-- Above water: Wind data -->
        <div class="above-water">
          <div class="wind-data">
            <div class="wind-speed">{{ formatNumber(data?.wind?.apparentSpeed, 1) }}</div>
            <div class="wind-unit">kts</div>
            <div class="wind-angle">{{ formatNumber(data?.wind?.apparentAngle, 0) }}°</div>
          </div>
        </div>

        <!-- Below water: Depth and speed -->
        <div class="below-water">
          <div class="depth-speed-grid">
            <div class="data-item">
              <div class="data-label">DEPTH</div>
              <div class="data-value">{{ formatNumber(data?.depth, 1) }}m</div>
            </div>
            <div class="data-item">
              <div class="data-label">STW</div>
              <div class="data-value">{{ formatNumber(data?.speed?.throughWater, 1) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">SOG</div>
              <div class="data-value">{{ formatNumber(data?.speed?.overGround, 1) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ship heading indicator (top) -->
      <div class="ship-indicator">
        <svg width="30" height="40" viewBox="0 0 30 40">
          <polygon points="15,0 0,40 15,30 30,40" fill="#60a5fa" />
        </svg>
      </div>
    </div>

    <!-- Quick data cards -->
    <div class="quick-data-cards">
      <div class="data-card" @click="showDetailedData('wind')">
        <div class="card-icon">💨</div>
        <div class="card-content">
          <div class="card-label">Wind</div>
          <div class="card-value">
            <span class="primary">{{ formatNumber(data?.wind?.apparentSpeed, 1) }}</span>
            <span class="unit">kts</span>
          </div>
          <div class="card-secondary">
            True: {{ formatNumber(data?.wind?.trueSpeed, 1) }} kts
          </div>
        </div>
      </div>

      <div class="data-card" @click="showDetailedData('position')">
        <div class="card-icon">📍</div>
        <div class="card-content">
          <div class="card-label">Position</div>
          <div class="card-value">
            {{ formatCoordinate(data?.position?.latitude, 'lat') }}
          </div>
          <div class="card-secondary">
            {{ formatCoordinate(data?.position?.longitude, 'lon') }}
          </div>
        </div>
      </div>

      <div class="data-card" @click="showDetailedData('speed')">
        <div class="card-icon">⚡</div>
        <div class="card-content">
          <div class="card-label">Speed</div>
          <div class="card-value">
            <span class="primary">{{ formatNumber(data?.speed?.overGround, 1) }}</span>
            <span class="unit">kts</span>
          </div>
          <div class="card-secondary">
            STW: {{ formatNumber(data?.speed?.throughWater, 1) }} kts
          </div>
        </div>
      </div>

      <div class="data-card" @click="showDetailedData('depth')">
        <div class="card-icon">🌊</div>
        <div class="card-content">
          <div class="card-label">Depth</div>
          <div class="card-value">
            <span class="primary">{{ formatNumber(data?.depth, 1) }}</span>
            <span class="unit">m</span>
          </div>
          <div class="card-secondary">
            {{ formatNumber(data?.depth * 3.28084, 0) }} ft
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps<{
  apiUrl?: string;
}>();

// State
const data = ref<any>(null);
const updating = ref(false);

const cardinalDirections = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

// API
const API_URL = props.apiUrl || 'http://localhost:8000';
let refreshInterval: any = null;

// Functions
function formatHeading(value?: number): string {
  if (value === undefined || value === null) return '---';
  return Math.round(value).toString().padStart(3, '0');
}

function formatNumber(value?: number, decimals: number = 0): string {
  if (value === undefined || value === null) return '--';
  return value.toFixed(decimals);
}

function formatCoordinate(value?: number, type: 'lat' | 'lon'): string {
  if (value === undefined || value === null) return '--°--\'--"';

  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = Math.floor(((abs - degrees) * 60 - minutes) * 60);

  const direction = type === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');

  return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${direction}`;
}

function showDetailedData(type: string): void {
  // Emit event for parent to show detailed modal
  console.log('Show detailed data for:', type);
}

async function fetchNavigationData(): Promise<void> {
  try {
    updating.value = true;
    const response = await fetch(`${API_URL}/api/observer/navigation`);
    if (response.ok) {
      data.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching navigation data:', error);
  } finally {
    updating.value = false;
  }
}

// Lifecycle
onMounted(() => {
  fetchNavigationData();

  // Refresh every 1 second for smooth updates
  refreshInterval = setInterval(fetchNavigationData, 1000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.pnd-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%);
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.2);
}

/* Compass Container */
.pnd-compass {
  position: relative;
  width: 400px;
  height: 400px;
  margin: 0 auto;
}

.pnd-compass.inactive {
  opacity: 0.5;
}

.compass-ring {
  width: 100%;
  height: 100%;
}

.cardinal-text {
  fill: #60a5fa;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.wind-arrow {
  filter: drop-shadow(0 0 4px currentColor);
}

/* Center Display */
.center-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(96, 165, 250, 0.3);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.heading-display {
  text-align: center;
  margin-bottom: 0.5rem;
}

.heading-value {
  font-size: 3rem;
  font-weight: 700;
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  line-height: 1;
  text-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
}

.heading-label {
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
}

.heading-true {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  font-family: 'Courier New', monospace;
}

.horizon-line {
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #60a5fa, transparent);
  margin: 0.75rem 0;
}

/* Above/Below Water Sections */
.above-water, .below-water {
  width: 100%;
  padding: 0 1.5rem;
}

.wind-data {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.wind-speed {
  font-size: 2rem;
  font-weight: 700;
  color: #a78bfa;
  font-family: 'Courier New', monospace;
}

.wind-unit {
  font-size: 0.875rem;
  color: #a0a0a0;
}

.wind-angle {
  font-size: 1.5rem;
  font-weight: 600;
  color: #a78bfa;
  font-family: 'Courier New', monospace;
}

.depth-speed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.data-item {
  text-align: center;
}

.data-label {
  font-size: 0.625rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.data-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #4ade80;
  font-family: 'Courier New', monospace;
}

/* Ship Indicator */
.ship-indicator {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.8));
}

/* Quick Data Cards */
.quick-data-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.data-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.data-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(96, 165, 250, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.2);
}

.card-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.card-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.card-value .primary {
  font-size: 1.5rem;
  font-weight: 700;
  color: #60a5fa;
  font-family: 'Courier New', monospace;
}

.card-value .unit {
  font-size: 0.875rem;
  color: #6b7280;
}

.card-secondary {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Responsive */
@media (max-width: 768px) {
  .pnd-compass {
    width: 320px;
    height: 320px;
  }

  .center-display {
    width: 220px;
    height: 220px;
  }

  .heading-value {
    font-size: 2.5rem;
  }

  .quick-data-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
