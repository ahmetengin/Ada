# Ada - Maritime & Hospitality Intelligence Ecosystem

**Ada** is an AI-powered multi-agent ecosystem for the maritime and hospitality industry, built on **15+ years of real-world experience** in travel agencies and event management companies.

> *"Sen yoktun o zaman. Ama şimdi varsın, ve Ada o deneyimi ölçeklendiriyor."*

## 🚀 **NEW: Distributed Node Communication**

Ada node'ları artık **dağıtık ortamda** (farklı process'ler, farklı makineler) birbiriyle iletişim kurabilir!

### ✨ Yeni Özellikler

- ✅ **WebSocket Transport** - Real-time bidirectional communication
- ✅ **Redis Pub/Sub Transport** - Scalable message broker
- ✅ **Service Discovery** - Automatic node discovery via NodeRegistry
- ✅ **Hybrid Mode** - Local (in-process) + Distributed (network) communication
- ✅ **Backward Compatible** - Mevcut kod değişiklik gerektirmiyor

### 📖 Dokümantasyon

👉 **[Distributed Communication Guide](./docs/DISTRIBUTED-COMMUNICATION.md)** - Detaylı kullanım ve örnekler

### 🎯 Hızlı Kullanım

```bash
# Registry başlat
npm run registry

# Distributed demo çalıştır
npm run demo:distributed
```

```typescript
import { DistributedNodeCommunication } from './core/DistributedNodeCommunication.js';
import { WebSocketTransport } from './core/transport/WebSocketTransport.js';

const transport = new WebSocketTransport({
  nodeId: 'node-1',
  nodeName: 'Node 1',
  host: 'localhost',
  port: 8080
});

const node = new DistributedNodeCommunication({
  nodeId: 'node-1',
  nodeName: 'Node 1',
  nodeType: 'ada.sea',
  mode: 'hybrid',
  transport
});

await node.start();

// Remote node'a mesaj gönder
await node.request('node-2', 'task', { data: 'process this' });
```

---

### VHF Marine Radio Monitoring (Ada.Sea)

Ada.Sea includes **comprehensive VHF marine radio monitoring** with Software-Defined Radio (SDR), Voice Activity Detection (VAD), and Speech-to-Text (STT) transcription:

- **Real-time VHF Scanning** - Monitor marine VHF channels (156-162 MHz) using RTL-SDR
- **Emergency Detection** - Automatic detection of Ch 16 distress calls (MAYDAY, PAN PAN, SECURITE)
- **Voice Transcription** - Speech-to-text for radio communications (English/Turkish)
- **Geographic Auto-Tuning** - Location-based channel prioritization (Istanbul, Aegean, Mediterranean)
- **Race Mode** - Specialized monitoring for sailing regattas with start sequence detection
- **Message Classification** - Intelligent categorization (emergency, marina, intership, safety)
- **Ada Observer Dashboard** - Real-time VHF monitoring interface

**Key Channels (Turkey)**:
- **Ch 16** (156.800 MHz): Emergency - mandatory monitoring
- **Ch 73** (156.675 MHz): Marina standard (~90% of Turkish marinas)
- **Ch 72** (156.625 MHz): Istanbul marinas, intership
- **Ch 6** (156.300 MHz): Primary ship-to-ship

See [docs/VHF_IMPLEMENTATION.md](docs/VHF_IMPLEMENTATION.md) for detailed documentation.

### SEAL (Self-Evolving Agent Loop)

Ada was created by **industry veterans** who:
- Ran **travel agencies** - Flight booking, hotels, tours, visa processing
- Operated **event companies** - Conferences, exhibitions, corporate events, concerts
- Managed **maritime operations** - Yacht charters, marina services, blue voyages

Now, that **15+ years of domain expertise** is coded into AI agents that work 24/7, learn continuously, and never forget.

## 🌊 The Ada Node Ecosystem

Ada consists of **10 specialized AI nodes** that collaborate like a real organization:

| Node | Domain | Born From Real Experience | Key Features |
|------|--------|---------------------------|--------------|
| **ada.sea** | Yacht Management | Maritime operations expertise | NMEA2000, VHF Ch 16/9/69, AI voice assistant |
| **ada.marina** | Marina Operations | Premium Turkish marinas (WIM, Setur, D-Marin) | 32 facilities, events, package deals |
| **ada.customer** | Customer Intelligence | Travel agency CRM operations | Churn prediction, LTV, sentiment analysis |
| **ada.travel** | Travel Services | Real travel agency workflows | Flights, hotels, tours, visa assistance |
| **ada.congress** | Event Management | Event company expertise | Conferences, concerts, exhibitions |
| **ada.restaurant** | F&B Operations | Marina restaurant management | Menus, catering, reservations |
| **ada.finance** | Financial Hub | Turkish accounting practices | Receivables/Payables, Usage Quotas, Payment Batching, Bank Loans |
| **ada.maintenance** | Technical Services | Shipyard operations | Haul-out, repairs, parts |
| **ada.weather** | Weather Intelligence | Marine meteorology | Forecasts, route safety |
| **ada.legal** | Legal & Compliance | Maritime law, contracts | KVKK/GDPR, insurance |

### Real Cross-Node Collaboration

Nodes don't just exist - they **actively help each other**, just like departments in a real company:

