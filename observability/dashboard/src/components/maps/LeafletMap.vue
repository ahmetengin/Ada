<template>
  <div class="leaflet-map-container">
    <div class="map-header">
      <div class="map-title">OPENSTREETMAP VIEW</div>
      <div class="map-controls">
        <select v-model="mapStyle" class="style-select">
          <option value="standard">Standard</option>
          <option value="satellite">Satellite</option>
          <option value="dark">Dark Mode</option>
        </select>
        <button class="control-btn" @click="centerOnVessel">📍 Center</button>
        <button class="control-btn" @click="toggleTrack">{{ showTrack ? '✓' : '○' }} Track</button>
      </div>
    </div>

    <div class="map-viewport" ref="mapContainer">
      <!-- Leaflet map will be rendered here via CDN -->
    </div>

    <div class="map-overlay-info">
      <div class="overlay-row">
        <span class="overlay-label">MAP:</span>
        <span class="overlay-value">{{ mapStyle.toUpperCase() }}</span>
      </div>
      <div class="overlay-row">
        <span class="overlay-label">ZOOM:</span>
        <span class="overlay-value">{{ currentZoom }}</span>
      </div>
      <div class="overlay-row">
        <span class="overlay-label">TRACK POINTS:</span>
        <span class="overlay-value">{{ trackPoints.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

// Props
const props = defineProps<{
  position?: { latitude: number; longitude: number };
  heading?: number;
  apiUrl?: string;
}>();

// State
const mapContainer = ref<HTMLElement | null>(null);
const mapStyle = ref('standard');
const currentZoom = ref(10);
const showTrack = ref(true);
const trackPoints = ref<Array<[number, number]>>([]);

// Leaflet map instance (loaded from CDN)
let map: any = null;
let vesselMarker: any = null;
let trackPolyline: any = null;

// Functions
function initMap() {
  if (!mapContainer.value) return;

  // Note: In production, you'd load Leaflet via CDN in index.html
  // For now, we'll create a placeholder that shows the concept

  const defaultLat = props.position?.latitude || 37.5;
  const defaultLon = props.position?.longitude || 27.0;

  // Placeholder: In real implementation, initialize Leaflet here
  console.log('Leaflet map would initialize here', defaultLat, defaultLon);

  // Mock map controls
  mapContainer.value.innerHTML = `
    <div style="width: 100%; height: 100%; background: #1a1a2a; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #00ff00; font-family: 'Courier New', monospace;">
      <div style="font-size: 1.5rem; margin-bottom: 1rem;">📍 OPENSTREETMAP</div>
      <div style="font-size: 1rem; opacity: 0.7; margin-bottom: 0.5rem;">Position: ${defaultLat.toFixed(4)}°N, ${defaultLon.toFixed(4)}°E</div>
      <div style="font-size: 0.875rem; opacity: 0.5;">To enable: Add Leaflet.js to package.json</div>
      <div style="font-size: 0.75rem; opacity: 0.5; margin-top: 1rem;">npm install leaflet vue-leaflet</div>
      <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #00ff00; border-radius: 4px; max-width: 400px;">
        <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">Features:</div>
        <div style="font-size: 0.75rem; opacity: 0.7;">• Real OpenStreetMap tiles</div>
        <div style="font-size: 0.75rem; opacity: 0.7;">• Vessel marker with heading</div>
        <div style="font-size: 0.75rem; opacity: 0.7;">• Track polyline</div>
        <div style="font-size: 0.75rem; opacity: 0.7;">• Zoom & pan controls</div>
        <div style="font-size: 0.75rem; opacity: 0.7;">• Multiple map styles</div>
      </div>
    </div>
  `;
}

function centerOnVessel() {
  if (props.position && map) {
    // map.setView([props.position.latitude, props.position.longitude], currentZoom.value);
    console.log('Centering on vessel:', props.position);
  }
}

function toggleTrack() {
  showTrack.value = !showTrack.value;
  // Update track visibility
}

function updateVesselPosition() {
  if (!props.position) return;

  // Add to track
  if (showTrack.value) {
    trackPoints.value.push([props.position.latitude, props.position.longitude]);
    if (trackPoints.value.length > 100) {
      trackPoints.value.shift();
    }
  }

  // Update marker and polyline in real Leaflet implementation
}

// Watch for position changes
watch(() => props.position, () => {
  updateVesselPosition();
}, { deep: true });

// Lifecycle
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    // map.remove();
  }
});
</script>

<style scoped>
.leaflet-map-container {
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

.style-select {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  outline: none;
}

.style-select:hover {
  background: rgba(0, 255, 0, 0.2);
}

.control-btn {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(0, 255, 0, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.map-viewport {
  width: 100%;
  height: 500px;
  background: #1a1a2a;
  position: relative;
}

.map-overlay-info {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #00ff00;
  border-radius: 4px;
  padding: 0.75rem;
  min-width: 200px;
}

.overlay-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
}

.overlay-row:last-child {
  margin-bottom: 0;
}

.overlay-label {
  color: #00ff00;
  font-weight: 700;
}

.overlay-value {
  color: #00ff00;
}
</style>
