# Ada Chatbot 🤖💬

**Conversational AI Orchestrator for Ada Ecosystem**

Ada Chatbot is the primary conversational interface between customers and the Ada multi-agent system. It handles natural language (voice or text), orchestrates all Ada nodes, and manages complete booking flows.

## 🎯 Core Purpose

```
Customer Input (Voice/Text)
         ↓
   ada.chatbot (NLU + Orchestration)
         ↓
    ┌────┼────┬────┬────┬────┬────┐
    ↓    ↓    ↓    ↓    ↓    ↓    ↓
  travel sea weather marina legal finance customer
    ↓    ↓    ↓    ↓    ↓    ↓    ↓
    └────┴────┴────┴────┴────┴────┘
         ↓
   Comprehensive Response + Booking
```

## 🌟 Key Features

### 1. Natural Language Understanding (NLU)
- **Intent Recognition**: Identifies what the customer wants
  - `book-yacht-tour`, `plan-voyage`, `check-weather`, `reserve-marina`, `check-visa`, etc.
- **Entity Extraction**: Extracts structured data from free-form text
  - Dates, locations, passenger counts, vessel preferences
- **Context Awareness**: Maintains conversation context across multiple turns
- **Confidence Scoring**: Measures certainty of intent recognition

### 2. Voice Interface 🎤
- **Speech-to-Text**: OpenAI Whisper integration
  - Supports Turkish, English, Greek
  - High accuracy for maritime terminology
- **Text-to-Speech**: ElevenLabs/Azure TTS
  - Natural-sounding voice responses
  - Multi-language support
- **Wake Word Detection**: "Hey Ada"

### 3. Multi-Turn Conversations
```
Customer: "Ada, 3 aile tekne turu istiyoruz"
Ada:      "Harika! Nereye gitmek istersiniz?"
Customer: "Bodrum'dan Yunanistan'a"
Ada:      "Kaç gün düşünüyorsunuz?"
Customer: "8 gün"
Ada:      "Mükemmel! İşte planınız: ..."
```

### 4. Node Orchestration
Ada Chatbot calls multiple nodes to fulfill requests:
- **ada.travel**: Package creation, booking management
- **ada.sea**: Route planning, navigation, voyage optimization
- **ada.weather**: Forecast, wind conditions, safety assessment
- **ada.marina**: Berth availability, reservation, pricing
- **ada.legal**: Visa requirements, Transit Log, Deka Tax
- **ada.finance**: Cost estimation, invoice generation
- **ada.customer**: Customer profile, preferences, history

### 5. Multi-Language Support
- 🇹🇷 **Turkish**: Primary language for Turkish market
- 🇬🇧 **English**: International customers
- 🇬🇷 **Greek**: Greek islands, local marinas

## 📋 Example Usage

### Scenario: 3 Families, 8-Day Greek Islands Tour

**Input (Voice)**:
```
"Ada, 3 aile 6 yetişkin bir 13 yaşında 8 gün Bodrumdan Yunanistan adaları turu istiyoruz"
```

**Ada's Processing**:
1. **Intent Recognition**: `book-yacht-tour` (confidence: 0.92)
2. **Entity Extraction**:
   ```json
   {
     "families": 3,
     "adults": 6,
     "children": 1,
     "childAge": 13,
     "duration": 8,
     "origin": "Bodrum",
     "destination": "Greek islands"
   }
   ```

3. **Node Orchestration**:
   ```
   ada.legal     → Visa check (Schengen required for Turkish nationals)
   ada.sea       → Route planning (Bodrum → Kos → Rhodes → Symi → Bodrum)
   ada.weather   → 8-day forecast (Meltem wind 15-20kt)
   ada.marina    → Berth availability at Kos, Rhodes, Symi
   ada.finance   → Cost estimate (€6600 total)
   ```

4. **Response Generation**:
   ```
   Harika! Bodrum - Yunanistan arasında 8 günlük bir tur planladım. İşte detaylar:

   🚢 Tekne & Rota
   • Toplam mesafe: 155 deniz mili
   • Uğranacak limanlar: Bodrum, Kos, Rhodes, Symi, Nisyros, Bodrum
   • Önerilen tekne: 15m katamaran (4 kabin)

   ⚖️ Yasal Gereksinimler
   • ⚠️ Yunanistan için Schengen vizesi gerekli (15 gün, €80/kişi)
   • Transit Log ve Deka Tax (€1500) gerekli

   🌤️ Hava Durumu
   • Hafif Meltem, deniz durumu iyi
   • Meltem rüzgarı: 15-20kt NW (öğleden sonra şiddetli)

   ⚓ Marina Rezervasyonları
   • Kos Marina: €60/gece
   • Rhodes Mandraki: €80/gece
   • Symi Harbor: €45/gece

   💰 Tahmini Maliyet
   • Tekne charter: €4000
   • Marina ücretleri: €370
   • Yakıt: €150
   • Provizyon: €500
   • Yasal işlemler: €1580
   TOPLAM: €6600 (3 aile paylaşır = €2200/aile)

   Bu paketi onaylarsanız rezervasyonunuzu hemen yapabilirim. Devam edelim mi?
   ```

