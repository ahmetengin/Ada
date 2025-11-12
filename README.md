# Ada - Agent-as-a-Service Platform

**Ada** is a multi-tenant Agent-as-a-Service (AaaS) platform designed for the maritime fleet management industry, supporting organizations like **Setur Marinas**, **Bali Catamarans**, and **Blue Voyage cabin charter groups**.

## 🚀 Key Features

### SEAL (Self-Evolving Agent Loop)

Ada implements a comprehensive **SEAL system** for autonomous agent learning and evolution with advanced AI capabilities:

#### Core Features
- **Experience Tracking** - Automatically records agent actions, decisions, and outcomes
- **LLM-Powered Reflection** - Uses Claude AI to analyze experiences and extract deep insights
- **Vector Embeddings** - Semantic understanding through sentence transformers
- **Memory Formation** - Creates durable knowledge from learned patterns
- **Semantic Search** - Qdrant-powered similarity search for context-aware memory retrieval
- **Self-Evolution** - Continuous improvement through iterative learning cycles
- **Performance Tracking** - Monitors agent effectiveness and success rates
- **Skill Learning** - Automatically identifies and tracks acquired skills

#### Advanced Capabilities
1. **Intelligent Analysis** - Claude AI analyzes patterns, identifies insights, and suggests improvements
2. **Semantic Memory** - Vector embeddings enable context-aware memory retrieval
3. **Pattern Recognition** - Detects success patterns, error patterns, and behavioral patterns
4. **Skill Extraction** - Automatically identifies skills learned from experiences
5. **Adaptive Learning** - Adjusts behavior based on feedback and outcomes
6. **Fallback Mechanism** - Graceful degradation when LLM/embeddings are unavailable

The SEAL loop enables agents to:
1. **Learn from experience** - Every action is recorded with rich context and reasoning
2. **Understand semantically** - Vector embeddings capture meaning beyond keywords
3. **Identify patterns** - LLM analyzes experiences to find deep patterns
4. **Build knowledge** - Insights are stored as searchable memories
5. **Improve intelligently** - Performance increases through AI-guided evolution
6. **Retrieve contextually** - Semantic search finds relevant knowledge for any situation

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
    # Initialize with all advanced features
    manager = SEALManager(
        session,
        use_embeddings=True,  # Enable semantic search
        use_llm_reflection=True  # Enable Claude AI analysis
    )

    # Create an intelligent SEAL agent
    agent = await manager.create_agent(
        tenant_id=tenant_id,
        name="Maritime Assistant",
        agent_type="specialist",
        capabilities=["route_planning", "weather_analysis"],
        specializations=["navigation", "optimization"],
        seal_enabled=True,
        reflection_frequency=5
    )

    # Record rich experiences with context and reasoning
    experience = await manager.record_experience(
        agent_id=agent.id,
        tenant_id=tenant_id,
        experience_type="task_execution",
        task_name="route_optimization",
        action_taken="Optimized route from Athens to Mykonos",
        reasoning=(
            "Analyzed weather patterns and sea conditions. "
            "Calculated fuel-efficient speed profile."
        ),
        outcome="Route completed 25% faster with 15% less fuel",
        success=True,
        performance_score=0.95
    )

    # LLM-powered reflection analyzes patterns and extracts insights
    memories = await manager.trigger_reflection(agent.id)
    # Memories include: patterns, insights, skills, improvements

    # Run evolution cycle
    results = await manager.evolve_agent(agent.id)
    print(f"Success rate: {results['success_rate']:.2%}")
    print(f"Skills learned: {results['agent']['skills_learned']}")

    # Semantic search retrieves contextually relevant memories
    relevant_memories = await manager.retrieve_relevant_memories(
        agent_id=agent.id,
        context="How to handle route planning in stormy weather?",
        limit=5,
        score_threshold=0.7  # Minimum semantic similarity
    )
    # Returns memories ranked by semantic relevance

    # Get comprehensive learning insights
    insights = await manager.get_agent_insights(agent.id)
    print(f"Total experiences: {insights['statistics']['total_tasks']}")
    print(f"Memories created: {insights['statistics']['memory_count']}")
    print(f"Skills acquired: {insights['agent']['skills_learned']}")
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
# Basic SEAL example
uv run python examples/seal_example.py

# Advanced SEAL with embeddings and LLM
uv run python examples/seal_advanced_example.py

# Cloning example
uv run python examples/cloning_example.py
```

**Basic SEAL Example demonstrates:**
- Creating SEAL agents with learning capabilities
- Recording experiences (successes and errors)
- Automatic and manual reflection triggering
- Memory creation from experience patterns
- Evolution cycles for continuous improvement
- Performance tracking and insights
- Memory retrieval and feedback

**Advanced SEAL Example demonstrates:**
- LLM-powered intelligent reflection with Claude AI
- Vector embeddings for semantic understanding
- Context-aware semantic memory retrieval
- Rich experience tracking with reasoning
- Automatic skill identification and tracking
- Pattern recognition and insight extraction
- Graceful fallback mechanisms

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
│   │   ├── seal_manager.py      # SEAL orchestration
│   │   ├── embeddings.py        # Vector embeddings service
│   │   └── llm_reflection.py    # LLM-powered reflection
│   ├── utils/                    # Utilities
│   │   ├── tenant_id_generator.py  # Unique ID generation
│   │   └── cloning.py           # Cloning utilities
│   ├── api/                      # API routes
│   │   └── seal.py              # SEAL API endpoints
│   └── schemas/                  # Pydantic schemas (TODO)
├── examples/                     # Usage examples
│   ├── seal_example.py          # Basic SEAL demonstration
│   ├── seal_advanced_example.py # Advanced SEAL with AI
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
- [x] SEAL (Self-Evolving Agent Loop) core implementation
- [x] **Vector embeddings with Qdrant** - Semantic memory search
- [x] **LLM-powered reflection with Claude AI** - Intelligent pattern analysis
- [x] **Semantic memory retrieval** - Context-aware knowledge access
- [x] Experience tracking with rich context
- [x] Memory formation and skill learning
- [x] Reflection and evolution cycles
- [x] SEAL API endpoints
- [x] Multi-tenant architecture
- [x] Tenant-scoped cloning system
- [x] Advanced examples and documentation

### In Progress 🚧
- [ ] Sentence transformers integration optimization
- [ ] API endpoints for tenants, fleets, users
- [ ] Authentication & authorization
- [ ] Alembic database migrations

### Planned 📋
- [ ] RAG implementation for enhanced agent knowledge
- [ ] Graph queries with Neo4j for relationship mapping
- [ ] Real-time agent monitoring with WebSockets
- [ ] Advanced skill transfer between agents
- [ ] Multi-agent collaboration and coordination
- [ ] FAISS integration for fast local search
- [ ] Batch embedding generation for performance
- [ ] Memory consolidation and pruning strategies
- [ ] Docker Compose for local development
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
