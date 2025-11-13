<template>
  <div class="flightradar-map-container">
    <div class="map-header">
      <div class="map-title">
        <span class="radar-icon">📡</span>
        FLIGHTRADAR24 STYLE TRACKING
      </div>
      <div class="map-controls">
        <button class="mode-btn" :class="{ active: viewMode === 'map' }" @click="viewMode = 'map'">MAP</button>
        <button class="mode-btn" :class="{ active: viewMode === 'radar' }" @click="viewMode = 'radar'">RADAR</button>
        <button class="control-btn" @click="follow = !follow">
          {{ follow ? '📍 FOLLOWING' : '📍 FOLLOW' }}
        </button>
      </div>
    </div>

    <div class="map-viewport">
      <svg class="tracking-svg" viewBox="0 0 1200 700">
        <!-- Dark Background -->
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%">
            <stop offset="0%" style="stop-color:#001a33;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000;stop-opacity:1" />
          </radialGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="1200" height="700" fill="url(#radarGlow)" />

        <!-- Grid Lines (Flightradar style) -->
        <g class="grid-lines" opacity="0.15">
          <line v-for="x in 24" :key="`vgrid-${x}`"
            :x1="x * 50" y1="0"
            :x2="x * 50" y2="700"
            stroke="#00ff88" stroke-width="0.5"
          />
          <line v-for="y in 14" :key="`hgrid-${y}`"
            x1="0" :y1="y * 50"
            x2="1200" :y2="y * 50"
            stroke="#00ff88" stroke-width="0.5"
          />
        </g>

        <!-- Aegean Coastlines (Simplified dark style) -->
        <path
          d="M 300,100 L 400,120 L 550,140 L 700,150 L 850,140 L 950,120 L 1050,100"
          stroke="#00ff88"
          stroke-width="1.5"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 150,250 L 200,350 L 220,450 L 200,550 L 180,650"
          stroke="#00ff88"
          stroke-width="1.5"
          fill="none"
          opacity="0.4"
        />

        <!-- Range Rings (like radar) -->
        <g v-if="viewMode === 'radar'" class="range-rings">
          <circle
            v-for="(range, idx) in [80, 160, 240]"
            :key="`ring-${idx}`"
            :cx="centerX"
            :cy="centerY"
            :r="range"
            fill="none"
            stroke="#00ff88"
            stroke-width="1"
            opacity="0.2"
            stroke-dasharray="4,4"
          />
          <text
            v-for="(range, idx) in [80, 160, 240]"
            :key="`ring-label-${idx}`"
            :x="centerX + 10"
            :y="centerY - range"
            class="range-label"
          >
            {{ (idx + 1) * 50 }} NM
          </text>
        </g>

        <!-- Vessel Trail (flight path style) -->
        <polyline
          v-if="trail.length > 1"
          :points="trail.join(' ')"
          stroke="#ff9900"
          stroke-width="2"
          fill="none"
          opacity="0.6"
          filter="url(#glow)"
        />

        <!-- Trail dots -->
        <circle
          v-for="(point, idx) in trailDots"
          :key="`dot-${idx}`"
          :cx="point.x"
          :cy="point.y"
          r="3"
          fill="#ff9900"
          :opacity="0.3 + (idx / trailDots.length) * 0.7"
        />

        <!-- Vessel Icon (aircraft style) -->
        <g :transform="`translate(${vesselX}, ${vesselY})`">
          <!-- Vessel shadow/glow -->
          <circle cx="0" cy="0" r="25" fill="#ffff00" opacity="0.1">
            <animate attributeName="r" values="25;35;25" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
          </circle>

          <!-- Heading line -->
          <line
            x1="0" y1="0"
            x2="0" y2="-60"
            stroke="#ffff00"
            stroke-width="2"
            :transform="`rotate(${heading})`"
            opacity="0.6"
          />

          <!-- Aircraft-style vessel icon -->
          <g :transform="`rotate(${heading})`">
            <!-- Fuselage -->
            <ellipse cx="0" cy="0" rx="8" ry="20" fill="#ffff00" stroke="#ff9900" stroke-width="2" />
            <!-- Wings -->
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#ffff00" stroke-width="6" stroke-linecap="round" />
            <!-- Tail -->
            <line x1="-6" y1="15" x2="6" y2="15" stroke="#ffff00" stroke-width="4" stroke-linecap="round" />
            <!-- Nose -->
            <circle cx="0" cy="-18" r="3" fill="#ff9900" />
          </g>

          <!-- Speed vector -->
          <line
            v-if="speed > 0"
            x1="0" y1="0"
            :x2="speedVectorX"
            :y2="speedVectorY"
            stroke="#00ff88"
            stroke-width="2"
            stroke-dasharray="4,2"
            opacity="0.8"
          />
        </g>

        <!-- Waypoints / Landmarks -->
        <g v-for="(landmark, idx) in landmarks" :key="`landmark-${idx}`" :transform="`translate(${landmark.x}, ${landmark.y})`">
          <circle cx="0" cy="0" r="5" fill="none" stroke="#00ff88" stroke-width="1.5" />
          <text x="10" y="5" class="landmark-label">{{ landmark.name }}</text>
        </g>

        <!-- Info Cards -->
        <g transform="translate(30, 30)">
          <rect x="0" y="0" width="200" height="120" fill="rgba(0, 0, 0, 0.85)" stroke="#00ff88" stroke-width="1.5" rx="4" />

          <text x="10" y="20" class="info-title">VESSEL DATA</text>

          <text x="10" y="45" class="info-label">POS:</text>
          <text x="60" y="45" class="info-value">{{ formatPos(position?.latitude) }}N</text>
          <text x="60" y="60" class="info-value">{{ formatPos(position?.longitude) }}E</text>

          <text x="10" y="80" class="info-label">HDG:</text>
          <text x="60" y="80" class="info-value">{{ formatHeading(heading) }}°</text>

          <text x="10" y="95" class="info-label">SPD:</text>
          <text x="60" y="95" class="info-value">{{ formatSpeed(speed) }} kts</text>

          <text x="10" y="110" class="info-label">ALT:</text>
          <text x="60" y="110" class="info-value">{{ formatAlt(depth) }} m</text>
        </g>

        <!-- Time Display -->
        <g transform="translate(1020, 30)">
          <rect x="0" y="0" width="160" height="50" fill="rgba(0, 0, 0, 0.85)" stroke="#00ff88" stroke-width="1.5" rx="4" />
          <text x="10" y="25" class="time-label">UTC</text>
          <text x="10" y="42" class="time-value">{{ currentTime }}</text>
        </g>

        <!-- Compass Rose -->
        <g :transform="`translate(1100, 600)`">
          <circle cx="0" cy="0" r="50" fill="rgba(0, 0, 0, 0.7)" stroke="#00ff88" stroke-width="1.5" />

          <!-- Cardinal directions -->
          <text x="0" y="-35" text-anchor="middle" class="compass-text">N</text>
          <text x="35" y="5" text-anchor="middle" class="compass-text">E</text>
          <text x="0" y="40" text-anchor="middle" class="compass-text">S</text>
          <text x="-35" y="5" text-anchor="middle" class="compass-text">W</text>

          <!-- Heading needle -->
          <line
            x1="0" y1="0"
            x2="0" y2="-40"
            stroke="#ff9900"
            stroke-width="3"
            :transform="`rotate(${heading})`"
          />
          <polygon
            points="0,-40 -4,-30 4,-30"
            fill="#ff9900"
            :transform="`rotate(${heading})`"
          />
        </g>
      </svg>
    </div>

    <!-- Bottom Info Bar (Flightradar style) -->
    <div class="bottom-bar">
      <div class="bar-section">
        <span class="bar-label">MODE:</span>
        <span class="bar-value">{{ viewMode.toUpperCase() }}</span>
      </div>
      <div class="bar-section">
        <span class="bar-label">TRACKING:</span>
        <span class="bar-value">{{ follow ? 'ACTIVE' : 'PAUSED' }}</span>
      </div>
      <div class="bar-section">
        <span class="bar-label">TRAIL:</span>
        <span class="bar-value">{{ trail.length }} POINTS</span>
      </div>
      <div class="bar-section">
        <span class="bar-label">ZOOM:</span>
        <span class="bar-value">{{ zoomLevel }}x</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps<{
  position?: { latitude: number; longitude: number };
  heading?: number;
  speed?: number;
  depth?: number;
  apiUrl?: string;
}>();

