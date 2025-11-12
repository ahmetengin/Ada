# Ada Observer 🧭

**Zora-tarzı Akıllı Yat Monitoring Sistemi**

Ada Observer, denizcilik dünyasının önde gelen navigasyon sistemi Zora 3.0'dan ilham alınarak geliştirilmiş, Ada.Sea node'u için yeni nesil akıllı izleme ve yönetim platformudur.

## 🌟 Özellikler

### 1. Vessel State Intelligence (Gemi Durumu Zekası)
Ada Observer, geminin o anki durumunu otomatik olarak algılar ve buna göre gösterge panelini dinamik olarak ayarlar.

**Desteklenen Durumlar:**
- `pre-departure` - Kalkış öncesi kontroller
- `at-anchor` / `anchored` - Demir atmış / demirleme
- `underway-sailing` - Yelkenle seyir
- `underway-motoring` - Motorla seyir
- `underway-motorsailing` - Motor + yelken
- `drifting` - Sürüklenme
- `docking` / `docked` - Yanaşma / yanaşmış
- `moored` - Bağlı
- `engine-room-check` - Motor kontrolü
- `maintenance` / `off-season` - Bakım / sezon dışı

**Akıllı Algılama:**
```typescript
// NMEA2000 verilerinden otomatik durum tespiti
const state = observer.detectVesselState();
// confidence: 0-100 (güvenilirlik skoru)
```

### 2. Primary Navigation Display (PND) 🧭

Zora'nın ikonik "fütüristik pusula" ekranı, Ada Observer'da da tam olarak implement edilmiştir.

**Özellikler:**
- **360° Pusula Halkası** - Gerçek zamanlı heading göstergesi
- **Above Water Zone** - Rüzgar verileri (apparent & true wind)
- **Below Water Zone** - Derinlik, STW, SOG verileri
- **Heading Display** - Magnetic & True heading
- **Wind Indicators** - Görünür ve gerçek rüzgar okları
- **Autopilot Target** - Otopilot hedef göstergesi
- **Quick Data Cards** - Hızlı erişim kartları (Wind, Position, Speed, Depth)

**Kullanım:**
```vue
<PrimaryNavigationDisplay :apiUrl="http://localhost:8000" />
```

### 3. Smart Anchor Watch ⚓

Zora'nın en etkileyici özelliklerinden biri - akıllı demir alarmı.

**Akıllı Özellikler:**
- ✅ **Gelgit Farkındalığı** - Gelgit yükselmesi/alçalması ile yarıçapı otomatik ayarlar
- ✅ **Gerçek Geometri Hesabı** - Zincir uzunluğu, su derinliği ve baş silindiri yüksekliği
- ✅ **Scope Hesaplama** - Otomatik scope ratio (zincir/derinlik oranı)
- ✅ **Sürüklenme Tespiti** - Gerçek zamanlı pozisyon kontrolü
- ✅ **Away Mode Entegrasyonu** - SMS/Email bildirimleri

**Örnek Kullanım:**
```typescript
const anchorWatch = observer.startAnchorWatch({
  chainLength: 30, // 30m zincir
  waterDepth: 5,   // 5m derinlik
  manualAdjustment: 5 // +5m güvenlik marjı
});

// Otomatik hesaplanan değerler:
// scope: 5.1:1 (30m / (5m + 1.5m baş silindiri))
// horizontalChain: ~29.6m (pitagor)
// swingRadius: ~34.6m (29.6 + 5)
```

**Önemli:** Zora'dan farklı olarak, Ada Observer scope hesaplamasında baş silindiri yüksekliğini de dikkate alır!

### 4. Automatic Logbook 📔

Tüm seyir olayları otomatik olarak loglanır.

**Otomatik Log Kayıtları:**
- Durum değişiklikleri (yelken açma, motor çalıştırma, demir atma)
- Pozisyon, hız, rota bilgileri
- Hava durumu koşulları
- Motor saatleri ve yakıt tüketimi

**Manuel Kayıt:**
```typescript
// Sesli not ile log
observer.createAutoLog({
  type: 'voice',
  voiceTranscription: 'Dolphins spotted at starboard side!',
  photos: ['IMG_1234.jpg', 'IMG_1235.jpg']
});

// Manuel not
observer.createAutoLog({
  type: 'manual',
  notes: 'Reef taken at 20kts wind',
  sailConfiguration: {
    main: true,
    genoa: true,
    reefs: 1
  }
});
```

### 5. Voyage Journey Tracking 🗺️

