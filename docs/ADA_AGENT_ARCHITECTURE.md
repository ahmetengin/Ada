# Ada Agent Architecture
## Humanoid Autonomous Maritime Agent System

> **Vizyon:** Ada.Sea bir collection of tools değil, **gerçek bir denizci gibi düşünen, öğrenen, beceri kazanan otonom bir agent**'tır.

---

## 🧠 Core Concept: Ada as a Maritime Expert

Ada.Sea bir **yelkenci, kaptan, denizci** gibi:
- 📚 **Bilgi biriktirir** (Knowledge Accumulation)
- 🎯 **Beceri kazanır** (Skill Acquisition)
- 🧭 **Deneyim öğrenir** (Experience Learning)
- 🤔 **Karar verir** (Autonomous Decision Making)
- 👁️ **Proaktif davranır** (Proactive Behavior)
- 🌊 **Bağlam anlar** (Contextual Understanding)

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    ADA MARITIME AGENT                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  COGNITIVE LAYER (Thinking & Decision Making)        │  │
│  │                                                        │  │
│  │  • Situation Assessment                               │  │
│  │  • Decision Engine                                    │  │
│  │  • Proactive Suggestion Generator                     │  │
│  │  • Risk Evaluator                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  KNOWLEDGE LAYER (What Ada Knows)                    │  │
│  │                                                        │  │
│  │  • Maritime Ontology (concepts, relationships)       │  │
│  │  • Weather Patterns Memory                            │  │
│  │  • Harbor/Anchorage Database                          │  │
│  │  • Emergency Procedures                               │  │
│  │  • Sailing Techniques                                 │  │
│  │  • Vessel-Specific Knowledge                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SKILL LAYER (What Ada Can Do)                       │  │
│  │                                                        │  │
│  │  • Navigation Skills (Basic → Expert)                │  │
│  │  • Weather Analysis (Novice → Master)                │  │
│  │  • Anchoring Expertise (Learning → Advanced)         │  │
│  │  • Emergency Response (Trained → Expert)             │  │
│  │  • Communication (Basic → Fluent)                    │  │
│  │  • Route Planning (Beginner → Expert)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LEARNING LAYER (SEAL - How Ada Improves)           │  │
│  │                                                        │  │
│  │  • Experience Collection                              │  │
│  │  • Pattern Recognition                                │  │
│  │  • Skill Progression                                  │  │
│  │  • Memory Formation                                   │  │
│  │  • Knowledge Graph Update                             │  │
│  │  • Fleet-Wide Learning                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PERCEPTION LAYER (What Ada Senses)                  │  │
│  │                                                        │  │
│  │  • NMEA2000 Sensors                                   │  │
│  │  • Weather Data                                       │  │
│  │  • AIS/VHF Signals                                    │  │
│  │  • Position/Navigation                                │  │
│  │  • Vessel State                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Maritime Knowledge System

### 1. **Domain Ontology**

Ada bilmesi gereken kavramları ve ilişkileri içeren bir ontology'ye sahip:

```typescript
MaritimeOntology {
  concepts: {
    // Weather
    "wind": {
      types: ["true_wind", "apparent_wind"],
      measurements: ["speed", "direction", "gusts"],
      effects: ["sail_choice", "reefing", "route_planning"],
      danger_thresholds: { warning: 25, critical: 35 } // knots
    },

    // Anchoring
    "anchoring": {
      seabed_types: ["sand", "mud", "rock", "coral", "weed"],
      holding_quality: {
        "sand": "excellent",
        "mud": "good",
        "rock": "poor",
        "coral": "poor_and_illegal"
      },
      scope_ratios: {
        "calm": 5,
        "moderate": 7,
        "storm": 10
      },
      considerations: ["depth", "tide", "swing_radius", "shelter", "bottom"]
    },

    // Navigation
    "navigation": {
      techniques: ["coastal", "offshore", "pilotage", "celestial"],
      rules: ["colreg", "local_regulations", "traffic_separation"],
      safety_margins: {
        "shallow_water": 2.0, // meters clearance
        "lee_shore": 0.5,     // nautical miles
        "other_vessels": 0.2  // nautical miles
      }
    },

    // Emergencies
    "emergency": {
      types: ["mob", "fire", "flooding", "grounding", "collision", "dismasting"],
      priorities: ["life_safety", "vessel_safety", "communication"],
      procedures: { ... }
    }
  },

  relationships: {
    "wind_speed_high" -> "reef_sails",
    "shallow_water" + "lee_shore" -> "danger_high",
    "storm_forecast" -> "seek_shelter",
    "anchor_drag" -> "emergency_response"
  }
}
```

