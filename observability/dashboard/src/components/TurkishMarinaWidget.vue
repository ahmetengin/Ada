<template>
  <div class="turkish-marina-widget">
    <div class="widget-header">
      <div class="header-left">
        <div class="widget-icon">🇹🇷</div>
        <div class="header-text">
          <h3>Türk Marinaları</h3>
          <p class="subtitle">VHF Channels & Marina Services</p>
        </div>
      </div>
      <button class="refresh-btn" @click="fetchData">
        🔄 Yenile
      </button>
    </div>

    <div class="widget-body">
      <!-- Nearest Marina -->
      <div v-if="nearestMarina" class="nearest-marina">
        <div class="nearest-header">
          <span class="nearest-label">En Yakın Marina</span>
          <div class="distance-badge">
            <span class="distance">{{ nearestMarina.distance?.toFixed(1) || '--' }} nm</span>
            <span class="bearing">{{ nearestMarina.bearing }}°</span>
          </div>
        </div>

        <div class="marina-card featured">
          <div class="marina-header">
            <h4>{{ nearestMarina.name }}</h4>
            <div class="availability-badge" :class="`status-${nearestMarina.availability}`">
              {{ getAvailabilityLabel(nearestMarina.availability) }}
            </div>
          </div>

          <!-- VHF Channel (Prominent) -->
          <div class="vhf-channel-card">
            <div class="vhf-icon">📻</div>
            <div class="vhf-info">
              <div class="channel-number">Kanal {{ nearestMarina.vhfChannel }}</div>
              <div class="channel-label">VHF İletişim Kanalı</div>
            </div>
            <button class="tune-btn" @click="tuneVHF(nearestMarina.vhfChannel)">
              🎯 Ayarla
            </button>
          </div>

          <!-- Contact Info -->
          <div class="contact-info">
            <div class="contact-item">
              <span class="contact-icon">📞</span>
              <a :href="`tel:${nearestMarina.contacts.phone}`" class="contact-link">
                {{ nearestMarina.contacts.phone }}
              </a>
            </div>
            <div v-if="nearestMarina.contacts.email" class="contact-item">
              <span class="contact-icon">📧</span>
              <a :href="`mailto:${nearestMarina.contacts.email}`" class="contact-link">
                {{ nearestMarina.contacts.email }}
              </a>
            </div>
          </div>

          <!-- Services -->
          <div class="services-section">
            <h5>Hizmetler</h5>
            <div class="services-grid">
              <div
                v-for="service in nearestMarina.services"
                :key="service"
                class="service-badge"
              >
                {{ getServiceIcon(service) }} {{ getServiceLabel(service) }}
              </div>
            </div>
          </div>

          <!-- Marina Details -->
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Derinlik:</span>
              <span class="detail-value">{{ nearestMarina.depth }}m</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Max LOA:</span>
              <span class="detail-value">{{ nearestMarina.maxLOA }}m</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Günlük Ücret:</span>
              <span class="detail-value">
                {{ nearestMarina.pricing.dailyRate }} {{ nearestMarina.pricing.currency }}
              </span>
            </div>
          </div>

          <!-- Customs Hours -->
          <div class="customs-hours">
            <div class="customs-header">
              <span>🛃 Gümrük Saatleri</span>
            </div>
            <div class="hours-text">
              {{ nearestMarina.customsHours.open }} - {{ nearestMarina.customsHours.close }}
              <span v-if="!nearestMarina.customsHours.weekendOpen" class="weekend-note">
                (Hafta sonu kapalı)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- All Marinas Quick Reference -->
      <div v-if="otherMarinas && otherMarinas.length > 0" class="marinas-list">
        <h4>Tüm Marinalar - Hızlı Referans</h4>

        <div class="marinas-table">
          <div class="table-header">
            <div class="col-name">Marina</div>
            <div class="col-vhf">VHF</div>
            <div class="col-distance">Mesafe</div>
            <div class="col-status">Durum</div>
          </div>

          <div
            v-for="marina in allMarinas"
            :key="marina.name"
            class="table-row"
            :class="{ selected: marina.name === nearestMarina?.name }"
            @click="selectMarina(marina)"
          >
            <div class="col-name">
              <span class="marina-name">{{ marina.name }}</span>
            </div>
            <div class="col-vhf">
              <span class="vhf-badge">Ch {{ marina.vhfChannel }}</span>
            </div>
            <div class="col-distance">
              <span v-if="marina.distance">{{ marina.distance.toFixed(1) }} nm</span>
              <span v-else class="unknown">--</span>
            </div>
            <div class="col-status">
              <span class="status-dot" :class="`status-${marina.availability}`"></span>
              {{ getAvailabilityLabel(marina.availability) }}
            </div>
          </div>
        </div>
      </div>

      <!-- VHF Quick Reference Card -->
      <div class="vhf-quick-ref">
        <h5>📻 VHF Hızlı Referans</h5>
        <div class="vhf-channels">
          <div class="vhf-channel-item">
            <span class="ch-number">16</span>
            <span class="ch-desc">Acil / Çağrı</span>
          </div>
          <div class="vhf-channel-item">
            <span class="ch-number">12</span>
            <span class="ch-desc">Port Operations</span>
          </div>
          <div class="vhf-channel-item">
            <span class="ch-number">72</span>
            <span class="ch-desc">Marina Working</span>
          </div>
          <div class="vhf-channel-item">
            <span class="ch-number">73</span>
            <span class="ch-desc">Marina Working</span>
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
  currentPosition?: { latitude: number; longitude: number };
}>();

// State
const marinas = ref<any[]>([]);
const loading = ref(false);

