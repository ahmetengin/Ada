# Ada - Agent-as-a-Service Platform

**Ada** is a multi-tenant Agent-as-a-Service (AaaS) platform designed for the maritime fleet management industry, supporting organizations like **Setur Marinas**, **Bali Catamarans**, and **Blue Voyage cabin charter groups**.

## 🚀 Key Features

### SEAL (Self-Evolving Agent Loop)

Ada implements a comprehensive **SEAL system** for autonomous agent learning and evolution:

- **Experience Tracking** - Automatically records agent actions, decisions, and outcomes
- **Reflection System** - Analyzes experiences to extract insights and patterns
- **Memory Formation** - Creates durable knowledge from learned patterns
- **Self-Evolution** - Continuous improvement through iterative learning cycles
- **Performance Tracking** - Monitors agent effectiveness and success rates
- **Adaptive Learning** - Adjusts behavior based on feedback and outcomes

The SEAL loop enables agents to:
1. **Learn from experience** - Every action is recorded and analyzed
2. **Identify patterns** - Successful strategies and error patterns are detected
3. **Build knowledge** - Insights are stored as reusable memories
4. **Improve over time** - Performance increases with each learning cycle
5. **Adapt to context** - Memories are retrieved based on relevance

### Tenant-Scoped Unique ID System

Ada implements a robust **tenant-scoped unique identifier system** for cloning resources/entities within each tenant:

- **Automatic unique ID generation** for cloned entities
- **Tenant isolation** - each tenant's data is completely isolated
- **Collision-free cloning** - guaranteed unique IDs within tenant scope
- **Traceable lineage** - clone IDs reference their original entities
- **Flexible ID strategies** - timestamp-based, sequential, slug-based, or clone-specific

### Multi-Tenant Architecture

```
Tenant (e.g., Setur Marinas, Bali Catamarans)
  └── Fleet (e.g., Mediterranean Fleet, Aegean Fleet)
       └── User (e.g., Captain, Manager, Guest)
```

Each level has:
- Unique UUID primary key
- Tenant-scoped `tenant_unique_id` for cloning operations
- Automatic timestamp tracking (`created_at`, `updated_at`)
- Proper foreign key relationships with cascading deletes

### Multi-Agent Observability

Ada includes a **comprehensive observability system** for real-time monitoring and visualization of the multi-agent ecosystem:

- **Real-time event streaming** - Live tracking of agent lifecycle, communication, and performance
- **Interactive dashboard** - Vue 3 dashboard with agent status, load monitoring, and event streams
- **Agent genealogy tracking** - Visualize parent-child relationships for cloned agents
- **Performance metrics** - Monitor load, auto-scaling triggers, and system health
- **WebSocket streaming** - Instant updates as events occur
- **SQLite persistence** - Historical event data with efficient querying

See [observability/README.md](observability/README.md) for detailed documentation.

### AI Voice Agent 🎤🤖

**Ada's biggest differentiator** - Unlike competitors (Aquamap, Zora 3.0) that offer basic voice transcription, Ada provides a **full-fledged AI maritime assistant** powered by conversational AI and fleet-wide learning.

**Key Capabilities:**

- 🧠 **Contextual Maritime Intelligence** - Understands vessel state, weather, navigation context
- 🌊 **Fleet-Wide Learning (SEAL)** - Learns from all vessels in the fleet, shares knowledge
- 🗣️ **Multilingual** - Turkish, English, Greek (critical for Mediterranean operations)
- ⚓ **Proactive Suggestions** - Not just answers questions, but provides intelligent recommendations
- 🚨 **Emergency Voice Commands** - Hands-free Mayday, COB marking, emergency protocols

**Example Interactions:**

```typescript
// Contextual understanding
Captain: "Ada, rüzgar çok sert oldu"
Ada: "Evet, 28 knot true wind var. Şu anda 6.2 knot yapıyorsunuz.
     Reef almanızı öneriyorum. Genoa'yı furling'e alabilir misiniz?"

// Fleet learning in action
Captain (Boat A): "Ada, bu körfezde holding çok iyi değil"
[SEAL system learns and creates memory]
Captain (Boat B): "Ada, demir atalım"
Ada: "Dikkat: Bu bölgede sandy bottom, poor holding reported.
     Extra scope öneriyorum (1:7 yerine 1:8)"

// Proactive assistance
Captain: "Ada, yarın Bodrum'a gitmek istiyorum"
Ada: "28 deniz mili. Tahmin edilen 15-20 knot kuzey rüzgarı var.
     Optimum çıkış saati saat 09:00, tahmini varış 13:30."
```

