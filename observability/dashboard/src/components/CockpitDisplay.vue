<template>
  <div class="cockpit-container">
    <!-- Main Instrument Panel -->
    <div class="instrument-panel">
      <!-- Left Panel: Primary Flight Display (PFD) -->
      <div class="pfd-panel">
        <div class="panel-title">PRIMARY FLIGHT DISPLAY</div>
        <div class="pfd-instrument">
          <!-- Artificial Horizon -->
          <div class="horizon-container">
            <svg class="horizon-svg" viewBox="0 0 300 300">
              <!-- Sky/Sea Background -->
              <defs>
                <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#001a33;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#003366;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="seaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#004d00;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#002600;stop-opacity:1" />
                </linearGradient>
              </defs>

              <!-- Sky -->
              <rect x="0" y="0" width="300" height="150" fill="url(#skyGradient)" />

              <!-- Sea -->
              <rect x="0" y="150" width="300" height="150" fill="url(#seaGradient)" />

              <!-- Horizon Line -->
              <line x1="0" y1="150" x2="300" y2="150" stroke="#00ff00" stroke-width="3" />

              <!-- Pitch Ladder -->
              <g class="pitch-ladder">
                <line v-for="n in 6" :key="`pitch-${n}`"
                  :x1="100" :y1="150 - (n * 30)"
                  :x2="200" :y2="150 - (n * 30)"
                  stroke="#00ff00" stroke-width="1" opacity="0.6" />
                <line v-for="n in 6" :key="`pitch-neg-${n}`"
                  :x1="100" :y1="150 + (n * 30)"
                  :x2="200" :y2="150 + (n * 30)"
                  stroke="#00ff00" stroke-width="1" opacity="0.6" />
              </g>

              <!-- Aircraft Symbol -->
              <g class="aircraft-symbol">
                <line x1="100" y1="150" x2="130" y2="150" stroke="#ffff00" stroke-width="3" />
                <line x1="170" y1="150" x2="200" y2="150" stroke="#ffff00" stroke-width="3" />
                <circle cx="150" cy="150" r="3" fill="#ffff00" />
              </g>
            </svg>

            <!-- Heading Display -->
            <div class="heading-tape">
              <div class="heading-value">{{ formatHeading(data?.heading?.magnetic) }}°</div>
              <div class="heading-label">HDG</div>
            </div>

            <!-- Speed Display -->
            <div class="speed-display">
              <div class="speed-value">{{ formatNumber(data?.speed?.overGround, 1) }}</div>
              <div class="speed-label">KTS</div>
            </div>

            <!-- Altitude (Depth inverted) Display -->
            <div class="altitude-display">
              <div class="alt-value">{{ formatNumber(data?.depth, 1) }}</div>
              <div class="alt-label">DEPTH M</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Panel: Navigation Display (ND) -->
      <div class="nd-panel">
        <div class="panel-title">NAVIGATION DISPLAY</div>
        <div class="nd-instrument">
          <svg class="nd-svg" viewBox="0 0 300 300">
            <!-- Background -->
            <rect x="0" y="0" width="300" height="300" fill="#000" />

            <!-- Compass Rose -->
            <circle cx="150" cy="150" r="140" fill="none" stroke="#00ff00" stroke-width="1" opacity="0.3" />
            <circle cx="150" cy="150" r="100" fill="none" stroke="#00ff00" stroke-width="1" opacity="0.3" />
            <circle cx="150" cy="150" r="60" fill="none" stroke="#00ff00" stroke-width="1" opacity="0.3" />

            <!-- Cardinal Direction Markers -->
            <g v-for="(dir, idx) in cardinals" :key="dir.label">
              <text
                :x="150 + 125 * Math.sin((idx * 90) * Math.PI / 180)"
                :y="150 - 125 * Math.cos((idx * 90) * Math.PI / 180)"
                text-anchor="middle"
                dominant-baseline="middle"
                class="nd-cardinal"
              >
                {{ dir.label }}
              </text>
            </g>

            <!-- Heading Ticks -->
            <g v-for="deg in 36" :key="`nd-tick-${deg}`">
              <line
                :x1="150 + 135 * Math.sin((deg * 10) * Math.PI / 180)"
                :y1="150 - 135 * Math.cos((deg * 10) * Math.PI / 180)"
                :x2="150 + ((deg * 10) % 30 === 0 ? 120 : 130) * Math.sin((deg * 10) * Math.PI / 180)"
                :y2="150 - ((deg * 10) % 30 === 0 ? 120 : 130) * Math.cos((deg * 10) * Math.PI / 180)"
                :stroke="(deg * 10) % 30 === 0 ? '#00ff00' : '#00ff00'"
                :stroke-width="(deg * 10) % 30 === 0 ? 2 : 1"
                :opacity="(deg * 10) % 30 === 0 ? 0.8 : 0.4"
              />
            </g>

            <!-- Wind Vector (Green) -->
            <g v-if="data?.wind">
              <line
                :transform="`rotate(${data.wind.trueAngle} 150 150)`"
                x1="150" y1="150"
                x2="150" y2="70"
                stroke="#00ff00"
                stroke-width="3"
                marker-end="url(#arrowhead)"
              />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                  <polygon points="0 0, 10 5, 0 10" fill="#00ff00" />
                </marker>
              </defs>
            </g>

            <!-- Aircraft Symbol (Center) -->
            <polygon points="150,145 145,155 150,153 155,155" fill="#ffff00" stroke="#ffff00" stroke-width="1" />
          </svg>

          <!-- Position Display -->
          <div class="position-display">
            <div class="pos-line">
              <span class="pos-label">LAT:</span>
              <span class="pos-value">{{ formatCoordinate(data?.position?.latitude, 'lat') }}</span>
            </div>
            <div class="pos-line">
              <span class="pos-label">LON:</span>
              <span class="pos-value">{{ formatCoordinate(data?.position?.longitude, 'lon') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Engine & Systems -->
      <div class="systems-panel">
        <div class="panel-title">ENGINE & SYSTEMS</div>
        <div class="systems-instruments">
          <!-- Wind Gauge -->
          <div class="gauge-item">
            <div class="gauge-label">WIND</div>
            <div class="gauge-container">
              <svg viewBox="0 0 100 60" class="gauge-svg">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#00ff00" stroke-width="2" opacity="0.3" />
                <path
                  :d="getArcPath(50, 50, 40, -180, -180 + (data?.wind?.apparentSpeed || 0) * 6)"
                  fill="none"
                  stroke="#00ff00"
                  stroke-width="3"
                />
                <text x="50" y="45" text-anchor="middle" class="gauge-value">
                  {{ formatNumber(data?.wind?.apparentSpeed, 0) }}
                </text>
                <text x="50" y="55" text-anchor="middle" class="gauge-unit">KTS</text>
              </svg>
            </div>
          </div>

          <!-- Speed Gauge -->
          <div class="gauge-item">
            <div class="gauge-label">SPEED STW</div>
            <div class="gauge-container">
              <svg viewBox="0 0 100 60" class="gauge-svg">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#00ff00" stroke-width="2" opacity="0.3" />
                <path
                  :d="getArcPath(50, 50, 40, -180, -180 + (data?.speed?.throughWater || 0) * 18)"
                  fill="none"
                  stroke="#00ff00"
                  stroke-width="3"
                />
                <text x="50" y="45" text-anchor="middle" class="gauge-value">
                  {{ formatNumber(data?.speed?.throughWater, 1) }}
                </text>
                <text x="50" y="55" text-anchor="middle" class="gauge-unit">KTS</text>
              </svg>
            </div>
          </div>

          <!-- Depth Gauge -->
          <div class="gauge-item">
            <div class="gauge-label">DEPTH</div>
            <div class="gauge-container">
              <svg viewBox="0 0 100 60" class="gauge-svg">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#00ff00" stroke-width="2" opacity="0.3" />
                <path
                  :d="getArcPath(50, 50, 40, -180, -180 + Math.min((data?.depth || 0) * 3, 180))"
                  fill="none"
                  :stroke="(data?.depth || 100) < 5 ? '#ff0000' : '#00ff00'"
                  stroke-width="3"
                />
                <text x="50" y="45" text-anchor="middle" class="gauge-value">
                  {{ formatNumber(data?.depth, 1) }}
                </text>
                <text x="50" y="55" text-anchor="middle" class="gauge-unit">M</text>
              </svg>
            </div>
          </div>

          <!-- Status Indicators -->
          <div class="status-indicators">
            <div class="status-item">
              <div class="status-led" :class="{ active: data?.autopilot?.active }"></div>
              <div class="status-label">AUTOPILOT</div>
            </div>
            <div class="status-item">
              <div class="status-led active"></div>
              <div class="status-label">NAV</div>
            </div>
            <div class="status-item">
              <div class="status-led" :class="{ active: data?.engineRunning }"></div>
              <div class="status-label">ENGINE</div>
            </div>
            <div class="status-item">
              <div class="status-led active"></div>
              <div class="status-label">GPS</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Panel: Warning & Caution Display -->
    <div class="warning-panel">
      <div class="warning-section">
        <div class="warning-title">WARNINGS</div>
        <div class="warning-items">
          <div v-if="warnings.length === 0" class="warning-item ok">
            <span class="warning-icon">✓</span>
            <span class="warning-text">ALL SYSTEMS NORMAL</span>
          </div>
          <div v-for="warning in warnings" :key="warning.id" class="warning-item" :class="warning.level">
            <span class="warning-icon">{{ getWarningIcon(warning.level) }}</span>
            <span class="warning-text">{{ warning.text }}</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">TIME:</span>
            <span class="info-value">{{ currentTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">WIND DIR:</span>
            <span class="info-value">{{ formatNumber(data?.wind?.trueAngle, 0) }}°</span>
          </div>
          <div class="info-item">
            <span class="info-label">COG:</span>
            <span class="info-value">{{ formatHeading(data?.heading?.true) }}°</span>
          </div>
          <div class="info-item">
            <span class="info-label">SOG:</span>
            <span class="info-value">{{ formatNumber(data?.speed?.overGround, 1) }} KTS</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Map Display Section -->
    <div class="map-section">
      <div class="map-selector">
        <div class="selector-title">📡 MAP DISPLAYS</div>
        <div class="selector-buttons">
          <button
            class="map-btn"
            :class="{ active: activeMap === 'svg' }"
            @click="toggleMap('svg')"
          >
            SVG MAP
          </button>
          <button
            class="map-btn"
            :class="{ active: activeMap === 'leaflet' }"
            @click="toggleMap('leaflet')"
          >
            OPENSTREETMAP
          </button>
          <button
            class="map-btn flightradar"
            :class="{ active: activeMap === 'flightradar' }"
            @click="toggleMap('flightradar')"
          >
            FLIGHTRADAR24 STYLE
          </button>
        </div>
      </div>

      <!-- Maps -->
      <div v-show="activeMap === 'svg'" class="map-container">
        <SimpleSVGMap
          :position="data?.position"
          :heading="data?.heading?.magnetic"
          :apiUrl="apiUrl"
        />
      </div>

      <div v-show="activeMap === 'leaflet'" class="map-container">
        <LeafletMap
          :position="data?.position"
          :heading="data?.heading?.magnetic"
          :apiUrl="apiUrl"
        />
      </div>

      <div v-show="activeMap === 'flightradar'" class="map-container">
        <FlightradarMap
          :position="data?.position"
          :heading="data?.heading?.magnetic"
          :speed="data?.speed?.overGround"
          :depth="data?.depth"
          :apiUrl="apiUrl"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import SimpleSVGMap from './maps/SimpleSVGMap.vue';
import LeafletMap from './maps/LeafletMap.vue';
import FlightradarMap from './maps/FlightradarMap.vue';

// Props
const props = defineProps<{
  apiUrl?: string;
}>();

// State
const data = ref<any>(null);
const currentTime = ref('');
const warnings = ref<Array<{ id: number; level: string; text: string }>>([]);
const activeMap = ref<'svg' | 'leaflet' | 'flightradar' | null>(null);

const cardinals = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

// API
const API_URL = props.apiUrl || 'http://localhost:8000';
let refreshInterval: any = null;
let timeInterval: any = null;

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

function getArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const angleInRadians = (angle) * Math.PI / 180.0;
  return {
    x: cx + (r * Math.cos(angleInRadians)),
    y: cy + (r * Math.sin(angleInRadians))
  };
}

function getWarningIcon(level: string): string {
  switch (level) {
    case 'critical': return '⚠';
    case 'warning': return '⚠';
    case 'caution': return '!';
    default: return 'i';
  }
}

function updateTime(): void {
  const now = new Date();
  currentTime.value = now.toTimeString().split(' ')[0];
}

function toggleMap(mapType: 'svg' | 'leaflet' | 'flightradar'): void {
  // Toggle on/off - if clicking active map, hide it
  if (activeMap.value === mapType) {
    activeMap.value = null;
  } else {
    activeMap.value = mapType;
  }
}

function checkWarnings(): void {
  const newWarnings: Array<{ id: number; level: string; text: string }> = [];

  if (data.value) {
    // Check depth
    if (data.value.depth !== undefined && data.value.depth < 5) {
      newWarnings.push({
        id: 1,
        level: 'critical',
        text: `SHALLOW WATER - DEPTH ${data.value.depth.toFixed(1)}M`
      });
    }

    // Check wind speed
    if (data.value.wind?.apparentSpeed > 25) {
      newWarnings.push({
        id: 2,
        level: 'warning',
        text: `HIGH WIND - ${data.value.wind.apparentSpeed.toFixed(0)} KTS`
      });
    }

    // Check speed
    if (data.value.speed?.overGround > 10) {
      newWarnings.push({
        id: 3,
        level: 'caution',
        text: `HIGH SPEED - ${data.value.speed.overGround.toFixed(1)} KTS`
      });
    }
  }

  warnings.value = newWarnings;
}

async function fetchNavigationData(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/observer/navigation`);
    if (response.ok) {
      data.value = await response.json();
      checkWarnings();
    }
  } catch (error) {
    console.error('Error fetching navigation data:', error);
  }
}

// Lifecycle
onMounted(() => {
  fetchNavigationData();
  updateTime();

  refreshInterval = setInterval(fetchNavigationData, 1000);
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<style scoped>
.cockpit-container {
  background: #000;
  padding: 1rem;
  min-height: 800px;
  font-family: 'Courier New', monospace;
  color: #00ff00;
}

/* Main Instrument Panel */
.instrument-panel {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-title {
  background: linear-gradient(180deg, #003300 0%, #001a00 100%);
  color: #00ff00;
  text-align: center;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: 1px solid #00ff00;
  border-bottom: none;
}

/* PFD Panel */
.pfd-panel,
.nd-panel,
.systems-panel {
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 4px;
  overflow: hidden;
}

.pfd-instrument,
.nd-instrument {
  background: #000;
  padding: 1rem;
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.horizon-container {
  position: relative;
  width: 300px;
  height: 300px;
}

.horizon-svg {
  width: 100%;
  height: 100%;
  border: 2px solid #00ff00;
  border-radius: 4px;
}

.heading-tape {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #ffff00;
  padding: 0.5rem 1rem;
  text-align: center;
}

.heading-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffff00;
  line-height: 1;
}

.heading-label {
  font-size: 0.625rem;
  color: #00ff00;
  margin-top: 0.25rem;
}

.speed-display {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ff00;
  padding: 0.75rem 0.5rem;
  text-align: center;
  min-width: 60px;
}

.speed-value,
.alt-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff00;
  line-height: 1;
}

.speed-label,
.alt-label {
  font-size: 0.625rem;
  color: #00ff00;
  margin-top: 0.25rem;
}

.altitude-display {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ff00;
  padding: 0.75rem 0.5rem;
  text-align: center;
  min-width: 80px;
}

/* Navigation Display */
.nd-svg {
  width: 300px;
  height: 300px;
  border: 2px solid #00ff00;
  border-radius: 4px;
}

.nd-cardinal {
  fill: #00ff00;
  font-size: 18px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.position-display {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff00;
  padding: 0.5rem 1rem;
  min-width: 200px;
}

.pos-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.pos-line:last-child {
  margin-bottom: 0;
}

.pos-label {
  color: #00ff00;
  font-size: 0.75rem;
}

.pos-value {
  color: #00ff00;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Systems Panel */
.systems-instruments {
  padding: 1rem;
}

.gauge-item {
  margin-bottom: 1.5rem;
}

.gauge-label {
  color: #00ff00;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
  letter-spacing: 0.1em;
}

.gauge-container {
  background: rgba(0, 51, 0, 0.2);
  border: 1px solid #00ff00;
  border-radius: 4px;
  padding: 0.5rem;
}

.gauge-svg {
  width: 100%;
  height: auto;
}

.gauge-value {
  fill: #00ff00;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.gauge-unit {
  fill: #00ff00;
  font-size: 10px;
  font-family: 'Courier New', monospace;
}

/* Status Indicators */
.status-indicators {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #003300;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-led {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #333;
  border: 1px solid #00ff00;
}

.status-led.active {
  background: #00ff00;
  box-shadow: 0 0 10px #00ff00;
  animation: pulse-led 2s infinite;
}

@keyframes pulse-led {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-label {
  color: #00ff00;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* Warning Panel */
.warning-panel {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 4px;
  overflow: hidden;
}

.warning-section {
  border-right: 1px solid #003300;
}

.warning-title {
  background: linear-gradient(180deg, #330000 0%, #1a0000 100%);
  color: #ff0000;
  text-align: center;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-bottom: 1px solid #ff0000;
}

.warning-items {
  padding: 1rem;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(0, 51, 0, 0.2);
  border: 1px solid #00ff00;
  border-radius: 4px;
}

.warning-item.ok {
  border-color: #00ff00;
}

.warning-item.critical {
  background: rgba(51, 0, 0, 0.3);
  border-color: #ff0000;
  animation: blink-warning 1s infinite;
}

.warning-item.warning {
  background: rgba(51, 51, 0, 0.2);
  border-color: #ffff00;
}

.warning-item.caution {
  background: rgba(51, 26, 0, 0.2);
  border-color: #ff9900;
}

@keyframes blink-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.warning-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.warning-item.ok .warning-icon {
  color: #00ff00;
}

.warning-item.critical .warning-icon {
  color: #ff0000;
}

.warning-item.warning .warning-icon {
  color: #ffff00;
}

.warning-item.caution .warning-icon {
  color: #ff9900;
}

.warning-text {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.warning-item.ok .warning-text {
  color: #00ff00;
}

.warning-item.critical .warning-text {
  color: #ff0000;
}

.warning-item.warning .warning-text {
  color: #ffff00;
}

.warning-item.caution .warning-text {
  color: #ff9900;
}

/* Info Section */
.info-section {
  padding: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(0, 51, 0, 0.2);
  border: 1px solid #003300;
  border-radius: 4px;
}

.info-label {
  color: #00ff00;
  font-size: 0.75rem;
  font-weight: 700;
}

.info-value {
  color: #00ff00;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Map Section */
.map-section {
  margin-top: 1rem;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 4px;
  overflow: hidden;
}

.map-selector {
  padding: 1rem;
  background: linear-gradient(180deg, #003300 0%, #001a00 100%);
  border-bottom: 1px solid #00ff00;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.selector-title {
  color: #00ff00;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.selector-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.map-btn {
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
  color: #00ff00;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  text-transform: uppercase;
}

.map-btn:hover {
  background: rgba(0, 255, 0, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
  transform: translateY(-2px);
}

.map-btn.active {
  background: rgba(0, 255, 0, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  border-color: #00ff00;
}

.map-btn.flightradar {
  border-color: #00ff88;
  color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
}

.map-btn.flightradar:hover {
  background: rgba(0, 255, 136, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
}

.map-btn.flightradar.active {
  background: rgba(0, 255, 136, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.map-container {
  padding: 1rem;
  animation: mapFadeIn 0.3s ease-in-out;
}

@keyframes mapFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 1200px) {
  .instrument-panel {
    grid-template-columns: 1fr;
  }

  .warning-panel {
    grid-template-columns: 1fr;
  }

  .warning-section {
    border-right: none;
    border-bottom: 1px solid #003300;
  }

  .selector-buttons {
    width: 100%;
    flex-direction: column;
  }

  .map-btn {
    width: 100%;
  }
}
</style>
