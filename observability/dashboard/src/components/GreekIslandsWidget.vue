<template>
  <div class="greek-islands-widget">
    <div class="widget-header">
      <div class="header-left">
        <div class="widget-icon">🇬🇷</div>
        <div class="header-text">
          <h3>Yunan Adaları</h3>
          <p class="subtitle">Proximity & Border Crossing Info</p>
        </div>
      </div>
      <button class="refresh-btn" @click="fetchData">
        🔄 Yenile
      </button>
    </div>

    <div class="widget-body">
      <!-- Nearest Island -->
      <div v-if="nearestIsland" class="nearest-island">
        <div class="nearest-header">
          <span class="nearest-label">En Yakın Ada</span>
          <span class="distance-badge">{{ nearestIsland.distance.toFixed(1) }} nm</span>
        </div>

        <div class="island-card featured">
          <div class="island-info">
            <h4>{{ nearestIsland.name }}</h4>
            <p class="greek-name">{{ nearestIsland.nameGreek }}</p>
            <div class="bearing">
              <span class="compass-icon">🧭</span>
              {{ nearestIsland.bearing }}° ({{ getCompassDirection(nearestIsland.bearing) }})
            </div>
          </div>

          <!-- Facilities -->
          <div class="facilities">
            <div
              v-for="(available, facility) in nearestIsland.facilities"
              :key="facility"
              class="facility-badge"
              :class="{ available, unavailable: !available }"
            >
              {{ getFacilityIcon(facility) }} {{ getFacilityLabel(facility) }}
            </div>
          </div>

          <!-- Customs Hours -->
          <div v-if="nearestIsland.customsHours" class="customs-info">
            <div class="customs-header">
              <span class="customs-icon">🛃</span>
              <span>Gümrük Saatleri</span>
            </div>
            <div class="customs-hours">
              {{ nearestIsland.customsHours.open }} - {{ nearestIsland.customsHours.close }}
              <span v-if="!nearestIsland.customsHours.weekendOpen" class="weekend-note">
                (Hafta sonu kapalı)
              </span>
            </div>
          </div>

          <!-- Harbors -->
          <div v-if="nearestIsland.harbors && nearestIsland.harbors.length > 0" class="harbors">
            <h5>Limanlar</h5>
            <div class="harbor-list">
              <div
                v-for="harbor in nearestIsland.harbors"
                :key="harbor.name"
                class="harbor-item"
              >
                <span class="harbor-name">{{ harbor.name }}</span>
                <div class="harbor-details">
                  <span v-if="harbor.vhfChannel" class="vhf">Ch {{ harbor.vhfChannel }}</span>
                  <span class="depth">{{ harbor.depth }}m</span>
                  <span class="shelter" :class="`shelter-${harbor.shelter}`">
                    {{ getShelterLabel(harbor.shelter) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Emergency Services -->
          <div class="emergency-services">
            <h5>🚨 Acil Durum</h5>
            <div class="service-list">
              <div class="service-item">
                <span class="service-label">Sahil Güvenlik:</span>
                <a :href="`tel:${nearestIsland.emergencyServices.coastGuard}`" class="service-phone">
                  {{ nearestIsland.emergencyServices.coastGuard }}
                </a>
              </div>
              <div class="service-item">
                <span class="service-label">Hastane:</span>
                <a :href="`tel:${nearestIsland.emergencyServices.medical}`" class="service-phone">
                  {{ nearestIsland.emergencyServices.medical }}
                </a>
              </div>
              <div class="service-item">
                <span class="service-label">Polis:</span>
                <a :href="`tel:${nearestIsland.emergencyServices.police}`" class="service-phone">
                  {{ nearestIsland.emergencyServices.police }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Other Nearby Islands -->
      <div v-if="otherIslands && otherIslands.length > 0" class="other-islands">
        <h4>Diğer Yakın Adalar</h4>
        <div class="islands-grid">
          <div
            v-for="island in otherIslands"
            :key="island.name"
            class="island-card compact"
            @click="selectIsland(island)"
          >
            <div class="compact-header">
              <span class="island-name">{{ island.name }}</span>
              <span class="distance">{{ island.distance.toFixed(1) }} nm</span>
            </div>
            <div class="compact-facilities">
              <span v-if="island.facilities.fuel" title="Yakıt">⛽</span>
              <span v-if="island.facilities.provisions" title="İaşe">🛒</span>
              <span v-if="island.facilities.medical" title="Sağlık">🏥</span>
              <span v-if="island.facilities.marina" title="Marina">⚓</span>
              <span v-if="island.facilities.customs" title="Gümrük">🛃</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Tips -->
      <div class="quick-tips">
        <h5>💡 Hızlı İpuçları</h5>
        <ul>
          <li>Yunan adalarına geçişte mutlaka gümrük işlemleri yapın</li>
          <li>VHF Ch 16 acil durumlarda, Ch 12 marina iletişimi için</li>
          <li>Euro kabul edilir, bazı yerlerde Türk Lirası da kullanılabilir</li>
          <li>Schengen vizesi gerekli (Türk vatandaşları için)</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps<{
  apiUrl?: string;
  currentPosition?: { latitude: number; longitude: number };
}>();

// State
const islands = ref<any[]>([]);
const loading = ref(false);

const API_URL = props.apiUrl || 'http://localhost:8000';
let refreshInterval: any = null;

// Computed
const nearestIsland = computed(() => {
  if (islands.value.length === 0) return null;
  return islands.value[0];
});

const otherIslands = computed(() => {
  if (islands.value.length <= 1) return [];
  return islands.value.slice(1, 6); // Show up to 5 other islands
});

// Functions
function getCompassDirection(bearing: number): string {
  const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BKB', 'KB', 'KKB'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

function getFacilityIcon(facility: string): string {
  const icons: Record<string, string> = {
    fuel: '⛽',
    provisions: '🛒',
    medical: '🏥',
    marina: '⚓',
    customs: '🛃',
  };
  return icons[facility] || '•';
}

function getFacilityLabel(facility: string): string {
  const labels: Record<string, string> = {
    fuel: 'Yakıt',
    provisions: 'İaşe',
    medical: 'Sağlık',
    marina: 'Marina',
    customs: 'Gümrük',
  };
  return labels[facility] || facility;
}

function getShelterLabel(shelter: string): string {
  const labels: Record<string, string> = {
    excellent: 'Mükemmel',
    good: 'İyi',
    moderate: 'Orta',
    poor: 'Zayıf',
  };
  return labels[shelter] || shelter;
}

function selectIsland(island: any): void {
  // Move selected island to top
  islands.value = [island, ...islands.value.filter(i => i.name !== island.name)];
}

async function fetchData(): Promise<void> {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    if (props.currentPosition) {
      params.append('lat', props.currentPosition.latitude.toString());
      params.append('lon', props.currentPosition.longitude.toString());
    }

    const response = await fetch(`${API_URL}/api/observer/greek-islands?${params}`);
    if (response.ok) {
      islands.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching Greek islands data:', error);
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  fetchData();
  refreshInterval = setInterval(fetchData, 600000); // Refresh every 10 minutes
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.greek-islands-widget {
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

.refresh-btn {
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

.refresh-btn:hover {
  background: rgba(96, 165, 250, 0.2);
}

.widget-body {
  padding: 1.5rem;
}

/* Nearest Island */
.nearest-island {
  margin-bottom: 2rem;
}

.nearest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.nearest-label {
  color: #a0a0a0;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.distance-badge {
  background: rgba(96, 165, 250, 0.2);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Island Card */
.island-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.island-card.featured {
  border-color: rgba(96, 165, 250, 0.3);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.1);
}

.island-info h4 {
  color: #e0e0e0;
  font-size: 1.5rem;
  margin: 0 0 0.25rem 0;
}

.greek-name {
  color: #a0a0a0;
  font-size: 1rem;
  margin: 0 0 1rem 0;
  font-style: italic;
}

.bearing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.compass-icon {
  font-size: 1.25rem;
}

/* Facilities */
.facilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.facility-badge {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid;
}

.facility-badge.available {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
  color: #4ade80;
}

.facility-badge.unavailable {
  background: rgba(148, 163, 184, 0.1);
  border-color: #94a3b8;
  color: #94a3b8;
  opacity: 0.5;
}

/* Customs */
.customs-info {
  background: rgba(96, 165, 250, 0.05);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.customs-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.customs-icon {
  font-size: 1.25rem;
}

.customs-hours {
  color: #e0e0e0;
  font-size: 0.875rem;
}

.weekend-note {
  color: #a0a0a0;
  font-size: 0.75rem;
  font-style: italic;
}

/* Harbors */
.harbors {
  margin-bottom: 1.5rem;
}

.harbors h5 {
  color: #e0e0e0;
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.harbor-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.harbor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.harbor-name {
  color: #e0e0e0;
  font-weight: 500;
  font-size: 0.875rem;
}

.harbor-details {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.75rem;
}

.vhf {
  color: #a78bfa;
  font-weight: 600;
}

.depth {
  color: #60a5fa;
}

.shelter {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
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

.shelter-poor {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Emergency Services */
.emergency-services {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.emergency-services h5 {
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.service-label {
  color: #a0a0a0;
}

.service-phone {
  color: #ef4444;
  font-weight: 600;
  text-decoration: none;
}

.service-phone:hover {
  text-decoration: underline;
}

/* Other Islands */
.other-islands {
  margin-bottom: 2rem;
}

.other-islands h4 {
  color: #e0e0e0;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.islands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.island-card.compact {
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.island-card.compact:hover {
  border-color: rgba(96, 165, 250, 0.5);
  transform: translateY(-2px);
}

.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.island-name {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 0.875rem;
}

.distance {
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 700;
}

.compact-facilities {
  display: flex;
  gap: 0.5rem;
  font-size: 1.25rem;
}

/* Quick Tips */
.quick-tips {
  background: rgba(96, 165, 250, 0.05);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.quick-tips h5 {
  color: #60a5fa;
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
}

.quick-tips ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #d1d5db;
  font-size: 0.875rem;
  line-height: 1.6;
}

.quick-tips li {
  margin-bottom: 0.5rem;
}

.quick-tips li:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .islands-grid {
    grid-template-columns: 1fr;
  }
}
</style>