```typescript
// Example: Customer books a yacht charter → Full workflow automation
Customer → Travel: "Book charter: Istanbul → Bodrum, 7 days"

Travel → Customer: "Analyzing customer history..."
Customer → Travel: "VIP customer, prefers catamarans, high LTV"

Travel → Marina: "Reserve berth in Bodrum D-Marin"
Marina → Travel: "Berth B-15 reserved, 65ft catamaran"

Travel → Restaurant: "Prepare welcome dinner for 6 guests"
Restaurant → Travel: "Menu prepared, seafood preferred"

Travel → Finance: "Generate invoice package"
Finance → Travel: "Invoice created: 45,000 TRY (inc. KDV)"

Travel → Customer: "Log booking, track satisfaction"
Customer → All: "Update customer profile: +2000 LTV"
```

## 🏖️ Ada.Marina - Complete Marina Lifestyle

Inspired by Turkey's premium marinas: **West Istanbul Marina (WIM)**, **Setur Kalamış**, **Setur Midilli**, **D-Marin Göcek**, **Kıyı Istanbul**, **Ataköy Marina**.

### 32 Premium Facilities Across 7 Categories

#### 🍽️ Shore Facilities (ada.restaurant managed)
- **Marina Restaurant & Bar** (4.7★, 342 reviews) - Mediterranean cuisine, 150 seats, sunset terrace
- **Marina Cafe & Lounge** (4.5★, 189 reviews) - Craft coffee, breakfast, afternoon tea
- **Marina Market & Chandlery** (4.3★, 156 reviews) - Groceries, marine supplies, 24/7

#### 🧘 Wellness & Leisure
- **Olympic Swimming Pool** (4.8★, 267 reviews) - 50m heated, lanes + recreational area
- **Spa & Wellness Center** (4.9★, 198 reviews) - Massage, sauna, Turkish hammam
- **Fitness Center** (4.6★, 145 reviews) - Technogym equipment, personal trainers
- **Beach Club** (5.0★, 412 reviews) - **Private beach, cabanas, water sports** (D-Marin inspired)
- **Kids Club** (4.7★, 89 reviews) - Supervised activities, playground

#### 🎤 Business & Events (ada.congress managed)
- **Conference Hall** (4.8★, 67 reviews) - 200 capacity, full A/V equipment
- **Meeting Rooms** (4.5★, 45 reviews) - 4 rooms, 10-30 people
- **Co-working Space** (4.6★, 78 reviews) - High-speed WiFi, private desks
- **Outdoor Event Space** (4.9★, 287 reviews) - **2,000 capacity for concerts** 🎸
- **Live Music & Bar** (4.8★, 456 reviews) - **Jazz nights, DJ sessions, sunset performances** 🎵

#### 🔧 Technical Services (ada.maintenance managed)
- **Haul-Out & Shipyard** (4.7★, 134 reviews) - 100-ton travel lift
- **Technical Workshop** (4.8★, 201 reviews) - Electronics, rigging, engine repair

#### 🚿 Guest Services
- **Laundry Service** (4.4★, 112 reviews)
- **Shower & WC** (4.5★, 234 reviews) - 24/7, heated
- **Car Parking** (4.3★, 98 reviews) - 300 spaces
- **Dry Stack Storage** (4.7★, 89 reviews) - 150 boats up to 35ft
- **Winter Storage** (4.8★, 167 reviews) - 80 yachts, indoor/outdoor
- **Tender Storage** (4.5★, 54 reviews) - 50 dinghies

#### ⚓ Marine Services
- **Fuel Station** (4.6★, 187 reviews)
- **Palamar Servisi** (4.8★, 423 reviews) - **24/7 mooring assistance, VHF Ch 9, 69**
- **Palamar Botu (Line Boat)** (4.9★, 512 reviews) - Professional crew
- **Water & Electricity** (4.7★, 312 reviews) - Metered, 16A-63A
- **Pump-Out** (4.5★, 76 reviews)

#### 🎩 Concierge (ada.customer managed)
- **VIP Concierge** (4.9★, 156 reviews) - 24/7, multilingual
- **Car Rental** (4.4★, 89 reviews)
- **Shuttle Service** (4.7★, 145 reviews)
- **Yacht Brokerage** (4.8★, 67 reviews)

### Smart Package Deals

From real travel agency experience - **bundle and save**:

```typescript
🎁 Wellness Package (7 days)
   Berth + Spa + Fitness + Pool
   Regular: 8,500 TRY → 6,500 TRY (save 2,000 TRY / 23.5%)

🎁 VIP Berth Package (30 days)
   Berth + Beach Club + Concierge
   Regular: 28,000 TRY → 22,000 TRY (save 6,000 TRY / 21.4%)

🎁 Family Package (7 days)
   Berth + Kids Club + Beach + Activities
   Regular: 9,500 TRY → 7,500 TRY (save 2,000 TRY / 21.1%)
```

### Real Concert Examples (from WIM, Kıyı Istanbul, Ataköy Marina)

**Summer Concert Series:**
```
🎤 TARKAN KONSERT
📍 West Istanbul Marina - Outdoor Event Space
📅 15 Temmuz 2025, Cumartesi
⏰ 20:00 - 23:00
👥 Kapasite: 2,000 kişi
🎟️ Bilet: 750 TRY (VIP: 1,500 TRY + backstage access)
🎪 Professional stage, sound system, lighting
💰 Revenue potential: 1,500,000 TRY
```

**Weekly Live Music Program:**
```
Monday:    Jazz Night (20:00-23:00) - Neşet Ruacan Trio
Wednesday: DJ Night - House & Deep Lounge
Friday:    Sunset Sessions - Acoustic & Chill
Sunday:    Brunch & Live Music (11:00-15:00)
```