const API_URL = props.apiUrl || 'http://localhost:8000';
let refreshInterval: any = null;

// Computed
const allMarinas = computed(() => marinas.value);

const nearestMarina = computed(() => {
  if (marinas.value.length === 0) return null;
  return marinas.value[0];
});

const otherMarinas = computed(() => {
  if (marinas.value.length <= 1) return [];
  return marinas.value.slice(1);
});

// Functions
function getAvailabilityLabel(status: string): string {
  const labels: Record<string, string> = {
    available: 'Müsait',
    limited: 'Sınırlı',
    full: 'Dolu',
    unknown: 'Bilinmiyor',
  };
  return labels[status] || status;
}

function getServiceIcon(service: string): string {
  const icons: Record<string, string> = {
    fuel: '⛽',
    water: '💧',
    electricity: '⚡',
    'pump-out': '🚽',
    wifi: '📶',
    repair: '🔧',
    chandlery: '🛒',
  };
  return icons[service] || '•';
}

function getServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    fuel: 'Yakıt',
    water: 'Su',
    electricity: 'Elektrik',
    'pump-out': 'Pump-out',
    wifi: 'WiFi',
    repair: 'Tamir',
    chandlery: 'Chandlery',
  };
  return labels[service] || service;
}

function tuneVHF(channel: number): void {
  // Emit event to tune VHF radio
  console.log(`Tuning VHF to channel ${channel}`);
  // TODO: Integrate with VHF radio service
}

function selectMarina(marina: any): void {
  // Move selected marina to top
  marinas.value = [marina, ...marinas.value.filter(m => m.name !== marina.name)];
}

async function fetchData(): Promise<void> {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    if (props.currentPosition) {
      params.append('lat', props.currentPosition.latitude.toString());
      params.append('lon', props.currentPosition.longitude.toString());
    }

    const response = await fetch(`${API_URL}/api/observer/turkish-marinas?${params}`);
    if (response.ok) {
      marinas.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching marina data:', error);
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
.turkish-marina-widget {
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
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
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

/* Nearest Marina */
.nearest-marina {
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
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.distance, .bearing {
  background: rgba(96, 165, 250, 0.2);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Marina Card */
.marina-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.marina-card.featured {
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
}

.marina-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.marina-header h4 {
  color: #e0e0e0;
  font-size: 1.5rem;
  margin: 0;
}

.availability-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-available {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  border: 1px solid #4ade80;
}

.status-limited {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid #fbbf24;
}

.status-full {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.status-unknown {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  border: 1px solid #94a3b8;
}

/* VHF Channel Card */
.vhf-channel-card {
  background: linear-gradient(135deg, rgba(168, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 2px solid #a78bfa;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.vhf-icon {
  font-size: 3rem;
  line-height: 1;
}

.vhf-info {
  flex: 1;
}

.channel-number {
  color: #a78bfa;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.channel-label {
  color: #d1d5db;
  font-size: 0.875rem;
}

.tune-btn {
  background: rgba(168, 139, 250, 0.2);
  border: 1px solid #a78bfa;
  color: #a78bfa;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.tune-btn:hover {
  background: rgba(168, 139, 250, 0.3);
  transform: scale(1.05);
}

/* Contact Info */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.contact-icon {
  font-size: 1.25rem;
}

.contact-link {
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
}

.contact-link:hover {
  text-decoration: underline;
}

/* Services */
.services-section {
  margin-bottom: 1.5rem;
}

.services-section h5 {
  color: #e0e0e0;
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.services-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.service-badge {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid #60a5fa;
  color: #60a5fa;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Details Grid */
.details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  color: #a0a0a0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 1rem;
}

/* Customs Hours */
.customs-hours {
  background: rgba(96, 165, 250, 0.05);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.customs-header {
  color: #60a5fa;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.hours-text {
  color: #e0e0e0;
  font-size: 0.875rem;
}

.weekend-note {
  color: #a0a0a0;
  font-size: 0.75rem;
  font-style: italic;
}

/* Marinas List */
.marinas-list {
  margin-bottom: 2rem;
}

.marinas-list h4 {
  color: #e0e0e0;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.marinas-table {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  align-items: center;
}

.table-header {
  background: rgba(255, 255, 255, 0.05);
  color: #a0a0a0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.table-row {
  color: #e0e0e0;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.table-row.selected {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
}

.table-row:last-child {
  border-bottom: none;
}

.marina-name {
  font-weight: 600;
}

.vhf-badge {
  background: rgba(168, 139, 250, 0.2);
  border: 1px solid #a78bfa;
  color: #a78bfa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75rem;
  display: inline-block;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-dot.status-available {
  background: #4ade80;
}

.status-dot.status-limited {
  background: #fbbf24;
}

.status-dot.status-full {
  background: #ef4444;
}

.status-dot.status-unknown {
  background: #94a3b8;
}

/* VHF Quick Reference */
.vhf-quick-ref {
  background: rgba(168, 139, 250, 0.05);
  border: 1px solid rgba(168, 139, 250, 0.2);
  border-radius: 8px;
  padding: 1rem;
}

.vhf-quick-ref h5 {
  color: #a78bfa;
  font-size: 0.875rem;
  margin: 0 0 0.75rem 0;
}

.vhf-channels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.vhf-channel-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.ch-number {
  background: rgba(168, 139, 250, 0.2);
  border: 1px solid #a78bfa;
  color: #a78bfa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.875rem;
  min-width: 40px;
  text-align: center;
}

.ch-desc {
  color: #d1d5db;
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .table-header {
    display: none;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .vhf-channels {
    grid-template-columns: 1fr;
  }
}
</style>