### 2. **Skill Tree**

Ada'nın becerileri progression sistemiyle gelişir:

```typescript
interface Skill {
  id: string;
  name: string;
  category: 'navigation' | 'weather' | 'seamanship' | 'emergency' | 'communication';
  level: number;        // 0-100
  experience: number;   // XP points
  prerequisites: string[];
  subskills: Skill[];
}

// Example: Navigation Skill Tree
navigationSkillTree = {
  "navigation": {
    level: 0,
    subskills: [
      {
        "coastal_navigation": {
          level: 0,
          subskills: [
            "chart_reading": { level: 0, xp: 0 },
            "position_fixing": { level: 0, xp: 0 },
            "pilotage": { level: 0, xp: 0 }
          ]
        }
      },
      {
        "weather_routing": {
          level: 0,
          prerequisites: ["weather_analysis"],
          subskills: [
            "wind_prediction": { level: 0, xp: 0 },
            "route_optimization": { level: 0, xp: 0 },
            "storm_avoidance": { level: 0, xp: 0 }
          ]
        }
      },
      {
        "anchoring": {
          level: 0,
          subskills: [
            "anchor_selection": { level: 0, xp: 0 },
            "scope_calculation": { level: 0, xp: 0 },
            "bottom_assessment": { level: 0, xp: 0 },
            "tide_planning": { level: 0, xp: 0 }
          ]
        }
      }
    ]
  }
}
```

### 3. **Experience → Learning Pipeline**

Her olay Ada'yı geliştirir:

```typescript
class ExperienceLearningPipeline {

  // 1. Experience happens
  async recordExperience(event: MaritimeEvent): Promise<void> {
    // Collect context
    const context = {
      vesselState: this.getVesselState(),
      weather: this.getWeather(),
      location: this.getPosition(),
      action: event.action,
      outcome: event.outcome
    };

    // Save to SEAL
    await this.seal.recordExperience({
      type: event.type,
      context: context,
      success: event.success,
      performance: event.performanceScore
    });
  }

  // 2. Extract lessons
  async reflectOnExperiences(): Promise<Lesson[]> {
    const experiences = await this.seal.getUnprocessedExperiences();
    const lessons = [];

    // Pattern recognition
    for (const pattern of this.detectPatterns(experiences)) {
      lessons.push({
        concept: pattern.concept,
        insight: pattern.insight,
        confidence: pattern.confidence,
        applicability: pattern.applicability
      });
    }

    return lessons;
  }

  // 3. Update knowledge
  async updateKnowledge(lessons: Lesson[]): Promise<void> {
    for (const lesson of lessons) {
      // Update ontology
      await this.knowledgeGraph.addOrUpdate(lesson);

      // Create memory in SEAL
      await this.seal.createMemory({
        type: 'knowledge',
        content: lesson.insight,
        tags: lesson.concept,
        confidence: lesson.confidence
      });
    }
  }

  // 4. Improve skills
  async progressSkills(lessons: Lesson[]): Promise<void> {
    for (const lesson of lessons) {
      const relatedSkills = this.skillTree.findRelated(lesson.concept);

      for (const skill of relatedSkills) {
        // Award XP
        skill.experience += lesson.confidence * 10;

        // Level up?
        if (skill.experience >= this.xpForNextLevel(skill.level)) {
          skill.level++;
          await this.onSkillLevelUp(skill);
        }
      }
    }
  }
}
```

