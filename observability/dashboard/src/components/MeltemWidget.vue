<template>
  <div class="meltem-widget">
    <div class="widget-header">
      <div class="header-left">
        <div class="widget-icon">💨</div>
        <div class="header-text">
          <h3>Meltem (Meltemi)</h3>
          <p class="subtitle">Ege Denizi Signature Rüzgarı</p>
        </div>
      </div>
      <div class="status-badge" :class="data?.isActive ? 'active' : 'inactive'">
        {{ data?.isActive ? 'AKTİF' : 'PASİF' }}
      </div>
    </div>

    <div class="widget-body">
      <!-- Current Strength -->
      <div class="current-strength">
        <div class="strength-circle" :class="getStrengthClass(data?.currentStrength)">
          <div class="strength-value">{{ data?.currentStrength || 0 }}</div>
          <div class="strength-unit">knots</div>
        </div>

        <div class="strength-info">
          <div class="info-row">
            <span class="info-label">Trend:</span>
            <span class="info-value" :class="`trend-${data?.trend}`">
              {{ getTrendIcon(data?.trend) }} {{ getTrendLabel(data?.trend) }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Pik Saati:</span>
            <span class="info-value">{{ data?.peakTime || '--:--' }}</span>
          </div>
        </div>
      </div>

      <!-- Animated Wind Indicator -->
      <div class="wind-animation">
        <svg viewBox="0 0 200 80" class="wind-svg">
          <!-- Wind lines animation -->
          <g v-for="n in 5" :key="n" class="wind-line" :style="{ animationDelay: `${n * 0.2}s` }">
            <line
              :x1="20"
              :y1="n * 15"
              :x2="180"
              :y2="n * 15"
              stroke="#60a5fa"
              :stroke-width="3 - n * 0.3"
              stroke-linecap="round"
              :opacity="data?.isActive ? 0.7 : 0.3"
            />
          </g>
        </svg>
      </div>

      <!-- 3-Day Forecast -->
      <div class="forecast-section">
        <h4>3 Günlük Tahmin</h4>
        <div class="forecast-grid">
          <div
            v-for="day in data?.forecast?.slice(0, 3)"
            :key="day.date"
            class="forecast-day"
          >
            <div class="day-name">{{ formatDay(day.date) }}</div>
            <div class="wind-range">
              <span class="min">{{ day.minStrength }}</span>
              <span class="separator">-</span>
              <span class="max">{{ day.maxStrength }}</span>
              <span class="unit">kts</span>
            </div>
            <div class="peak-time">Pik: {{ day.peakTime }}</div>
          </div>
        </div>
      </div>

      <!-- Safe Anchorages -->
      <div class="safe-anchorages" v-if="data?.safeAnchorages && data.safeAnchorages.length > 0">
        <h4>⚓ Güvenli Demirleme Noktaları</h4>
        <div class="anchorage-list">
          <div
            v-for="anchorage in data.safeAnchorages"
            :key="anchorage.name"
            class="anchorage-item"
          >
            <div class="anchorage-name">{{ anchorage.name }}</div>
            <div class="anchorage-details">
              <span class="distance">{{ anchorage.distance.toFixed(1) }} nm</span>
              <span class="shelter" :class="`shelter-${anchorage.shelter}`">
                {{ getShelterIcon(anchorage.shelter) }} {{ getShelterLabel(anchorage.shelter) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div class="warnings-section" v-if="data?.warnings && data.warnings.length > 0">
        <div
          v-for="(warning, idx) in data.warnings"
          :key="idx"
          class="warning-card"
          :class="`severity-${warning.severity}`"
        >
          <div class="warning-icon">{{ getWarningIcon(warning.severity) }}</div>
          <div class="warning-message">{{ warning.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Props
const props = defineProps<{
  apiUrl?: string;
}>();

// State
const data = ref<any>(null);
const loading = ref(false);

const API_URL = props.apiUrl || 'http://localhost:8000';
let refreshInterval: any = null;

// Functions
function getStrengthClass(strength: number | undefined): string {
  if (!strength) return 'calm';
  if (strength < 10) return 'light';
  if (strength < 20) return 'moderate';
  if (strength < 30) return 'strong';
  return 'gale';
}

function getTrendIcon(trend: string | undefined): string {
  if (trend === 'increasing') return '↗️';
  if (trend === 'decreasing') return '↘️';
  return '➡️';
}

function getTrendLabel(trend: string | undefined): string {
  if (trend === 'increasing') return 'Artıyor';
  if (trend === 'decreasing') return 'Azalıyor';
  return 'Sabit';
}

function formatDay(date: Date | string): string {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === tomorrow.toDateString()) return 'Yarın';

  return format(d, 'EEEE', { locale: tr });
}

function getShelterIcon(shelter: string): string {
  if (shelter === 'excellent') return '🛡️';
  if (shelter === 'good') return '✅';
  return '⚠️';
}

function getShelterLabel(shelter: string): string {
  if (shelter === 'excellent') return 'Mükemmel';
  if (shelter === 'good') return 'İyi';
  return 'Orta';
}

function getWarningIcon(severity: string): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning') return '⚠️';
  return 'ℹ️';
}

async function fetchMeltemData(): Promise<void> {
  try {
    loading.value = true;
    const response = await fetch(`${API_URL}/api/observer/meltem`);
    if (response.ok) {
      data.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching Meltem data:', error);
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  fetchMeltemData();
  refreshInterval = setInterval(fetchMeltemData, 300000); // Refresh every 5 minutes
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.meltem-widget {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.widget-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.header-text h3 {
  color: #e0e0e0;
  font-size: 1.25rem;
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: #a0a0a0;
  font-size: 0.875rem;
  margin: 0;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  border: 1px solid #4ade80;
  animation: pulse 2s infinite;
}

.status-badge.inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border: 1px solid #94a3b8;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.widget-body {
  padding: 1.5rem;
}

/* Current Strength */
.current-strength {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.strength-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid;
  position: relative;
  transition: all 0.3s;
}

.strength-circle.calm {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.strength-circle.light {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.strength-circle.moderate {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.strength-circle.strong {
  border-color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.strength-circle.gale {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  animation: gale-pulse 1s infinite;
}

@keyframes gale-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.strength-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #e0e0e0;
  line-height: 1;
}

.strength-unit {
  font-size: 0.875rem;
  color: #a0a0a0;
  margin-top: 0.25rem;
}

.strength-info {
  flex: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #a0a0a0;
  font-size: 0.875rem;
}

.info-value {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 1rem;
}

.trend-increasing {
  color: #f97316;
}

.trend-decreasing {
  color: #4ade80;
}

.trend-steady {
  color: #60a5fa;
}

/* Wind Animation */
.wind-animation {
  margin: 2rem 0;
  height: 80px;
  overflow: hidden;
}

.wind-svg {
  width: 100%;
  height: 100%;
}

.wind-line {
  animation: wind-flow 2s ease-in-out infinite;
}

@keyframes wind-flow {
  0% {
    transform: translateX(-20px);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(20px);
    opacity: 0;
  }
}

/* Forecast */
.forecast-section {
  margin-top: 2rem;
}

.forecast-section h4 {
  color: #e0e0e0;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.forecast-day {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.day-name {
  color: #60a5fa;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}

.wind-range {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.wind-range .min,
.wind-range .max {
  color: #e0e0e0;
  font-size: 1.25rem;
  font-weight: 700;
}

.wind-range .separator {
  color: #a0a0a0;
}

.wind-range .unit {
  color: #a0a0a0;
  font-size: 0.75rem;
}

.peak-time {
  color: #a0a0a0;
  font-size: 0.75rem;
}

/* Safe Anchorages */
.safe-anchorages {
  margin-top: 2rem;
}

.safe-anchorages h4 {
  color: #e0e0e0;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.anchorage-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.anchorage-item {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.anchorage-item:hover {
  border-color: rgba(96, 165, 250, 0.3);
  transform: translateX(4px);
}

.anchorage-name {
  color: #e0e0e0;
  font-weight: 600;
}

.anchorage-details {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.distance {
  color: #60a5fa;
  font-size: 0.875rem;
  font-weight: 600;
}

.shelter {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.shelter-excellent {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.shelter-good {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.shelter-moderate {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

/* Warnings */
.warnings-section {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.warning-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.severity-critical {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.severity-warning {
  background: rgba(251, 191, 36, 0.1);
  border-color: #fbbf24;
}

.severity-info {
  background: rgba(96, 165, 250, 0.1);
  border-color: #60a5fa;
}

.warning-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.warning-message {
  flex: 1;
  color: #e0e0e0;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .forecast-grid {
    grid-template-columns: 1fr;
  }

  .current-strength {
    flex-direction: column;
    text-align: center;
  }
}
</style>
