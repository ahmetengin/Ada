# Ada - Agent-as-a-Service Platform

**Ada** is a multi-tenant Agent-as-a-Service (AaaS) platform designed for the maritime fleet management industry, supporting organizations like **Setur Marinas**, **Bali Catamarans**, and **Blue Voyage cabin charter groups**.

## 🚀 Key Features

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

### Running the Example

```bash
uv run python examples/cloning_example.py
```

This demonstrates:
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
│   │   └── user.py              # User model
│   ├── database/                 # Database configuration
│   │   ├── base.py              # SQLAlchemy base
│   │   ├── session.py           # Session management
│   │   └── clients.py           # Redis, Qdrant, Neo4j, FAISS
│   ├── utils/                    # Utilities
│   │   ├── tenant_id_generator.py  # Unique ID generation
│   │   └── cloning.py           # Cloning utilities
│   ├── services/                 # Business logic (TODO)
│   ├── schemas/                  # Pydantic schemas (TODO)
│   └── api/                      # API routes (TODO)
├── examples/                     # Usage examples
│   └── cloning_example.py       # Cloning demonstration
├── tests/                        # Test suite
│   └── test_cloning.py          # Cloning tests
├── .env.example                  # Environment template
├── .gitignore
├── pyproject.toml               # UV/Python configuration
└── README.md                    # This file
```

## 🔑 Key Concepts

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

- [x] **Beyond-MCP Tooling Patterns** - CLI, Scripts, MCP Server, Skills ✅
- [x] **Tenant-Scoped Unique ID System** - Multi-strategy ID generation ✅
- [x] **Entity Cloning System** - Safe cloning with lineage tracking ✅
- [ ] API endpoints for CRUD operations
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

## 📝 License

[Add license information]

## 🤝 Contributing

[Add contribution guidelines]

## 📧 Contact

[Add contact information]

---

**Built with ❤️ for the maritime industry**