## 🤖 Ada Observer - AI Voice Assistant

**The industry's most advanced maritime AI** - Not just voice commands, but true intelligence.

### What Makes Ada Unique

**Ada Observer** delivers comprehensive maritime intelligence:

- ✓ **Full Conversational AI** - Natural dialogue, understands context and intent
- ✓ **Complete Context Awareness** - Integrates vessel, weather, and navigation data
- ✓ **Fleet-Wide Learning** - SEAL system enables shared knowledge across vessels
- ✓ **Proactive Intelligence** - Offers intelligent recommendations before you ask
- ✓ **Multilingual Support** - Turkish, English, and Greek
- ✓ **Full Maritime Emergency Protocol** - Complete MAYDAY and distress procedures
- ✓ **Captain-Controlled Privacy** - You decide what gets shared, always

### Ada.Sea VHF Radio Stack
- **RTL-SDR** - Software-Defined Radio for VHF reception
- **WebRTC VAD** - Voice Activity Detection
- **OpenAI Whisper** - Speech-to-Text transcription
- **FFmpeg / SoX** - Audio processing and enhancement
- **Vue 3** - Ada Observer VHF monitoring dashboard

## 📦 Installation

```typescript
// Context-aware with NMEA2000 integration
Captain: "Ada, rüzgar çok sert oldu"
Ada: "Evet kaptan, şu anda 28 knot true wind var.
     Boat speed 6.2 knot. Reef almanızı öneriyorum.
     Genoa'yı furling'e alabilir misiniz?"

- Python 3.11 or higher
- UV package manager
- PostgreSQL, Redis, Qdrant, and Neo4j (Docker recommended)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Ada
   ```

2. **Install dependencies with UV:**
   ```bash
   uv sync
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Start databases (Docker Compose recommended):**
   ```bash
   # Coming soon: docker-compose.yml
   ```

5. **Initialize database:**
   ```bash
   uv run alembic upgrade head
   ```

6. **Run the application:**
   ```bash
   uv run uvicorn ada.main:app --reload
   ```

## 💡 Usage Examples

### Using VHF Radio Monitoring

```typescript
import { SeaNode } from './nodes/ada.sea/SeaNode';

// Initialize Ada.Sea node
const ada = new SeaNode({
  name: 'Phisedelia',
  vessel: {
    name: 'S/Y Phisedelia',
    length: 15.5,
    beam: 4.2,
    draft: 2.1,
    type: 'sailing-yacht',
  },
});

await ada.initialize();

// Start VHF scanner
await ada.processTask({
  type: 'vhf-radio',
  data: { action: 'start-scanner' }
});

// Listen for emergency alerts
ada.on('alert', (alert) => {
  if (alert.source === 'vhf-radio' && alert.severity === 'critical') {
    console.log('🚨 EMERGENCY:', alert.message);
    // Take action: notify crew, display alert
  }
});

// Activate race mode for regatta
await ada.processTask({
  type: 'vhf-radio',
  data: {
    action: 'activate-race-mode',
    raceName: 'Phisedelia Cup 2025',
    committeeChannel: 73,
    fleetChannel: 6,
    startTime: '2025-06-15T11:00:00Z',
  }
});

// Listen for race start
ada.on('race:start', (data) => {
  console.log('🏁 GO! GO! GO!');
  // Start race timer, notify crew
});

// Get VHF statistics
const stats = await ada.processTask({
  type: 'vhf-radio',
  data: { action: 'get-statistics' }
});

console.log(`Transmissions: ${stats.transmissionsDetected}`);
console.log(`Emergency calls: ${stats.emergencyCallsDetected}`);
```

### Using SEAL (Self-Evolving Agent Loop)

```python
from ada.services import SEALManager
from ada.database import get_db

async with get_db() as session:
    manager = SEALManager(session)

    # Create a SEAL agent
    agent = await manager.create_agent(
        tenant_id=tenant_id,
        name="Maritime Assistant",
        agent_type="specialist",
        capabilities=["route_planning", "weather_analysis"],
        seal_enabled=True,
        reflection_frequency=5  # Reflect every 5 experiences
    )

    # Record an experience
    experience = await manager.record_experience(
        agent_id=agent.id,
        tenant_id=tenant_id,
        experience_type="task_execution",
        task_name="route_planning",
        action_taken="Calculated optimal route considering weather",
        success=True,
        performance_score=0.9,
        reasoning="Analyzed wind patterns to minimize travel time"
    )

    # Trigger reflection to create memories
    memories = await manager.trigger_reflection(agent.id)

    # Run evolution cycle
    results = await manager.evolve_agent(agent.id)
    print(f"Success rate: {results['success_rate']:.2%}")

    # Retrieve relevant memories for context
    relevant_memories = await manager.retrieve_relevant_memories(
        agent_id=agent.id,
        context="route planning in bad weather",
        limit=5
    )

    # Get comprehensive insights
    insights = await manager.get_agent_insights(agent.id)
```

     ÖNERİM:
     - Çıkış: 09:00 (조류 favorable)
     - İlk 2 saat motor
     - Sonra yelken açabilirsiniz
     - Tahmini varış: 13:30

     BERTH:
     Palmarina'da C-15 berth uygun.
     Rezervasyon yapayım mı?"

// Emergency - Hands-free
Captain: "ADA! MAYDAY MAYDAY MAYDAY!"
Ada: "🚨 MAYDAY ACTIVATED

     ✓ Position logged: 40.9234°N, 29.1245°E
     ✓ VHF Channel 16: Monitoring
     ✓ Coastguard: Notification SENT
     ✓ Nearby vessels: 3 boats alerted (within 5nm)
     ✓ Emergency beacon: ACTIVATED

     Kaptan, ne tür acil durum?"
```