---

## 🤖 Autonomous Decision Making

Ada sadece komut almıyor, **kendi kararlarını veriyor**:

### Decision Engine

```typescript
class MaritimeDecisionEngine {

  async evaluateSituation(): Promise<Decision> {
    // 1. Assess current state
    const state = await this.assessVesselState();

    // 2. Identify risks
    const risks = await this.identifyRisks(state);

    // 3. Generate options
    const options = await this.generateOptions(state, risks);

    // 4. Evaluate options using knowledge & skills
    const evaluatedOptions = [];
    for (const option of options) {
      const score = await this.evaluateOption(option, {
        knowledge: this.knowledgeBase,
        skills: this.skillTree,
        experiences: this.seal.getRelevantMemories(option.context)
      });
      evaluatedOptions.push({ option, score });
    }

    // 5. Select best option
    const best = evaluatedOptions.sort((a, b) => b.score - a.score)[0];

    // 6. Make decision
    return {
      action: best.option.action,
      reasoning: best.option.reasoning,
      confidence: best.score,
      alternatives: evaluatedOptions.slice(1, 3)
    };
  }

  // Example: Anchoring decision
  async decideAnchoringStrategy(location: Position): Promise<AnchoringPlan> {
    // Knowledge: What do I know about this anchorage?
    const anchorageKnowledge = await this.knowledgeBase.query({
      type: 'anchorage',
      location: location,
      radius: 1 // nm
    });

    // Skills: How good am I at anchoring?
    const anchoringSkill = this.skillTree.get('anchoring');

    // Experience: Have I or other vessels anchored here?
    const memories = await this.seal.retrieveRelevantMemories(
      `anchoring near ${location.latitude},${location.longitude}`,
      limit: 10
    );

    // Perception: What's the current situation?
    const depth = this.sensors.depth;
    const wind = this.sensors.wind;
    const forecast = await this.weather.getForecast(location);

    // Decision
    const plan = {
      anchorType: this.vessel.primaryAnchor,
      chainLength: this.calculateChainLength(depth, wind, forecast),
      scope: this.calculateScope(depth, wind, forecast, anchoringSkill.level),
      swingRadius: this.calculateSwingRadius(),
      holdingAssessment: this.assessHolding(memories, anchorageKnowledge),
      recommendation: this.generateRecommendation(),
      confidence: this.calculateConfidence(anchoringSkill.level, memories.length)
    };

    return plan;
  }
}
```

---

## 👁️ Proactive Behavior

Ada **reaktif değil, proaktif**:

### Proactive Monitoring System