Her seyahat otomatik olarak takip edilir ve kaydedilir.

**Otomatik Başlatma/Bitirme:**
- Demir kaldırılınca journey başlar
- Varış limanında otomatik biter

**Kaydedilen Bilgiler:**
- Rota (tüm waypoint'ler)
- Toplam mesafe (deniz mili)
- Max/ortalama hız
- Gemi durumları
- Tüm log kayıtları
- Hava durumu koşulları

### 6. Away Mode 📱

Tekneden uzaktayken tam kontrol!

**Bildirimler:**
- 🚨 Demir sürüklenmesi
- 💨 Yüksek rüzgar hızı
- 🌊 Derinlik değişimi
- 🔋 Batarya düşük
- ⚠️ Sistem arızaları

**Çoklu Kanal:**
- SMS
- Email
- Push Notifications

**Kullanım:**
```typescript
observer.enableAwayMode({
  userId: 'captain@ship.com',
  notificationPreferences: {
    email: true,
    sms: true,
    push: false
  },
  contacts: [
    { name: 'Captain', phone: '+905551234567', email: 'captain@ship.com' },
    { name: 'First Mate', phone: '+905559876543' }
  ],
  alerts: [
    { type: 'anchor-drag', threshold: 0, enabled: true },
    { type: 'wind-speed', threshold: 25, enabled: true }, // 25+ knots
    { type: 'depth', threshold: 3, enabled: true }        // <3m
  ]
});
```

### 7. Maintenance Management 🔧

**Özellikler:**
- Görev yönetimi (Kanban tarzı: Idea → Todo → In Progress → Completed)
- Maliyet takibi (tahmini vs gerçekleşen)
- Fatura/makbuz yükleme
- Periyodik bakım hatırlatıcıları
- Sistem bazlı logbook entegrasyonu

```typescript
observer.addMaintenanceTask({
  title: 'Oil Change - Port Engine',
  description: 'Change engine oil and filter',
  category: 'engine',
  status: 'todo',
  priority: 'high',
  estimatedCost: 150,
  recurrence: {
    type: 'hours',
    interval: 100, // Her 100 motor saatinde
    nextDue: new Date('2025-12-01')
  }
});
```

## 🏗️ Mimari

### Type Definitions
```typescript
// core/types.ts
export type VesselState = 'pre-departure' | 'at-anchor' | 'underway-sailing' | ...
export interface VesselStateContext { ... }
export interface PrimaryNavigationData { ... }
export interface SmartAnchorWatch { ... }
export interface AutomaticLogEntry { ... }
export interface VoyageJourney { ... }
export interface MaintenanceTask { ... }
export interface AwayMode { ... }
```

### AdaObserver Service
```typescript
// nodes/ada.sea/services/AdaObserver.ts
export class AdaObserver extends EventEmitter {
  // Vessel state detection
  detectVesselState(): VesselStateContext

  // Navigation
  updateNavigationData(data: PrimaryNavigationData): void
  getPrimaryNavigationData(): PrimaryNavigationData | null

  // Anchor watch
  startAnchorWatch(config): SmartAnchorWatch
  stopAnchorWatch(): void

  // Logbook
  createAutoLog(entry): AutomaticLogEntry
  getLogEntries(limit?): AutomaticLogEntry[]

  // Journey
  getCurrentJourney(): VoyageJourney | null

  // Away mode
  enableAwayMode(config: AwayMode): void
  disableAwayMode(): void

  // Maintenance
  addMaintenanceTask(task): MaintenanceTask
  getMaintenanceTasks(status?): MaintenanceTask[]
}
```

### Vue Components
```
observability/dashboard/src/components/
├── PrimaryNavigationDisplay.vue   (✅ Implemented)
├── SmartAnchorWatch.vue          (⏳ Coming Soon)
├── AutomaticLogbook.vue          (⏳ Coming Soon)
└── MaintenanceManager.vue        (⏳ Coming Soon)
```

## 🚀 Kurulum ve Kullanım

### 1. SeaNode Entegrasyonu

Ada Observer, SeaNode'un başlatılması sırasında otomatik olarak initialize edilir:

```typescript
// Ada Observer otomatik başlatılır
const seaNode = new SeaNode({
  id: 'sea-1',
  name: 'My Yacht',
  vessel: {
    name: 'SY Discovery',
    length: 15,
    beam: 4,
    draft: 2
  }
});

// Observer'a erişim
const observer = seaNode.getObserver();
```

### 2. NMEA2000 Veri Akışı

NMEA2000 verileri otomatik olarak Observer'a yönlendirilir:

```typescript
// NMEA verisi geldiğinde
seaNode.processNMEA2000Data(nmeaData);

// Observer otomatik olarak güncellenir:
// - Navigation data
// - Vessel state detection
// - Anchor watch monitoring
```

### 3. Event Handling

```typescript
// State değişikliklerini dinle
observer.on('state:change', (change) => {
  console.log(`Vessel state: ${change.from} → ${change.to}`);
});

// Demir sürüklenme alarmı
observer.on('anchor:drag', (alert) => {
  console.log('⚠️ ANCHOR DRAGGING!', alert);
});

// Yeni log kaydı
observer.on('log:entry', (entry) => {
  console.log('New log entry:', entry);
});
```

### 4. Dashboard Erişimi

Observer dashboard'a web tarayıcıdan erişilebilir:

```bash
cd observability/dashboard
npm install
npm run dev
```

Tarayıcıda: `http://localhost:5173` → **Ada Observer** tab

## 📊 Karşılaştırma: Ada Observer vs Zora 3.0

| Özellik | Zora 3.0 | Ada Observer | Durum |
|---------|----------|--------------|-------|
| Vessel State Intelligence | ✅ | ✅ | Implemented |
| Primary Navigation Display (PND) | ✅ | ✅ | Implemented |
| Smart Anchor Watch | ✅ | ✅ | Implemented |
| Tide Awareness | ✅ | ✅ | Implemented |
| Automatic Logbook | ✅ | ✅ | Backend Ready |
| Voice Transcription | ✅ | 🔄 | Planned |
| Photo Integration | ✅ | ✅ | Implemented |
| Voyage Journey Tracking | ✅ | ✅ | Implemented |
| Away Mode Notifications | ✅ | ✅ | Backend Ready |
| SMS/Email Integration | ✅ | 🔄 | Needs Integration |
| Maintenance Management | ✅ | ✅ | Backend Ready |
| Weather Routing | ✅ | 🔄 | Planned |
| Cloud Chart Updates | ✅ | 🔄 | Planned |
| Multi-Device Sync | ✅ | ✅ | WebSocket Ready |
| NMEA 2000 Integration | ✅ | ✅ | Implemented |
| Modbus Integration | ✅ | 🔄 | Planned |
| SignalK Integration | ✅ | 🔄 | Planned |

**Legend:**
- ✅ Fully Implemented
- 🔄 Planned / In Progress
- ⏳ Coming Soon

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Vessel State Intelligence
- [x] Primary Navigation Display
- [x] Smart Anchor Watch
- [x] Automatic Logbook (Backend)
- [x] Voyage Journey Tracking
- [x] SeaNode Integration

### Phase 2: UI Components 🔄
- [x] PND Vue Component
- [ ] Smart Anchor Watch UI
- [ ] Logbook UI with Voice/Photo
- [ ] Maintenance Manager UI
- [ ] Away Mode Configuration UI

### Phase 3: Advanced Features 🔮
- [ ] Weather Routing Integration
- [ ] Cloud Chart Auto-Updates
- [ ] Voice Transcription (Whisper API)
- [ ] SMS/Email Service Integration
- [ ] Pre-Departure Checklist
- [ ] Engine Room Monitoring Dashboard

### Phase 4: Hardware Integrations 🔮
- [ ] RTL-SDR for AIS/VHF
- [ ] Modbus Sensors
- [ ] SignalK Integration
- [ ] CAN Bus Support
- [ ] Raspberry Pi 5 Deployment

## 🤝 Zora'dan İlham

Ada Observer, **iNav4U** tarafından geliştirilen ve 2025 yılında Metstrade'de tanıtılan **Zora 3.0** platformundan ilham almıştır.

**Zora 3.0'ın Öne Çıkan Özellikleri:**
- Intelligent Operating System for Yachts
- Multi-Protocol Engine (NMEA2000, Modbus, SignalK, CAN)
- Situational Awareness & Emergency Workflow
- Browser-Based Interface (Helm, Tablet, Phone, Laptop)
- Professional Installation Network
- Pre-order: $400 (Server) / $1500 (Server + Display Bundle)

**Kaynak:** https://www.inav4u.com/zora

## 📝 Lisans

Ada Observer, Ada Multi-Agent Ecosystem'un bir parçasıdır.

---

**⚓ "Command with Clarity - The New Standard in Yacht Navigation"**

*Ada Observer - Inspired by Zora, Built for Ada*