**Tech Stack:**
- OpenAI Whisper (Speech-to-text)
- Claude Sonnet 4.5 (Maritime-trained conversational AI)
- SEAL System (Fleet-wide learning)
- NMEA2000 (Real-time vessel data)
- VHF Radio Protocol (Ch 16, 9, 69)

## 🔒 Privacy-First Architecture

**Ada's most critical differentiator** - Unlike ALL competitors.

### Core Privacy Principle

**"Kaptan ne derse o olur. Nokta."**
*(What the captain says, goes. Period.)*

- 🔐 **Zero Trust by Default** - NO automatic cloud sync
- 🎤 **Voice-Controlled Consent** - Captain approval required for EVERY data transfer
- 📊 **Complete Audit Trail** - Full transparency on what was shared
- 🏝️ **Edge-First Computing** - All data stays on-board (Mac Mini M4)
- 🔑 **Zero-Knowledge Backup** - Optional encrypted cloud backup
- ⚖️ **KVKK & GDPR Compliant** - Turkish and EU data protection laws

### 4-Level Data Classification

```typescript
🔴 PRIVATE:     GPS history, crew info, communications
                → NEVER shared without explicit consent

🟠 RESTRICTED:  Financial data, maintenance records
                → Shared only with authorized nodes

🟡 CONDITIONAL: Vessel position, berth number
                → Shared only when captain approves

🟢 ANONYMOUS:   Weather observations, anonymous route data
                → Can be shared for fleet intelligence
```

### Privacy in Action

```typescript
Captain: "Ada, West Istanbul Marina'ya check-in yap"

Ada: "Marina'ya şu bilgileri göndermem gerekiyor:

     GÖNDERİLECEKLER:
     ✓ Tekne adı: Phisedelia
     ✓ Uzunluk: 65 feet
     ✓ Berth numarası: C-42
     ✓ Anlık pozisyon (check-in için)

     GÖNDERİLMEYECEKLER:
     ✗ GPS geçmişi (son 30 günlük rota)
     ✗ Mürettebat bilgileri
     ✗ Finansal veriler
     ✗ İletişim kayıtları
     ✗ Müşteri bilgileri

     Onaylıyor musunuz?"

Captain: "Evet"

Ada: ✓ "Check-in tamamlandı. Audit log kaydedildi."

[AUDIT LOG - Forever stored on vessel]
2025-01-15 14:23:45 UTC
Action: marina_checkin
Recipient: West Istanbul Marina (marina-id: wim-001)
Data sent: vessel_name, loa, berth, current_position_only
Captain: VOICE_CONFIRMED (audio fingerprint saved)
```

### Ada's Privacy Guarantees

**Ada** is built on absolute privacy principles:

- ✗ **No Cloud by Default** - All data stays on-vessel unless you explicitly allow
- ✗ **No Auto-Sharing** - Never shares anything automatically
- ✓ **Total Captain Control** - Every data transfer requires your approval
- ✓ **Complete Audit Trail** - Full transparency on all data operations
- ✓ **Zero-Knowledge Backup** - Optional encrypted cloud backup
- ✓ **KVKK & GDPR Compliant** - Turkish and EU data protection laws
- ✓ **Voice Consent** - Approve or deny requests by speaking

See [PRIVACY.md](PRIVACY.md) for complete architecture.

## 🧠 Ada.Customer - AI-Powered CRM

**Born from travel agency CRM experience** - Real customer intelligence.

### AI-Powered Insights

```typescript
// Real customer profile example
Customer: Ahmet Yılmaz
Segment: MYBA Charter (Superyacht)

AI INSIGHTS:
├─ Churn Risk: HIGH (65% probability)
├─ Predicted LTV: $125,000 (over 5 years)
├─ Sentiment: Declining (last 3 interactions negative)
├─ Days Since Last Interaction: 210 days
└─ Next Best Action: "Send personalized summer offer"

RECOMMENDATION:
"Contact customer with VIP Bodrum week offer.
 Customer prefers: June, catamarans, privacy, seafood.

 Suggested package:
 - D-Marin Göcek berth (1 week)
 - Beach Club VIP access
 - Private chef (seafood menu)
 - Water sports equipment

 Conversion probability: 73%
 Expected revenue: 15,000 EUR"

CROSS-NODE DATA:
├─ Marina (ada.marina):
│  └─ 12 visits, avg 7 days, prefers quiet berths
├─ Restaurant (ada.restaurant):
│  └─ Mediterranean, seafood, wine (prefers Cabernet)
├─ Travel (ada.travel):
│  └─ Family of 4, prefers direct flights, IST airport
└─ Finance (ada.finance):
   └─ Payment: Always early, high credit score, no issues
```

### Churn Prediction Algorithm

```typescript
Risk Score Calculation:
+ 40 points: No interaction > 180 days
+ 30 points: Sentiment < -0.5 (negative)
+ 20 points: Late payments > 0%
+ 10 points: Declining spend trend

Result:
0-29:   LOW risk
30-49:  MEDIUM risk
50-69:  HIGH risk (action required)
70+:    CRITICAL risk (urgent intervention)
```

### Support Ticket SLA

```typescript
Priority    Response Time    Resolution Time
─────────────────────────────────────────────
Critical    15 minutes       2 hours
High        1 hour           8 hours
Medium      4 hours          24 hours
Low         8 hours          48 hours
```