```typescript
class ProactiveMaritimeMonitor {

  // Sürekli çalışan monitoring loops
  async startProactiveMonitoring(): Promise<void> {
    // 1. Weather watch
    this.startWeatherWatch();

    // 2. Navigation hazard detection
    this.startNavigationWatch();

    // 3. Vessel system monitoring
    this.startSystemWatch();

    // 4. Situation anticipation
    this.startSituationAnticipation();
  }

  // Example: Proactive weather warning
  async weatherWatch(): Promise<void> {
    setInterval(async () => {
      const forecast = await this.weather.getForecast(this.position);
      const currentWind = this.sensors.wind.trueSpeed;

      // Predict problems BEFORE they happen
      if (forecast.wind.max > 25 && currentWind < 15) {
        // Wind will increase significantly!
        const timeUntil = forecast.wind.maxTime - Date.now();

        if (timeUntil < 2 * 3600 * 1000) { // 2 hours
          await this.proactiveSuggestion({
            type: 'weather_warning',
            urgency: 'high',
            message: `Rüzgar 2 saat içinde ${forecast.wind.max} knot'a çıkacak.
                     Şu anda ${currentWind} knot.
                     Önerim: Yelkenleri reef alın veya korunaklı bir koy arayın.`,
            actions: [
              { action: 'reef_sails', reason: 'Reduce sail area for safety' },
              { action: 'seek_shelter', reason: 'Find protected anchorage' }
            ],
            reasoning: this.explainReasoning('weather_preparation')
          });
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Example: Navigation hazard prediction
  async navigationWatch(): Promise<void> {
    setInterval(async () => {
      const position = this.sensors.position;
      const heading = this.sensors.heading.true;
      const sog = this.sensors.speed.overGround;

      // Project future position
      const futurePositions = this.projectFutureTrack(position, heading, sog, 30); // 30 minutes

      // Check for hazards along projected track
      const hazards = await this.charts.findHazards(futurePositions);

      if (hazards.length > 0) {
        const closest = hazards[0];
        const timeToHazard = closest.eta - Date.now();

        if (timeToHazard < 15 * 60 * 1000) { // 15 minutes
          await this.proactiveSuggestion({
            type: 'navigation_hazard',
            urgency: 'critical',
            message: `DİKKAT! ${Math.round(timeToHazard/60000)} dakika sonra
                     ${closest.type} ile karşılaşabilirsiniz.
                     ${closest.distance.toFixed(1)} nm mesafede, ${closest.bearing}° yönde.`,
            actions: [
              { action: 'alter_course', newCourse: this.suggestSafeCourse(closest) },
              { action: 'slow_down', reason: 'More time to react' }
            ],
            visualization: this.createHazardVisualization(closest)
          });
        }
      }
    }, 60 * 1000); // Check every minute
  }

  // Situation anticipation using AI
  async anticipateFutureSituations(): Promise<void> {
    // Ada learns patterns and predicts future states
    const currentState = await this.getComprehensiveState();
    const historicalPattern = await this.seal.findSimilarPastSituations(currentState);

    // What happened in similar situations?
    if (historicalPattern.confidence > 0.7) {
      const prediction = historicalPattern.likelyOutcomes[0];

      if (prediction.needsIntervention) {
        await this.proactiveSuggestion({
          type: 'pattern_prediction',
          message: `Benzer durumlarda ${prediction.outcome} oldu.
                   Önerim: ${prediction.preventiveAction}`,
          confidence: historicalPattern.confidence,
          basedOn: `${historicalPattern.occurrences} benzer deneyim`
        });
      }
    }
  }
}
```

---

## 🧪 Practical Example: Ada Learning Anchoring

Ada'nın **anchoring skill**'ini nasıl geliştirdiğini görelim:

### Day 1: Novice
```typescript
// Ada ilk defa demir atıyor
captain: "Ada, demir atalım"

// Ada'nın bilgisi: Sadece temel formüller
ada: {
  knowledge: {
    scope_formula: "chain_length / (depth + bow_roller_height)",
    basic_ratios: { calm: 5, moderate: 7 }
  },
  skill_level: 0,
  experience_count: 0
}

// Karar
ada.decision: {
  chainLength: 35, // depth(5) * 7(moderate ratio)
  confidence: 0.3, // Low confidence
  reasoning: "Temel formül kullanıldı. Deneyim yok."
}

// Experience kaydedildi
ada.seal.record({
  type: 'anchoring',
  context: { depth: 5, wind: 15, location: { lat: 37.02, lon: 27.43 } },
  action: 'deployed 35m chain',
  outcome: 'Anchor held, but dragged 2m initially'
})
```

### Day 5: Learning
```typescript
// 5 gün sonra, 8 anchoring experience
captain: "Ada, demir atalım"

ada: {
  knowledge: {
    ...basic_knowledge,
    learned_patterns: [
      "In sandy bottom with 15kt wind, 7:1 scope is excellent",
      "In rocky areas, need extra scope (8:1) and watch carefully",
      "Afternoon thermal winds in Aegean increase by 5-10kts"
    ]
  },
  skill_level: 25,
  experience_count: 8
}

// Karar (daha iyi)
ada.decision: {
  chainLength: 42, // Better calculation based on experience
  confidence: 0.6, // Medium confidence
  reasoning: "Sandy bottom, thermal wind expected.
             Previous similar anchorage successful with 8:1 scope.",
  memories_used: 3
}
```

