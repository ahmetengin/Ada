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

## 🚧 Roadmap

- [ ] API endpoints for CRUD operations
- [ ] Authentication & authorization
- [ ] Agent integration (SEAL, skills)
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