// State
const viewMode = ref<'map' | 'radar'>('map');
const follow = ref(true);
const zoomLevel = ref(2);
const currentTime = ref('');
const trail = ref<string[]>([]);

const centerX = 600;
const centerY = 350;

// Landmarks
const landmarks = [
  { x: 400, y: 200, name: 'LESVOS' },
  { x: 420, y: 280, name: 'CHIOS' },
  { x: 500, y: 360, name: 'SAMOS' },
  { x: 650, y: 520, name: 'RHODES' },
];

// Computed
const vesselX = computed(() => {
  if (!props.position) return centerX;
  // Map real position to SVG coordinates
  const lon = props.position.longitude;
  return 300 + (lon - 26) * 150;
});

const vesselY = computed(() => {
  if (!props.position) return centerY;
  const lat = props.position.latitude;
  return 600 - (lat - 36) * 100;
});

const heading = computed(() => props.heading || 0);
const speed = computed(() => props.speed || 0);
const depth = computed(() => props.depth || 0);

const speedVectorX = computed(() => {
  return Math.sin((heading.value * Math.PI) / 180) * speed.value * 10;
});

const speedVectorY = computed(() => {
  return -Math.cos((heading.value * Math.PI) / 180) * speed.value * 10;
});

const trailDots = computed(() => {
  return trail.value.map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x, y };
  }).filter((_, idx) => idx % 3 === 0); // Show every 3rd point
});