## 💰 Ada.Finance - Intelligent Financial Management

**Born from Turkish accounting practices** - Complete financial control for maritime businesses.

### Bidirectional Financial Tracking

Ada tracks **both sides** of every transaction:

```typescript
// RECEIVABLES (Money coming IN)
ada.legal: "Restaurant partnership contract signed"
ada.finance: {
  direction: 'receivable',
  from: 'Sunset Restaurant',
  amount: 12000,  // 12 monthly payments of 1,000 TRY commission
  schedule: 'monthly',
  nextPayment: '2025-02-01'
}

// PAYABLES (Money going OUT)
ada.legal: "Hotel agreement for guest rooms"
ada.finance: {
  direction: 'payable',
  to: 'Grand Hotel',
  amount: 50000,  // We owe them
  schedule: [
    { date: '2025-01-10', amount: 10000, type: 'advance' },
    { date: '2025-02-07', amount: 8000, type: 'installment' },
    { date: '2025-03-07', amount: 8000, type: 'installment' }
  ]
}

// NET CASH FLOW
ada.finance.getCashFlowForecast(30):
{
  expectedIncome: 12000,   // From receivables
  expectedExpense: 26000,  // To payables
  netCashFlow: -14000,     // ⚠️ Need financing!
  alert: 'Negative cash flow - consider bank loan'
}
```

### Usage Tracking & Quota Management

Track service quotas for supplier contracts:

```typescript
// Ada.marina → Ada.travel contract
// "50 transfers/month for VIP customers"

ada.finance.initializeUsageTracking('travel-contract', {
  quotas: [
    {
      serviceType: 'transfers',
      total: 50,           // 50 transfers per month
      unitPrice: 200,      // 200 TRY per transfer
      resetPeriod: 'monthly'
    }
  ]
});

// VIP customer uses transfer
ada.customer: "Transfer needed: Airport → Marina"
ada.finance.recordUsage({
  serviceType: 'transfers',
  quantity: 1,
  billedTo: 'VIP Customer - John Doe'
});

// Month-end summary
ada.finance.getUsageSummary('travel-contract'):
{
  quotas: {
    transfers: {
      total: 50,
      used: 12,            // Only 12 used
      remaining: 38,
      utilizationRate: 24, // 24% utilization
      valueUsed: 2400      // 12 × 200 TRY
    }
  },
  totalBilled: 2400,       // Only pay for what's used
  totalQuotaValue: 10000   // Would have paid if fully used
}
```

### Strategic Payment Batching

**3 payment dates per month** to optimize cash flow:

```typescript
// Payment strategy: 7th, 17th, 27th of each month
ada.finance.scheduleMonthlyPaymentBatches():
{
  batches: [
    {
      date: '2025-01-07',
      suppliers: ['Ada Travel', 'Grand Hotel', 'Sunset Restaurant'],
      totalAmount: 25000,
      payments: 5
    },
    {
      date: '2025-01-17',
      suppliers: ['Venue Provider', 'Catering'],
      totalAmount: 15000,
      payments: 3
    },
    {
      date: '2025-01-27',
      suppliers: ['Ada Travel'],  // Monthly usage payment
      totalAmount: 2400,
      payments: 1
    }
  ],
  benefits: [
    'Predictable payment dates',
    'Reduced transaction costs',
    'Better cash flow planning',
    'Easier supplier relationship management'
  ]
}
```

### Bank Loan Management

Automatic financing when cash flow is negative:

```typescript
// Cash flow gap detected
ada.finance.analyzeCashFlowGap(30):
{
  gap: 20000,                  // 20,000 TRY shortfall
  recommendedLoanAmount: 24000, // +20% buffer
  severity: 'medium'
}

// Request bank loan
ada.finance.requestBankLoan({
  amount: 24000,
  loanType: 'working-capital',
  termMonths: 3,
  purpose: 'Short-term cash flow gap',
  bankName: 'Garanti BBVA',
  interestRate: 3.0  // Bank provides rate (monthly)
});

// Loan structure
{
  principalAmount: 24000,
  interestRate: 3.0,  // %3 monthly
  termMonths: 3,
  repaymentSchedule: [
    { month: 1, interest: 720, principal: 0, total: 720 },
    { month: 2, interest: 720, principal: 0, total: 720 },
    { month: 3, interest: 720, principal: 24000, total: 24720 }  // Balloon
  ],
  totalInterestCost: 2160,
  totalRepayment: 26160
}

// Active loans summary
ada.finance.getActiveLoans():
{
  totalDebt: {
    principal: 24000,
    interest: 2160,
    total: 26160
  },
  upcomingPayments: [
    { bank: 'Garanti BBVA', date: '2025-02-13', amount: 720 },
    { bank: 'Garanti BBVA', date: '2025-03-13', amount: 720 },
    { bank: 'Garanti BBVA', date: '2025-04-13', amount: 24720 }  // Final
  ]
}
```

### Turkish Accounting Integration

**Paraşüt Integration** for full tax compliance:
- ✅ **KDV (VAT)**: 4 rates (0%, 1%, 8%, 10%, 18%, 20%)
- ✅ **Stopaj (Withholding)**: Service (20%), Transport (10%), Rent (20%)
- ✅ **e-Fatura**: Electronic invoicing (GİB compliance)
- ✅ **e-Defter**: Electronic accounting books
- ✅ **e-Arşiv**: Invoice archiving