**Tech Stack:**
- OpenAI Whisper (Speech-to-text)
- Claude/GPT-4 (Conversational AI with maritime domain knowledge)
- SEAL System (Learning from fleet experiences)
- RAG + Neo4j (Knowledge retrieval)
- Text-to-Speech (Voice responses)

See [nodes/ada.sea/ADA_OBSERVER_README.md](nodes/ada.sea/ADA_OBSERVER_README.md) for full Ada Observer documentation.

### 🔒 Privacy-First Architecture

**Ada.sea's critical differentiator** - Unlike ALL competitors (Zora, Garmin, Raymarine), Ada implements a **zero-trust, privacy-first architecture** where NO data leaves the vessel without explicit captain authorization.

**Key Privacy Features:**

- 🔐 **Zero Trust by Default** - NO automatic cloud sync, NO third-party sharing
- 🎤 **Voice-Controlled Consent** - Captain approval required for every data transfer
- 📊 **Complete Audit Trail** - Full transparency of all data sharing
- 🏝️ **Edge-First Computing** - All data stays on-board (Mac Mini M4)
- 🔑 **Zero-Knowledge Backup** - Optional cloud backup with client-side encryption
- ⚖️ **KVKK & GDPR Compliant** - Ready for Turkish and EU data protection laws
- 🎯 **Granular Data Classification** - 4-level data privacy (PRIVATE, RESTRICTED, CONDITIONAL, ANONYMOUS)

**Privacy Manifesto:** *"Kaptan ne derse o olur. Nokta."* (What the captain says, goes. Period.)

**Example: Marina Check-in with Privacy**

```typescript
Captain: "Ada, West Istanbul Marina'ya check-in yap"

Ada: "Marina'ya şu bilgileri göndermem gerekiyor:
     - Tekne: Phisedelia
     - Uzunluk: 65 feet
     - Berth: C-42
     Onaylıyor musunuz?"

Captain: "Evet"

Ada: ✓ "Check-in tamamlandı."

[AUDIT LOG]
✓ Sent: vessel_name, berth_number, current_position
✗ NOT sent: GPS history, crew info, financial data, communication logs
✓ Captain: voice_confirmed
```

**What's Different from Competitors:**

| Feature | Zora | Garmin | Raymarine | **Ada.sea** |
|---------|------|--------|-----------|-------------|
| Cloud Default | ✓ Yes | ✓ Yes | ✓ Yes | ✗ **No** |
| Auto Sharing | ✓ Yes | Limited | Limited | ✗ **No** |
| Captain Control | Limited | Limited | Limited | ✓ **Total** |
| Audit Trail | ✗ No | ✗ No | ✗ No | ✓ **Yes** |
| Zero-Knowledge | ✗ No | ✗ No | ✗ No | ✓ **Yes** |

See [PRIVACY.md](PRIVACY.md) for complete privacy architecture documentation.

## 🛠️ Technology Stack

### Core Framework
- **Python 3.11+** with **UV** package manager (Astral)
- **FastAPI** - Modern async web framework
- **Pydantic** - Data validation and settings
- **SQLAlchemy 2.0** - Async ORM with PostgreSQL

### AI & Agent Stack
- **Claude Agent SDK** - Anthropic's agent framework
- **Pydantic AI** - AI-powered data processing
- **FastMCP** - Model Context Protocol implementation
- **SEAL** (Self-learning agent) - Autonomous agent capabilities
- **Tactical Agentic Engineering** - Advanced agent patterns
- **Skills & .claude/skills** - Reusable agent capabilities

### Databases
- **PostgreSQL** - Primary relational database (via asyncpg)
- **Redis** - Caching and message queuing
- **Qdrant** - Vector database for embeddings
- **Neo4j** - Graph database for relationships
- **FAISS** - Fast similarity search and clustering

### AI/ML Components
- **RAG** (Retrieval Augmented Generation) - Context-aware responses
- **Graphiti** - Knowledge graph construction
- **TabPFN** - Tabular predictions with neural networks