// Functions
function formatPos(value?: number): string {
  if (!value) return '--.-';
  return value.toFixed(4);
}

function formatHeading(value?: number): string {
  if (!value) return '---';
  return Math.round(value).toString().padStart(3, '0');
}

function formatSpeed(value?: number): string {
  if (!value) return '--.-';
  return value.toFixed(1);
}

function formatAlt(value?: number): string {
  if (!value) return '---';
  return Math.round(value).toString();
}

function updateTime() {
  const now = new Date();
  currentTime.value = now.toUTCString().split(' ')[4]; // HH:MM:SS
}

function updateTrail() {
  if (props.position && follow.value) {
    const point = `${vesselX.value},${vesselY.value}`;
    trail.value.push(point);

    // Keep only last 100 points
    if (trail.value.length > 100) {
      trail.value.shift();
    }
  }
}

// Intervals
let timeInterval: any = null;
let trailInterval: any = null;

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
  trailInterval = setInterval(updateTrail, 3000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (trailInterval) clearInterval(trailInterval);
});
</script>

<style scoped>
.flightradar-map-container {
  background: #000;
  border: 2px solid #00ff88;
  border-radius: 4px;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(180deg, #001a1a 0%, #000 100%);
  border-bottom: 1px solid #00ff88;
}

.map-title {
  color: #00ff88;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.radar-icon {
  font-size: 1.25rem;
  animation: radar-pulse 2s infinite;
}

@keyframes radar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-btn {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  color: #00ff88;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  transition: all 0.2s;
}

.mode-btn.active {
  background: rgba(0, 255, 136, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.mode-btn:hover {
  background: rgba(0, 255, 136, 0.2);
}

.control-btn {
  background: rgba(255, 255, 0, 0.1);
  border: 1px solid #ffff00;
  color: #ffff00;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 0, 0.2);
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
}

.map-viewport {
  width: 100%;
  height: 500px;
  background: #000;
  position: relative;
}

.tracking-svg {
  width: 100%;
  height: 100%;
}

.range-label {
  fill: #00ff88;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  opacity: 0.6;
}

.landmark-label {
  fill: #00ff88;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  opacity: 0.7;
}

.info-title {
  fill: #00ff88;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.info-label {
  fill: #00ff88;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  opacity: 0.8;
}

.info-value {
  fill: #ffff00;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.time-label {
  fill: #00ff88;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  opacity: 0.8;
}

.time-value {
  fill: #ffff00;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.compass-text {
  fill: #00ff88;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.bottom-bar {
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 1rem;
  background: rgba(0, 26, 26, 0.9);
  border-top: 1px solid #00ff88;
}

.bar-section {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.bar-label {
  color: #00ff88;
  opacity: 0.8;
}

.bar-value {
  color: #ffff00;
  font-weight: 700;
}
</style>