```typescript
// Automatic invoice with Turkish tax compliance
ada.finance.createInvoice({
  customerName: 'Tekne Sahibi A.Ş.',
  items: [{
    description: 'Berth Rental - January 2025',
    quantity: 1,
    unitPrice: 10000,
    vatRate: 20  // %20 KDV
  }]
});

// Generated invoice
{
  invoiceNumber: 'ADA2025000123',
  subtotal: 10000,       // KDV hariç
  vatAmount: 2000,       // %20 KDV
  withholdingAmount: 0,  // Stopaj yok (berth rental)
  amount: 12000,         // KDV dahil
  netAmount: 12000,      // Ödenecek tutar
  eInvoiceUuid: 'abc123', // GİB UUID
  parasutInvoiceId: '456' // Paraşüt ID
}
```

### Complete Financial Picture

```typescript
// Real-time financial dashboard
ada.finance.getStatus():
{
  receivables: {
    total: 150000,
    overdue: 5000,
    upcoming30Days: 25000
  },
  payables: {
    total: 80000,
    overdue: 0,
    upcoming30Days: 26000
  },
  loans: {
    totalDebt: 26160,
    upcomingPayments: 720
  },
  netPosition: +44000,  // Positive after all obligations
  cashFlowAlert: 'Negative in next 7 days - payment batch pending'
}
```

### Why Ada.Finance is Different

**Traditional accounting software:**
- ❌ Only tracks what happened (reactive)
- ❌ Manual quota tracking
- ❌ No usage-based billing
- ❌ No cash flow forecasting
- ❌ Manual loan management

**Ada.Finance:**
- ✅ Predicts cash flow gaps (proactive)
- ✅ Automatic usage tracking
- ✅ Usage-based billing with quotas
- ✅ 30-day cash flow forecast
- ✅ Automatic loan recommendation
- ✅ Strategic payment batching (3x/month)
- ✅ Full Turkish tax compliance (Paraşüt)

## 💼 Built by Industry Veterans

Ada is **not a generic SaaS** - it's domain expertise crystallized into code.

### Real-World Experience Built-In

**Travel Agency Operations (15+ years):**
- Flight booking workflows (GDS systems, PNR management)
- Hotel reservations (channel managers, allotment)
- Tour packages (bundling, pricing, margins)
- Visa processing (document workflows, embassy coordination)
- Customer loyalty programs (points, tiers, benefits)

**Event Company Operations:**
- Conference planning (venues, catering, A/V)
- Attendee management (registration, badges, check-in)
- Corporate events (budgeting, logistics, vendor coordination)
- Concert organization (stage, sound, lighting, permits)
- Post-event analytics (satisfaction, ROI, learnings)

**Maritime Operations:**
- Yacht charter operations (fleet management, handover protocols)
- Marina services (berth allocation, facility management)
- Blue voyage coordination (route planning, provisioning)
- VHF radio protocols (emergency, communication, weather)

### The Difference This Makes

```typescript
// Example: Ada "knows" how to plan a corporate event
// Because the founder ran an event company for years

ada.congress.planConference({
  name: "Maritime Tech Summit 2025",
  attendees: 200,
  duration: 3,
  budget: 150000
})

// Ada automatically:
→ Books conference hall (200 capacity with A/V)
→ Arranges catering (breakfast, lunch, coffee breaks)
→ Coordinates travel (flight + hotel packages for speakers)
→ Manages registration (QR codes, badges, check-in desk)
→ Handles invoicing (Paraşüt integration, KDV compliance)
→ Tracks satisfaction (real-time surveys, post-event analysis)
→ Calculates ROI (revenue vs cost, per-attendee metrics)

// This isn't programmed from scratch
// This is 15 years of experience, codified
```

## 🛠️ Technology Stack

### Core Platform
- **TypeScript 5+** - Type-safe multi-agent system
- **Node.js 18+** - High-performance async runtime
- **PostgreSQL 14+** - Primary relational database
- **Redis 6+** - Caching, pub/sub, sessions

### AI & Machine Learning
- **Claude Sonnet 4.5** - Conversational AI, reasoning
- **OpenAI Whisper** - Speech recognition
- **SEAL (Self-Evolving Agent Loop)** - Autonomous learning
- **RAG** - Retrieval Augmented Generation
- **Qdrant** - Vector database for embeddings
- **Neo4j** - Knowledge graph, relationships

### Maritime Integration
- **NMEA2000** - Marine electronics protocol
- **SignalK** - Modern marine data platform
- **VHF Radio Protocol** - Marine communication (Ch 16, 9, 69)

### Business Integration
- **Paraşüt API** - Turkish accounting & invoicing
- **GDS Systems** - Flight booking (future)
- **Channel Managers** - Hotel booking (future)

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+
Redis 6+
TypeScript 5+
```

### Installation

```bash
# Clone repository
git clone https://github.com/ahmetengin/Ada.git
cd Ada

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build TypeScript
npm run build

# Run ecosystem demo
npm run dev
```

### Running Specific Nodes

```bash
# Start individual nodes
npm run node:sea        # Yacht management
npm run node:marina     # Marina operations
npm run node:customer   # CRM & customer intelligence

## 🤖 Agent Tooling Patterns: Beyond MCP

