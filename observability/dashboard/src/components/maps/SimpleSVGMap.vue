<template>
  <div class="simple-map-container">
    <div class="map-header">
      <div class="map-title">SIMPLE SVG MAP</div>
      <div class="map-controls">
        <button class="zoom-btn" @click="zoomLevel = Math.max(1, zoomLevel - 1)">-</button>
        <span class="zoom-level">{{ zoomLevel }}x</span>
        <button class="zoom-btn" @click="zoomLevel = Math.min(5, zoomLevel + 1)">+</button>
      </div>
    </div>

    <div class="map-viewport">
      <svg class="map-svg" :viewBox="viewBox">
        <!-- Background -->
        <rect x="0" y="0" width="1000" height="800" fill="#001a33" />

        <!-- Aegean Sea Simplified Coastlines -->
        <!-- Turkey Coast -->
        <path
          d="M 200,100 L 300,150 L 400,180 L 500,200 L 600,210 L 700,200 L 800,180 L 850,150"
          stroke="#00ff00"
          stroke-width="2"
          fill="none"
          opacity="0.8"
        />
        <text x="500" y="170" class="coast-label">TURKEY</text>

        <!-- Greece Coast -->
        <path
          d="M 100,300 L 150,350 L 200,450 L 250,550 L 200,650 L 150,700"
          stroke="#00ff00"
          stroke-width="2"
          fill="none"
          opacity="0.8"
        />
        <text x="150" y="500" class="coast-label">GREECE</text>

        <!-- Islands -->
        <!-- Lesvos -->
        <circle cx="300" cy="280" r="15" fill="#003300" stroke="#00ff00" stroke-width="1.5" />
        <text x="300" y="315" class="island-label">LESVOS</text>

        <!-- Chios -->
        <circle cx="320" cy="350" r="12" fill="#003300" stroke="#00ff00" stroke-width="1.5" />
        <text x="320" y="380" class="island-label">CHIOS</text>

        <!-- Samos -->
        <circle cx="380" cy="420" r="10" fill="#003300" stroke="#00ff00" stroke-width="1.5" />
        <text x="380" y="445" class="island-label">SAMOS</text>

        <!-- Rhodes -->
        <circle cx="500" cy="600" r="14" fill="#003300" stroke="#00ff00" stroke-width="1.5" />
        <text x="500" y="630" class="island-label">RHODES</text>

        <!-- Crete -->
        <ellipse cx="350" cy="700" rx="60" ry="15" fill="#003300" stroke="#00ff00" stroke-width="1.5" />
        <text x="350" y="710" class="island-label">CRETE</text>

        <!-- Vessel Position -->
        <g v-if="position" :transform="`translate(${positionX}, ${positionY})`">
          <!-- Position circle -->
          <circle cx="0" cy="0" r="8" fill="#ffff00" stroke="#ff9900" stroke-width="2">
            <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
          </circle>

          <!-- Heading indicator -->
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-30"
            stroke="#ffff00"
            stroke-width="3"
            :transform="`rotate(${heading})`"
          />
          <polygon
            points="0,-30 -5,-20 5,-20"
            fill="#ffff00"
            :transform="`rotate(${heading})`"
          />

          <!-- Track line (breadcrumb trail) -->
          <polyline
            v-if="trackPoints.length > 0"
            :points="trackPoints.join(' ')"
            stroke="#ff9900"
            stroke-width="2"
            fill="none"
            opacity="0.6"
          />
        </g>

        <!-- Range Rings -->
        <circle
          v-for="range in [50, 100, 150]"
          :key="`range-${range}`"
          :cx="positionX"
          :cy="positionY"
          :r="range"
          fill="none"
          stroke="#00ff00"
          stroke-width="1"
          opacity="0.2"
          stroke-dasharray="5,5"
        />

        <!-- Grid Lines -->
        <g class="grid" opacity="0.1">
          <line v-for="x in 10" :key="`vline-${x}`"
            :x1="x * 100" y1="0"
            :x2="x * 100" y2="800"
            stroke="#00ff00" stroke-width="1"
          />
          <line v-for="y in 8" :key="`hline-${y}`"
            x1="0" :y1="y * 100"
            x2="1000" :y2="y * 100"
            stroke="#00ff00" stroke-width="1"
          />
        </g>

        <!-- Scale Bar -->
        <g transform="translate(850, 750)">
          <line x1="0" y1="0" x2="100" y2="0" stroke="#00ff00" stroke-width="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#00ff00" stroke-width="2" />
          <line x1="100" y1="-5" x2="100" y2="5" stroke="#00ff00" stroke-width="2" />
          <text x="50" y="20" class="scale-label">10 NM</text>
        </g>
      </svg>

      <!-- Position Info Overlay -->
      <div class="position-info">
        <div class="info-row">
          <span class="info-label">POS:</span>
          <span class="info-value">{{ formatCoordinate(position?.latitude, 'lat') }} {{ formatCoordinate(position?.longitude, 'lon') }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">HDG:</span>
          <span class="info-value">{{ formatHeading(heading) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">ZOOM:</span>
          <span class="info-value">{{ zoomLevel }}x</span>
        </div>
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
  apiUrl?: string;
}>();

// State
const zoomLevel = ref(2);
const trackPoints = ref<string[]>([]);

// Computed
const viewBox = computed(() => {
  const zoom = zoomLevel.value;
  const width = 1000 / zoom;
  const height = 800 / zoom;
  const x = (1000 - width) / 2;
  const y = (800 - height) / 2;
  return `${x} ${y} ${width} ${height}`;
});

// Convert real lat/lon to SVG coordinates (simplified)
const positionX = computed(() => {
  if (!props.position) return 500;
  // Map longitude to X (26-28°E roughly maps to center Aegean)
  const lon = props.position.longitude;
  return 200 + (lon - 26) * 150;
});

const positionY = computed(() => {
  if (!props.position) return 400;
  // Map latitude to Y (36-40°N roughly maps to Aegean)
  const lat = props.position.latitude;
  return 700 - (lat - 36) * 100;
});

// Functions
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

function formatHeading(value?: number): string {
  if (value === undefined || value === null) return '---';
  return Math.round(value).toString().padStart(3, '0');
}

// Track recording
let trackInterval: any = null;

function recordTrack() {
  if (props.position) {
    const point = `${positionX.value},${positionY.value}`;
    trackPoints.value.push(point);

    // Keep only last 50 points
    if (trackPoints.value.length > 50) {
      trackPoints.value.shift();
    }
  }
}

onMounted(() => {
  // Record track every 5 seconds
  trackInterval = setInterval(recordTrack, 5000);
});

onUnmounted(() => {
  if (trackInterval) clearInterval(trackInterval);
});
</script>

<style scoped>
.simple-map-container {
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 4px;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(180deg, #003300 0%, #001a00 100%);
  border-bottom: 1px solid #00ff00;
}

.map-title {
  color: #00ff00;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-btn {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid #00ff00;
  color: #00ff00;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: rgba(0, 255, 0, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.zoom-level {
  color: #00ff00;
  font-size: 0.875rem;
  min-width: 40px;
  text-align: center;
}

.map-viewport {
  position: relative;
  width: 100%;
  height: 500px;
  background: #001a33;
}

.map-svg {
  width: 100%;
  height: 100%;
}

.coast-label {
  fill: #00ff00;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  text-anchor: middle;
  opacity: 0.8;
}

.island-label {
  fill: #00ff00;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  text-anchor: middle;
  opacity: 0.6;
}

.scale-label {
  fill: #00ff00;
  font-size: 10px;
  font-family: 'Courier New', monospace;
  text-anchor: middle;
}

.position-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff00;
  border-radius: 4px;
  padding: 0.75rem;
  min-width: 280px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #00ff00;
  font-weight: 700;
}

.info-value {
  color: #00ff00;
  font-family: 'Courier New', monospace;
}
</style>