## 📦 Installation

### Prerequisites

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

### Creating Tenants and Fleets

```python
from ada.models import Tenant, Fleet
from ada.database import get_db
from ada.utils import TenantUniqueIdGenerator

async with get_db() as session:
    # Create tenant
    tenant = Tenant(
        tenant_unique_id="setur-marinas",
        name="Setur Marinas",
        email="info@seturmarinas.com"
    )
    session.add(tenant)
    await session.flush()

    # Create fleet with tenant-scoped unique ID
    id_gen = TenantUniqueIdGenerator()
    fleet = Fleet(
        tenant_id=tenant.id,
        tenant_unique_id=id_gen.generate_unique_id(
            tenant.id,
            "fleet",
            prefix="mediterranean"
        ),
        name="Mediterranean Fleet",
        fleet_type="catamaran"
    )
    session.add(fleet)
    await session.commit()
```

### Cloning Entities

```python
from ada.utils import EntityCloner

async with get_db() as session:
    cloner = EntityCloner(session)

    # Clone a single fleet
    cloned_fleet = await cloner.clone_entity(
        original_fleet,
        tenant_id,
        clone_number=1,
        overrides={"name": "Mediterranean Fleet - Clone"}
    )

    # Clone fleet with all users
    cloned_with_users = await cloner.clone_fleet_with_users(
        fleet_id=original_fleet.id,
        tenant_id=tenant_id,
        new_fleet_name="Full Clone",
        clone_users=True
    )

    # Bulk clone multiple fleets
    cloned_fleets = await cloner.bulk_clone_entities(
        Fleet,
        [fleet_id1, fleet_id2, fleet_id3],
        tenant_id,
        name_suffix=" - Backup"
    )
```

### Running the Examples

```bash
# Run SEAL example
uv run python examples/seal_example.py

# Run cloning example
uv run python examples/cloning_example.py
```

**SEAL Example demonstrates:**
- Creating SEAL agents with learning capabilities
- Recording experiences (successes and errors)
- Automatic and manual reflection triggering
- Memory creation from experience patterns
- Evolution cycles for continuous improvement
- Performance tracking and insights
- Memory retrieval and feedback

**Cloning Example demonstrates:**
- Creating tenants, fleets, and users
- Cloning individual entities
- Cloning with relationships (fleet → users)
- Bulk cloning operations
- Tenant isolation verification

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=ada --cov-report=html

# Run specific test file
uv run pytest tests/test_cloning.py -v
```

## 🏗️ Project Structure

```
Ada/
├── ada/                          # Main application package
│   ├── __init__.py
│   ├── main.py                   # FastAPI application
│   ├── config.py                 # Configuration management
│   ├── models/                   # Database models
│   │   ├── base.py              # Base model with tenant scope
│   │   ├── tenant.py            # Tenant model
│   │   ├── fleet.py             # Fleet model
│   │   ├── user.py              # User model
│   │   ├── seal_agent.py        # SEAL agent model
│   │   ├── seal_experience.py   # SEAL experience model
│   │   └── seal_memory.py       # SEAL memory model
│   ├── database/                 # Database configuration
│   │   ├── base.py              # SQLAlchemy base
│   │   ├── session.py           # Session management
│   │   └── clients.py           # Redis, Qdrant, Neo4j, FAISS
│   ├── services/                 # Business logic
│   │   └── seal_manager.py      # SEAL orchestration
│   ├── utils/                    # Utilities
│   │   ├── tenant_id_generator.py  # Unique ID generation
│   │   └── cloning.py           # Cloning utilities
│   ├── api/                      # API routes
│   │   └── seal.py              # SEAL API endpoints
│   └── schemas/                  # Pydantic schemas (TODO)
├── examples/                     # Usage examples
│   ├── seal_example.py          # SEAL demonstration
│   └── cloning_example.py       # Cloning demonstration
├── tests/                        # Test suite
│   ├── test_seal.py             # SEAL tests
│   └── test_cloning.py          # Cloning tests
├── .env.example                  # Environment template
├── .gitignore
├── pyproject.toml               # UV/Python configuration
└── README.md                    # This file
```

## 🔑 Key Concepts

### SEAL Loop Architecture

The SEAL (Self-Evolving Agent Loop) follows a continuous learning cycle:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  1. EXPERIENCE COLLECTION                       │
│     └─ Record actions, decisions, outcomes      │
│                                                 │
│  2. REFLECTION                                  │
│     └─ Analyze patterns in experiences          │
│                                                 │
│  3. MEMORY FORMATION                            │
│     └─ Create knowledge from insights           │
│                                                 │
│  4. APPLICATION                                 │
│     └─ Use memories to improve performance      │
│                                                 │
│  5. EVOLUTION                                   │
│     └─ Adapt and optimize continuously          │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 └─► Repeat cycle ◄─
```