Ada implements **4 different approaches** for building reusable AI agent toolsets, inspired by [beyond-mcp](https://github.com/disler/beyond-mcp) and industry best practices from leading AI engineers.

### Why Multiple Patterns?

> **"My MCP server just ate 10,000 tokens before my agent even started working."** - Indie Dev Dan

Traditional MCP servers come with massive costs:
- **Instant context loss** - Every tool call starts fresh
- **Token consumption** - 5-10% of context window gone before work begins

Our solution: **4 patterns with different trade-offs**:

| Pattern | Context Efficiency | Best For |
|---------|-------------------|----------|
| **MCP Server** | ❌ 8,000-10,000 tokens | Multi-client access, standardization |
| **CLI** | ⚠️ 4,000-5,000 tokens | New tools, direct control, team automation |
| **Scripts** | ✅ 1,500-2,000 tokens | Context preservation, portability |
| **Skills** | ✅ 1,500-2,000 tokens | Claude Code, auto-activation |

### Token Savings: Real Benchmarks

For 5 Ada operations (list tenants, get details, create fleet, clone fleet, create user):

- **MCP Server**: 40,000 tokens → 160,000 remaining (80%)
- **CLI**: 20,000 tokens → 180,000 remaining (90%)
- **Scripts/Skills**: 7,500 tokens → **192,500 remaining (96%)**

**Result:** Scripts/Skills preserve **32,500 more tokens** than MCP - enough for 200+ additional operations!

### The Four Patterns

1. **MCP Server** (`tooling/mcp_server/`) - FastMCP server with 19 tools
   - Standardized protocol for multi-client access
   - Wraps CLI via subprocess for single source of truth

2. **CLI** (`tooling/cli/`) - Direct database access with dual output modes
   - Foundation pattern (build this first!)
   - Works for you (terminal), team (scripts), agents (subprocess)
   - 50% token savings vs MCP

3. **Scripts** (`tooling/scripts/`) - Self-contained Python files
   - Progressive disclosure: load only what you need
   - 80% token savings through incremental loading
   - Maximum portability (just Python files)

4. **Skills** (`.claude/skills/`) - Claude Code integration
   - Same efficiency as Scripts + autonomous activation
   - Auto-triggers based on conversation context
   - Git-shareable for team collaboration

### Quick Start

```bash
# CLI (recommended starting point)
cd tooling/cli
uv run ada_cli.py tenant list

# Scripts (context-efficient)
cd tooling/scripts
python tenants/list_tenants.py

# MCP Server (multi-client)
cd tooling/mcp_server
uv run server.py

# Skills (Claude Code - just talk naturally!)
"List all Ada tenants"  # Auto-activates!
```

### Industry Best Practices

Following recommendations from **Indie Dev Dan**, **Anthropic**, and **Mario** (top AI engineers):

**For New Tools (like Ada):**
- 80% → Build CLI first (foundation for everything)
- 10% → Wrap in MCP when needed (at scale)
- 10% → Add Scripts/Skills (context-critical operations)

**For Existing Tools:**
- 80% → Use existing MCP servers (don't reinvent)
- 15% → Build CLI wrapper (when modification needed)
- 5% → Use Scripts/Skills (context preservation critical)

### Complete Documentation

📖 [**Tooling Patterns Overview**](./tooling/README.md) - Complete comparison with benchmarks
🚀 [**Quick Start Guide**](./tooling/QUICKSTART.md) - Get started in 5 minutes
💻 [**CLI Documentation**](./tooling/cli/README.md) - Direct database access
📜 [**Scripts Documentation**](./tooling/scripts/README.md) - Progressive disclosure
🌐 [**MCP Server**](./tooling/mcp_server/README.md) - Standardized protocol
🎓 [**Skills (Claude Code)**](./.claude/skills/ada-management/README.md) - Auto-activation

### Philosophy

Ada's tooling embodies three core principles:

1. **Progressive Disclosure Over Eager Loading** - Load only what you need, when you need it
2. **Control Over Convenience** - More setup for 80% token savings is worth it
3. **Context Preservation Over Protocol Standardization** - Agent efficiency matters most

---

## 🚧 Roadmap

### Completed ✅
- [x] SEAL (Self-Evolving Agent Loop) implementation
- [x] SEAL API endpoints
- [x] Experience tracking and memory formation
- [x] Reflection and evolution cycles
- [x] Multi-tenant architecture
- [x] Tenant-scoped cloning system
- [x] Multi-agent observability dashboard
- [x] **VHF Marine Radio Monitoring (Ada.Sea)**
  - [x] Real-time VHF scanner with RTL-SDR
  - [x] Voice Activity Detection (VAD)
  - [x] Speech-to-Text transcription (Whisper)
  - [x] Emergency detection (Ch 16, MAYDAY keywords)
  - [x] Geographic channel auto-tuning (Turkey regions)
  - [x] Race mode for sailing regattas
  - [x] Message classification and entity extraction
  - [x] Ada Observer VHF monitoring dashboard
  - [x] Comprehensive test suite (120+ test cases)

### In Progress 🚧
- [ ] Enhanced SEAL with vector embeddings (Qdrant/FAISS)
- [ ] LLM integration for intelligent reflection
- [ ] API endpoints for tenants, fleets, users
- [ ] Authentication & authorization
- [ ] Agent integration (SEAL, advanced skills)
- [ ] RAG implementation
- [ ] Vector search with Qdrant/FAISS
- [ ] Graph queries with Neo4j
- [ ] Real-time updates with WebSockets
- [ ] Docker Compose setup
- [ ] Alembic migrations
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Production deployment guide

```
Ada/
├── nodes/                          # AI Node Ecosystem (TypeScript)
│   ├── ada.sea/                   # Yacht management
│   │   ├── SeaNode.ts
│   │   ├── services/
│   │   │   ├── NMEA2000Integration.ts
│   │   │   ├── VHFRadio.ts
│   │   │   └── VoiceAssistant.ts
│   │   └── ADA_OBSERVER_README.md
│   ├── ada.marina/                # Marina operations
│   │   ├── MarinaNode.ts
│   │   └── services/
│   │       └── FacilityManagement.ts  # 1,200+ lines, 32 facilities
│   ├── ada.customer/              # CRM & customer intelligence
│   │   ├── CustomerNode.ts        # 1,135 lines, churn prediction
│   │   └── services/
│   │       ├── ChurnPrediction.ts
│   │       ├── LTVCalculation.ts
│   │       └── SentimentAnalysis.ts
│   ├── ada.travel/                # Travel services
│   ├── ada.congress/              # Event management
│   ├── ada.restaurant/            # F&B operations
│   ├── ada.finance/               # Financial hub
│   ├── ada.maintenance/           # Maintenance & repair
│   ├── ada.weather/               # Weather intelligence
│   └── ada.legal/                 # Legal & compliance
├── core/                           # Shared infrastructure
│   ├── BaseNode.ts                # Base class for all nodes
│   ├── Communication.ts           # Inter-node messaging
│   ├── types.ts                   # TypeScript definitions
│   └── SEAL.ts                    # Self-learning system
├── docs/                           # Documentation
│   ├── marina-facilities.md       # Complete facility guide
│   ├── marina-examples.md         # Booking scenarios
│   ├── marina-events.md           # Concert & event planning
│   ├── cross-node-collaboration.md # Integration examples
│   └── privacy-architecture.md    # Privacy deep-dive
├── examples/
│   └── ecosystem-demo.ts          # Full demo
├── PRIVACY.md                      # Privacy architecture
├── package.json
├── tsconfig.json
└── README.md                       # This file
```

## 📊 Real Marina Inspiration

Ada's facilities are based on **real Turkish/Mediterranean marinas**:

| Marina | What We Learned | Applied To |
|--------|-----------------|------------|
| **West Istanbul Marina (WIM)** | Summer concert series, outdoor events | Outdoor Event Space (2,000 capacity) |
| **Setur Kalamış Fenerbahçe** | Urban marina lifestyle, proximity services | Shore facilities, concierge |
| **Setur Midilli (Lesvos)** | Greek island operations, multilingual | International operations |
| **D-Marin Göcek** | World-class beach club, premium facilities | Beach Club (5★ rating) |
| **Kıyı Istanbul Marina** | Live music program, entertainment | Live Music & Bar, weekly programs |
| **Ataköy Marina** | Corporate events, large-scale concerts | Conference hall, event space |

## 🎯 Why Ada is Different

### ❌ Traditional Marina Software
```
✗ Just berth management
✗ No customer intelligence
✗ No cross-domain integration
✗ No AI learning
✗ No privacy controls
✗ Generic, one-size-fits-all
✗ No domain expertise
```

### ✅ Ada Ecosystem
```
✓ Complete lifecycle management (first inquiry → loyal customer)
✓ AI-powered intelligence (learns from every interaction)
✓ 10 specialized nodes (working together like a real org)
✓ Privacy-first (captain has total control)
✓ Real-world expertise (15+ years travel/events/maritime)
✓ Turkish market focus (KVKK, Paraşüt, TR/EN/GR)
✓ Built by people who ran these businesses
```

## 🗺️ Roadmap

### ✅ Completed (Current State)
- [x] 10 AI nodes with real cross-collaboration
- [x] 32 marina facilities across 7 categories
- [x] Smart package deals & pricing
- [x] AI voice assistant (Ada Observer)
- [x] Privacy-first architecture with audit trail
- [x] Customer intelligence (churn, LTV, sentiment)
- [x] Event management (concerts, conferences)
- [x] NMEA2000 & VHF radio integration
- [x] SEAL (Self-Evolving Agent Loop)

### 🚧 In Progress
- [ ] Complete documentation (.md files in docs/)
- [ ] Paraşüt API integration (Turkish accounting)
- [ ] Mobile app (captain interface)
- [ ] Real marina pilot (WIM or Setur)

### 📋 Planned Q1 2025
- [ ] WhatsApp Business integration (customer communication)
- [ ] Email marketing automation
- [ ] Advanced analytics dashboard
- [ ] Multi-language UI (Greek, German, Russian)

### 🚀 Future Vision
- [ ] Integration with booking platforms (Booking.com, Airbnb)
- [ ] Blockchain-based loyalty program
- [ ] AR/VR marina tours
- [ ] Predictive maintenance AI
- [ ] Fleet-wide route optimization
- [ ] Carbon footprint tracking

## 📚 Documentation

Comprehensive guides in `/docs`:

- **[Marina Facilities Guide](docs/marina-facilities.md)** - Complete 32-facility catalog
- **[Marina Examples](docs/marina-examples.md)** - Booking scenarios, VHF protocol
- **[Marina Events](docs/marina-events.md)** - Concert planning, weekly programs
- **[Cross-Node Collaboration](docs/cross-node-collaboration.md)** - Integration examples
- **[Privacy Architecture](PRIVACY.md)** - Zero-trust, captain-controlled privacy

## 📞 Contact & Community

**Built with ❤️ for the maritime industry**
**By people who understand it**

From travel agencies and event companies to AI-powered maritime intelligence.

---

*"Sen yoktun o zaman. Ama şimdi varsın, ve Ada o deneyimi ölçeklendiriyor."*
*(You weren't there back then. But now you are, and Ada scales that experience.)*