## 🏗️ Architecture

### ChatbotNode Class
```typescript
class ChatbotNode extends BaseNode {
  // Configuration
  llmProvider: 'openai' | 'anthropic' | 'azure'
  voiceEnabled: boolean
  supportedLanguages: string[]

  // Session Management
  sessions: Map<string, ConversationSession>

  // Core Methods
  processMessage(input): Promise<Response>
  recognizeIntent(text): Promise<IntentRecognition>
  extractEntities(text): Record<string, any>
  generateResponse(session, recognition): Promise<Response>

  // Node Orchestration
  callNode(nodeName, task, data): Promise<any>
}
```

### ConversationSession
```typescript
interface ConversationSession {
  id: string
  userId?: string
  startTime: Date
  lastActivity: Date
  language: string
  state: ConversationState

  context: ConversationContext  // Accumulated entities
  messages: Message[]           // Full conversation history
  activeBooking?: any           // Current booking in progress
}
```

### ConversationContext
```typescript
interface ConversationContext {
  travelDetails?: {
    origin?: string
    destination?: string
    departureDate?: Date
    duration?: number
  }

  groupDetails?: {
    families?: number
    adults?: number
    children?: number
    childrenAges?: number[]
  }

  vesselPreferences?: {
    type?: 'sailboat' | 'catamaran' | 'motor-yacht'
    length?: number
    budget?: number
    crewed?: boolean
  }

  preferences?: {
    activities?: string[]
    anchorageType?: 'marina' | 'bay' | 'both'
    pace?: 'relaxed' | 'active' | 'fast'
  }
}
```

## 🚀 Getting Started

### 1. Initialize Chatbot
```typescript
import { ChatbotNode } from './nodes/ada.chatbot/ChatbotNode.js';

const chatbot = new ChatbotNode({
  id: 'chatbot-1',
  name: 'Ada Chatbot',
  llmProvider: 'anthropic',
  modelName: 'claude-3-opus',
  apiKey: process.env.ANTHROPIC_API_KEY,
  voiceEnabled: true,
  voiceProvider: 'whisper',
  ttsEnabled: true,
  supportedLanguages: ['tr', 'en', 'el'],
  defaultLanguage: 'tr',
  availableNodes: [
    'ada.travel',
    'ada.sea',
    'ada.weather',
    'ada.marina',
    'ada.legal',
    'ada.finance',
  ],
});

await chatbot.initialize();
```

### 2. Process Text Message
```typescript
const response = await chatbot.processMessage({
  content: 'Ada, 8 gün Bodrum-Yunanistan turu istiyorum',
  language: 'tr',
  channel: 'web',
});

console.log(response.response);
console.log('Intent:', response.intent);
console.log('Session:', response.sessionId);
```

### 3. Process Voice Message
```typescript
const response = await chatbot.processMessage({
  audioBuffer: voiceRecording,  // Buffer from microphone
  language: 'tr',
  channel: 'voice',
});

// Get voice response
if (response.audioResponse) {
  playAudio(response.audioResponse);
}
```

### 4. Continue Conversation
```typescript
// Second turn (using same sessionId)
const response2 = await chatbot.processMessage({
  content: 'Evet, rezervasyon yap',
  sessionId: response.sessionId,
  language: 'tr',
});
```

## 🎤 Voice Commands

### Turkish
```
"Ada, tekne turu rezerve et"
"Hava durumu nasıl?"
"Bodrum'dan Kos'a kaç saat?"
"Marina fiyatları ne kadar?"
"Vize gerekli mi?"
```

### English
```
"Ada, book a yacht tour"
"What's the weather like?"
"How long from Bodrum to Kos?"
"Show me marina prices"
"Do I need a visa?"
```

### Greek
```
"Άντα, θέλω ένα yacht tour"
"Πώς είναι ο καιρός;"
```

## 📊 Intent Recognition

### Supported Intents
| Intent | Example (TR) | Example (EN) |
|--------|-------------|-------------|
| `book-yacht-tour` | "Tekne turu istiyorum" | "Book a yacht tour" |
| `plan-voyage` | "Rota planla" | "Plan a voyage" |
| `check-weather` | "Hava durumu?" | "Check weather" |
| `reserve-marina` | "Marina rezerve et" | "Reserve marina" |
| `check-visa` | "Vize gerekli mi?" | "Do I need a visa?" |
| `calculate-cost` | "Ne kadar tutar?" | "How much does it cost?" |
| `general-inquiry` | "Nasıl çalışıyor?" | "How does it work?" |

### Entity Types
- **Location**: Bodrum, Kos, Rhodes, Marmaris, etc.
- **Duration**: "8 gün", "2 hafta", "10 days"
- **Passenger Count**: "6 yetişkin", "3 aile", "2 adults"
- **Date**: "15 Temmuz", "next week", "August"
- **Vessel Type**: "yelkenli", "katamaran", "motor yacht"
- **Budget**: "5000 euro", "€10k budget"