**SEAL Components:**

1. **SEALAgent**: The learning agent with SEAL capabilities
   - Tracks performance metrics and learning statistics
   - Configurable learning rate and reflection frequency
   - Supports multiple agent types and specializations

2. **SEALExperience**: Records of agent activities
   - Task executions, decisions, errors, reflections
   - Context, reasoning, outcomes, and feedback
   - Performance scores and importance ratings

3. **SEALMemory**: Distilled knowledge from experiences
   - Skills, patterns, strategies, heuristics
   - Confidence scores and effectiveness tracking
   - Version control and evolution tracking

4. **SEALManager**: Orchestrates the learning loop
   - Triggers reflection based on experience count
   - Analyzes patterns to create memories
   - Manages evolution cycles and feedback

### Tenant-Scoped Unique IDs

Each entity that can be cloned has a `tenant_unique_id` field that:

1. **Uniquely identifies** the entity within its tenant
2. **Includes a tenant hash** for validation and isolation
3. **Supports multiple generation strategies**:
   - Timestamp-based (default for new entities)
   - Clone-based (references original entity)
   - Sequential (ordered entities)
   - Slug-based (human-readable)

### Database Constraints

The system enforces uniqueness through composite indexes:

```python
# Fleet: unique combination of tenant_id + tenant_unique_id
Index("ix_fleets_tenant_unique", "tenant_id", "tenant_unique_id", unique=True)

# User: unique tenant_unique_id AND unique email per tenant
Index("ix_users_tenant_unique", "tenant_id", "tenant_unique_id", unique=True)
Index("ix_users_tenant_email", "tenant_id", "email", unique=True)
```

### Cloning Workflow

1. **Fetch** original entity from database
2. **Generate** new UUID and tenant_unique_id
3. **Copy** all attributes except ID fields and timestamps
4. **Apply** any overrides (e.g., new name)
5. **Create** new entity in database
6. **Handle** relationships (optional)

## 📊 Multi-Agent Observability

The observability system provides comprehensive monitoring of Ada's multi-agent ecosystem:

### Quick Start

1. **Start the observability server:**
   ```bash
   cd observability/server
   bun install && bun run dev
   ```

2. **Start the dashboard:**
   ```bash
   cd observability/dashboard
   npm install && npm run dev
   ```

3. **Access the dashboard:**
   Open http://localhost:5173 in your browser

The dashboard provides:
- **Overview**: System statistics and charts
- **Agents**: All active agents with status and load
- **Events**: Real-time event stream
- **Sessions**: Session tracking and management

See [observability/README.md](observability/README.md) for full documentation.

## 🚧 Roadmap

### Completed ✅
- [x] SEAL (Self-Evolving Agent Loop) implementation
- [x] SEAL API endpoints
- [x] Experience tracking and memory formation
- [x] Reflection and evolution cycles
- [x] Multi-tenant architecture
- [x] Tenant-scoped cloning system

### In Progress 🚧
- [ ] Enhanced SEAL with vector embeddings (Qdrant/FAISS)
- [ ] LLM integration for intelligent reflection
- [ ] API endpoints for tenants, fleets, users
- [ ] Authentication & authorization

### Planned 📋
- [ ] RAG implementation for agent knowledge
- [ ] Graph queries with Neo4j for relationships
- [ ] Real-time agent monitoring with WebSockets
- [ ] Advanced skill learning and transfer
- [ ] Multi-agent collaboration
- [ ] Docker Compose setup
- [ ] Alembic migrations
- [ ] Comprehensive API documentation
- [ ] Production deployment guide

## 📝 License

[Add license information]

## 🤝 Contributing

[Add contribution guidelines]

## 📧 Contact

[Add contact information]

---

**Built with ❤️ for the maritime industry**