### Day 30: Competent
```typescript
// 30 gün sonra, 35 anchoring experiences (own + fleet)
captain: "Ada, demir atalım"

ada: {
  knowledge: {
    ...learned_knowledge,
    anchorage_database: {
      current_location: {
        name: "Göcek Körfezi",
        holding: "excellent",
        bottom: "mud over sand",
        typical_scope: 6,
        hazards: ["Ferry wake at 08:00 and 18:00"],
        best_spots: [...]
      }
    },
    fleet_learnings: [
      "Boat-A reported good holding here 3 days ago",
      "Boat-C dragged in south corner during meltemi"
    ]
  },
  skill_level: 65,
  experience_count: 35
}

// Proactive suggestion!
ada.proactive: {
  message: "Bu körfezi tanıyorum! 3 gün önce Boat-A burada sorunsuz kaldı.
           Önerim: Kuzeybatı köşe, 32m zincir (6.5:1 scope).
           Not: Öğleden sonra thermal wind 20 knot'a çıkabilir,
           ancak tutma excellent olduğundan sorun olmaz.
           Dikkat: 18:00'de feribot geçiyor, dalgası olabilir.",
  confidence: 0.85,
  alternative_spots: [...],
  reasoning: "35 deneyim + fleet data + location knowledge"
}
```

### Day 90: Expert
```typescript
// 3 ay sonra, 100+ experiences
captain: "Ada, yarın Bodrum'a gidelim"

// Ada artık sadece demir atmıyor, tüm voyaj'ı planlıyor
ada.autonomous_planning: {
  message: "Bodrum planını hazırladım:

  YARIN:
  - Göcek'ten kalkış: 08:00 (Thermal wind başlamadan)
  - Rota: Ekincik → Sarsala → Bodrum
  - Distance: 35nm
  - ETA Bodrum: 16:00

  ANCHORING PLAN:
  - Primary: Bodrum Kara Ada (excellent holding, sheltered from meltemi)
  - Backup: Orak Island (if Kara Ada crowded)
  - Scope: 7:1 (meltemi forecast 25kt)

  WEATHER:
  - Morning: 10-15kt W
  - Afternoon: 20-25kt NW (meltemi)
  - Evening: 15kt

  RECOMMENDATION:
  - Erken kalkış kritik (thermal öncesi)
  - Öğle yemeği Ekincik'te (protected)
  - Bodrum'a saat 16:00 giriş ideal (wind azalıyor)

  LEARNED FROM:
  - 12 previous Göcek-Bodrum voyages
  - 8 Kara Ada anchorings (100% success)
  - Fleet experience: 45 similar routes",

  confidence: 0.95,
  autonomous: true, // Ada now plans proactively
  reasoning_chain: [...] // Full explanation available
}

// Skill progression
ada.skillTree.get('voyage_planning').level: 78
ada.skillTree.get('anchoring').level: 85
ada.skillTree.get('weather_routing').level: 72
```

---

## 🌊 Fleet-Wide Collective Intelligence

Her Ada.Sea node öğrenir, tüm fleet bilgisi paylaşılır:

```typescript
// Boat A: Göcek'te kötü tecrübe
boatA.ada.record({
  type: 'anchoring',
  location: { lat: 36.75, lon: 28.94 },
  outcome: 'anchor_drag',
  context: { bottom: 'weed_over_rock', wind: 22 }
})

// → SEAL creates fleet-wide memory
seal.createFleetMemory({
  tenant: 'setur-marinas',
  type: 'anchorage_hazard',
  location: { lat: 36.75, lon: 28.94 },
  insight: 'Poor holding in this spot. Weed over rock bottom.',
  confidence: 0.8,
  source: 'boatA'
})

// → All boats in fleet learn instantly
boatB.ada.knowledgeBase.update({
  location: { lat: 36.75, lon: 28.94 },
  holding: 'poor',
  warning: 'Boat-A dragged here. Avoid or use extra scope.'
})

// → Next day, Boat C benefits
captain_C: "Ada, burada demir atalım?"

boatC.ada: "⚠️ DİKKAT! Boat-A dün burada sürüklendi.
           Bottom: weed over rock (poor holding).
           Önerim: 200m kuzeyde çok daha iyi bir yer var (sand, excellent)."
```