## 🔄 Conversation States

```
greeting → gathering-info → confirming → booking → completed
                ↓               ↓           ↓
              error ←────────────┴──────────┘
```

### State Transitions
- **greeting**: Initial contact
- **gathering-info**: Collecting required details
- **confirming**: Showing package, awaiting confirmation
- **booking**: Processing reservation
- **completed**: Booking confirmed
- **error**: Something went wrong, ask for clarification

## 🧩 Integration with Ada Nodes

### Node Call Pattern
```typescript
// Ada Chatbot orchestrates other nodes
const visaInfo = await chatbot.callNode('ada.legal', 'check-visa-requirements', {
  nationality: 'Turkey',
  destination: 'Greece',
});

const route = await chatbot.callNode('ada.sea', 'plan-voyage', {
  origin: 'Bodrum',
  destination: 'Greek islands',
  duration: 8,
});

const weather = await chatbot.callNode('ada.weather', 'get-forecast', {
  route: route.waypoints,
  days: 8,
});
```

## 🎯 Use Cases

### 1. Yacht Charter Booking
Customer requests a multi-day tour → Ada plans route, checks weather, calculates cost, reserves marinas, handles legal requirements → Booking confirmed

### 2. Voyage Planning (Private Vessel)
Vessel owner asks for route suggestions → Ada creates optimized route based on weather, currents, and preferences → Voyage plan delivered

### 3. Weather Check
Quick question about conditions → Ada fetches forecast from ada.weather → Immediate response

### 4. Marina Reservation
Need berth for tonight → Ada checks availability at nearby marinas → Reservation made

### 5. Document Assistance
Questions about visa, Transit Log → Ada consults ada.legal → Legal requirements explained

## 🌐 Deployment

### Web Interface
```typescript
// Express.js endpoint
app.post('/api/chat', async (req, res) => {
  const response = await chatbot.processMessage({
    content: req.body.message,
    sessionId: req.body.sessionId,
    userId: req.user.id,
    language: req.body.language || 'tr',
  });

  res.json(response);
});
```

### Voice Interface (WebRTC)
```typescript
// Stream audio from browser to Whisper
micStream.on('data', async (audioChunk) => {
  const response = await chatbot.processMessage({
    audioBuffer: audioChunk,
    sessionId: currentSession,
  });

  // Play TTS response
  speakerStream.write(response.audioResponse);
});
```

### Mobile App
```typescript
// React Native / Flutter
const sendMessage = async (text: string) => {
  const response = await fetch('https://api.ada.ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: text, sessionId }),
  });

  const data = await response.json();
  displayMessage(data.response);
};
```

## 📈 Performance

- **Intent Recognition**: <100ms (pattern matching)
- **LLM Call**: 1-3s (OpenAI GPT-4 / Anthropic Claude)
- **Voice Transcription**: 500ms-2s (Whisper API)
- **TTS Generation**: 300ms-1s (ElevenLabs)
- **Node Orchestration**: 2-5s (parallel calls)
- **Total Response Time**: 3-8s (end-to-end)

## 🔮 Future Enhancements

### Phase 1 (Current)
- [x] Text-based conversation
- [x] Intent recognition (pattern matching)
- [x] Entity extraction
- [x] Multi-turn context
- [x] Node orchestration

### Phase 2 (Next)
- [ ] OpenAI/Anthropic LLM integration
- [ ] OpenAI Whisper API (voice input)
- [ ] ElevenLabs TTS (voice output)
- [ ] Wake word detection
- [ ] Sentiment analysis

### Phase 3 (Advanced)
- [ ] Proactive suggestions ("Based on weather, I recommend...")
- [ ] Memory across sessions (remember previous trips)
- [ ] Personality customization
- [ ] Multi-modal (images, charts, maps)
- [ ] Real-time translation

### Phase 4 (AI-First)
- [ ] SEAL learning integration (learn from all conversations)
- [ ] Predictive intent (know what customer wants before they ask)
- [ ] Emotion detection (adjust tone based on customer mood)
- [ ] Autonomous booking (book without asking if high confidence)

## 🤝 Ada Ecosystem Integration

```
ada.chatbot ← Primary interface for all customers
    ↓
┌───┴───┬───────┬────────┬────────┬───────┬─────────┐
│       │       │        │        │       │         │
travel  sea  weather  marina  legal  finance  customer
│       │       │        │        │       │         │
└───┬───┴───────┴────────┴────────┴───────┴─────────┘
    ↓
Complete booking fulfilled
```

## 📝 Example Conversations

See `examples/yacht-tour-conversation.ts` for a complete multi-turn booking flow.

---

**⚓ "Ada - Your AI-Powered Maritime Assistant"**

*Conversational intelligence for the Ada ecosystem*
