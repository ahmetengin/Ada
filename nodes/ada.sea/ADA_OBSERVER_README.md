# Ada Observer 🧭

**Intelligent Yacht Monitoring System by Ada.Sea**

Ada Observer is a next-generation intelligent monitoring and management platform for the Ada.Sea node, designed specifically for modern sailing vessels.

## 🌟 Features

### 1. Vessel State Intelligence
Ada Observer automatically detects the vessel's current state and dynamically adjusts the dashboard accordingly.

**Supported States:**
- `pre-departure` - Pre-departure checks
- `at-anchor` / `anchored` - At anchor / anchored
- `underway-sailing` - Under sail
- `underway-motoring` - Under power
- `underway-motorsailing` - Motor + sail
- `drifting` - Drifting
- `docking` / `docked` - Docking / docked
- `moored` - Moored
- `engine-room-check` - Engine check
- `maintenance` / `off-season` - Maintenance / off-season

**Smart Detection:**
```typescript
// Automatic state detection from NMEA2000 data
const state = observer.detectVesselState();
// confidence: 0-100 (confidence score)
```

### 2. Primary Navigation Display (PND) 🧭

The iconic "futuristic compass" display, fully implemented in Ada Observer.

**Features:**
- **360° Compass Ring** - Real-time heading indicator
- **Above Water Zone** - Wind data (apparent & true wind)
- **Below Water Zone** - Depth, STW, SOG data
- **Heading Display** - Magnetic & True heading
- **Wind Indicators** - Apparent and true wind arrows
- **Autopilot Target** - Autopilot target indicator
- **Quick Data Cards** - Quick access cards (Wind, Position, Speed, Depth)

**Usage:**
```vue
<PrimaryNavigationDisplay :apiUrl="http://localhost:8000" />
```

### 3. Smart Anchor Watch ⚓

Intelligent anchor alarm with advanced drag detection.

**Smart Features:**
- ✅ **Tide Awareness** - Automatically adjusts radius for tidal rise/fall
- ✅ **Real Geometry Calculation** - Chain length, water depth, and bow roller height
- ✅ **Scope Calculation** - Automatic scope ratio (chain/depth ratio)
- ✅ **Drag Detection** - Real-time position monitoring
- ✅ **Away Mode Integration** - SMS/Email notifications

**Example Usage:**
```typescript
const anchorWatch = observer.startAnchorWatch({
  chainLength: 30, // 30m chain
  waterDepth: 5,   // 5m depth
  manualAdjustment: 5 // +5m safety margin
});

// Automatically calculated values:
// scope: 5.1:1 (30m / (5m + 1.5m bow roller))
// horizontalChain: ~29.6m (Pythagorean)
// swingRadius: ~34.6m (29.6 + 5)
```

**Important:** Ada Observer includes bow roller height in scope calculations for maximum accuracy!

### 4. Automatic Logbook 📔

All voyage events are automatically logged.

**Automatic Log Entries:**
- State changes (setting sails, starting engine, anchoring)
- Position, speed, course information
- Weather conditions
- Engine hours and fuel consumption

**Manual Entry:**
```typescript
// Voice note log
observer.createAutoLog({
  type: 'voice',
  voiceTranscription: 'Dolphins spotted at starboard side!',
  photos: ['IMG_1234.jpg', 'IMG_1235.jpg']
});

// Manual note
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

Every voyage is automatically tracked and recorded.

**Automatic Start/End:**
- Journey starts when anchor is raised
- Automatically ends at destination

**Recorded Information:**
- Route (all waypoints)
- Total distance (nautical miles)
- Max/average speed
- Vessel states
- All log entries
- Weather conditions

### 6. Away Mode 📱

Full control when you're away from the boat!

**Notifications:**
- 🚨 Anchor dragging
- 💨 High wind speed
- 🌊 Depth changes
- 🔋 Low battery
- ⚠️ System failures

**Multi-Channel:**
- SMS
- Email
- Push Notifications

**Usage:**
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

**Features:**
- Task management (Kanban style: Idea → Todo → In Progress → Completed)
- Cost tracking (estimated vs actual)
- Invoice/receipt upload
- Periodic maintenance reminders
- System-based logbook integration

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
    interval: 100, // Every 100 engine hours
    nextDue: new Date('2025-12-01')
  }
});
```

## 🏗️ Architecture

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

## 🚀 Installation & Usage

### 1. SeaNode Integration

Ada Observer is automatically initialized when SeaNode starts:

```typescript
// Ada Observer starts automatically
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

// Access the observer
const observer = seaNode.getObserver();
```

### 2. NMEA2000 Data Flow

NMEA2000 data is automatically routed to the Observer:

```typescript
// When NMEA data arrives
seaNode.processNMEA2000Data(nmeaData);

// Observer automatically updates:
// - Navigation data
// - Vessel state detection
// - Anchor watch monitoring
```

### 3. Event Handling

```typescript
// Listen to state changes
observer.on('state:change', (change) => {
  console.log(`Vessel state: ${change.from} → ${change.to}`);
});

// Anchor drag alarm
observer.on('anchor:drag', (alert) => {
  console.log('⚠️ ANCHOR DRAGGING!', alert);
});

// New log entry
observer.on('log:entry', (entry) => {
  console.log('New log entry:', entry);
});
```

### 4. Dashboard Access

The Observer dashboard is accessible via web browser:

```bash
cd observability/dashboard
npm install
npm run dev
```

Browser: `http://localhost:5173` → **Ada Observer** tab

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

## 📝 License

Ada Observer is part of the Ada Multi-Agent Ecosystem.

---

**⚓ "Command with Clarity - Professional Yacht Monitoring by Ada.Sea"**

*Ada Observer - Intelligent Maritime Intelligence*