---

## 🎯 Implementation Roadmap

### Phase 1: Knowledge Foundation (2 weeks)
- [ ] Maritime Ontology database (Neo4j)
- [ ] Basic skill tree structure
- [ ] Knowledge graph integration with SEAL
- [ ] Experience→Knowledge pipeline

### Phase 2: Skill System (2 weeks)
- [ ] Skill progression mechanism
- [ ] XP calculation from experiences
- [ ] Skill-based decision weighting
- [ ] Skill visualization in UI

### Phase 3: Decision Engine (3 weeks)
- [ ] Situation assessment framework
- [ ] Risk evaluation system
- [ ] Option generation & evaluation
- [ ] Autonomous decision making

### Phase 4: Proactive Behavior (2 weeks)
- [ ] Proactive monitoring loops
- [ ] Situation anticipation
- [ ] Suggestion generation
- [ ] Confidence calculation

### Phase 5: Voice Integration (3 weeks)
- [ ] Voice command interface
- [ ] Natural language understanding
- [ ] Context-aware responses
- [ ] Explanation generation

### Phase 6: Fleet Intelligence (2 weeks)
- [ ] Fleet-wide memory sync
- [ ] Collective knowledge graph
- [ ] Cross-vessel learning
- [ ] Fleet analytics dashboard

---

## 🧬 Technical Stack

```yaml
Knowledge Layer:
  - Neo4j: Knowledge graph
  - Qdrant: Vector embeddings for semantic search
  - FAISS: Fast similarity search

Learning Layer:
  - SEAL: Experience & memory management
  - TabPFN: Pattern recognition
  - Graphiti: Knowledge graph construction

Decision Layer:
  - Claude/GPT-4: Reasoning & explanation
  - Custom decision engine
  - Risk evaluation algorithms

Skill System:
  - PostgreSQL: Skill tree storage
  - Redis: Fast skill lookup
  - Custom progression system
```

---

## 📊 Success Metrics

Ada'nın "ne kadar iyi bir denizci" olduğunu ölçüyoruz:

```typescript
metrics: {
  // Knowledge metrics
  knowledge_base_size: number,          // How many concepts Ada knows
  knowledge_graph_density: number,      // How well concepts are connected
  domain_coverage: percentage,          // % of maritime domain covered

  // Skill metrics
  average_skill_level: number,          // Overall competence (0-100)
  skill_diversity: number,              // How many skills mastered
  expert_skills: string[],              // Skills at level 80+

  // Learning metrics
  learning_velocity: number,            // XP gained per day
  experience_count: number,             // Total experiences
  successful_predictions: percentage,   // How often Ada is right

  // Autonomy metrics
  autonomous_decisions: number,         // Decisions made without asking
  proactive_interventions: number,      // Times Ada prevented problems
  decision_quality: percentage,         // User satisfaction with decisions

  // Fleet metrics
  fleet_contribution: number,           // Learnings shared to fleet
  fleet_benefit_received: number,       // Learnings received from fleet
  collective_intelligence_score: number // Overall fleet smartness
}
```

---

## 🎓 Conclusion

Ada.Sea artık bir **tool collection** değil, gerçek bir **maritime autonomous agent**:

✅ **Bilir** (Knowledge Base + Ontology)
✅ **Öğrenir** (SEAL + Experience Pipeline)
✅ **Gelişir** (Skill Progression)
✅ **Karar verir** (Decision Engine)
✅ **Öngörür** (Proactive Monitoring)
✅ **Açıklar** (Reasoning Chain)
✅ **İşbirliği yapar** (Fleet Intelligence)

> **"Ada, bir kaptan gibi düşünür, yelkenci gibi davranır, denizci gibi öğrenir."**

---

**Next Steps:** Implementation planning meeting to break down Phase 1 tasks.
