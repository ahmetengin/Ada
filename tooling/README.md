# Ada Tooling Patterns: Beyond MCP Exploration

This directory implements 4 different approaches for building reusable AI agent toolsets for the Ada multi-tenant agent platform. Inspired by [beyond-mcp](https://github.com/disler/beyond-mcp), these patterns explore the trade-offs between standardization and context preservation.

## 🎯 Core Trade-off

**MCP Servers come with a massive cost: instant context loss.**

Every tool call through MCP Protocol starts fresh—no memory of previous operations, responses, or contextual decisions. For Ada's complex multi-tenant operations involving tenant isolation, fleet cloning, and node replication, this context loss can be particularly problematic.

## 📊 The Four Patterns

### 1. MCP Server (`mcp_server/`)
**Architecture:** `Claude → MCP Protocol → FastMCP Server → subprocess → CLI → Database`

**Features:**
- 15+ tools for Ada operations (tenants, fleets, users, nodes, cloning)
- Standardized MCP protocol interface
- Automatic tool discovery
- Multi-client compatibility

**Pros:**
✅ Standard integration across MCP-compatible clients
✅ Automatic tool exposure
✅ Clean protocol abstractions

**Cons:**
❌ Context lost on every tool call
❌ Higher overhead from wrapper layers
❌ Locked unless you control the server

**Best for:** Multiple LLM clients needing standardized access to Ada operations

---

### 2. CLI (`cli/`)
**Architecture:** `Claude → subprocess → CLI → Direct Database Access`

**Features:**
- 20+ commands for full Ada management
- Direct SQLAlchemy database operations
- Dual output modes (human-readable/JSON)
- Tenant-scoped caching for performance

**Commands:**
```bash
# Tenants
ada-cli tenant list
ada-cli tenant get <id>
ada-cli tenant create <name>

# Fleets
ada-cli fleet list --tenant-id <id>
ada-cli fleet create <name> --tenant-id <id>
ada-cli fleet clone <id> --strategy timestamp

# Users
ada-cli user list --tenant-id <id>
ada-cli user create <name> <email> --tenant-id <id>

# Nodes
ada-cli node list
ada-cli node status <node-id>
ada-cli node clone <node-id>

# Database
ada-cli db health
ada-cli db stats
```

**Pros:**
✅ Single source of truth for Ada logic
✅ ~50% lower context consumption than MCP
✅ Direct database control
✅ Configurable output formatting

**Cons:**
❌ Subprocess overhead
❌ Requires local installation
❌ Shared state complexity

**Best for:** Direct Ada control, dual CLI/programmatic access, performance-critical operations

---

### 3. File System Scripts (`scripts/`)
**Architecture:** `Claude → Read tool → Individual script → Direct Database`

**Progressive Disclosure Approach:**

Instead of loading all Ada functionality at once, scripts are modular (150-250 lines each):

**Tenant Scripts:**
- `tenants/list_tenants.py` - Browse all tenants
- `tenants/get_tenant.py` - Get tenant details
- `tenants/create_tenant.py` - Create new tenant

**Fleet Scripts:**
- `fleets/list_fleets.py` - List tenant fleets
- `fleets/get_fleet.py` - Fleet details
- `fleets/create_fleet.py` - Create fleet
- `fleets/clone_fleet.py` - Clone with strategies

**User Scripts:**
- `users/list_users.py` - List tenant users
- `users/create_user.py` - Create user

**Node Scripts:**
- `nodes/list_nodes.py` - Active Ada nodes
- `nodes/node_status.py` - Node health/metrics
- `nodes/clone_node.py` - Replicate nodes

**Cloning Scripts:**
- `cloning/clone_with_strategy.py` - Multi-strategy cloning
- `cloning/verify_uniqueness.py` - ID uniqueness validation

**Pros:**
✅ Minimal token consumption (incremental loading)
✅ Maximum portability (Python + SQLAlchemy only)
✅ Complete script isolation
✅ Works from any directory

**Cons:**
❌ Code duplication across scripts
❌ No shared state mechanisms
❌ Duplicated utility logic

**Best for:** Context-critical operations, maximum portability, standalone integration

---

### 4. Skills (`skills/.claude/skills/ada-management/`)
**Architecture:** `Claude (detects trigger) → Loads SKILL.md → Runs scripts → Database`

**Structure:**
```
.claude/skills/ada-management/
├── SKILL.md                    # Skill description & instructions
└── scripts/                    # Reuses file system scripts
    ├── tenants/
    ├── fleets/
    ├── users/
    ├── nodes/
    └── cloning/
```

**Triggers:**
- "manage Ada tenants"
- "clone Ada fleet"
- "check node status"
- "create tenant in Ada"
- "verify cloning uniqueness"

**Pros:**
✅ Model-invoked automation
✅ Progressive disclosure (same as scripts)
✅ Team-shareable via git
✅ Context preservation

**Cons:**
❌ Claude Code ecosystem only
❌ Skill system learning curve
❌ Platform-specific dependency

**Best for:** Claude Code users prioritizing autonomous skill discovery and team collaboration

---

## 🏗️ Ada-Specific Features

All patterns support Ada's unique multi-tenant architecture:

### Tenant Isolation
- All operations are tenant-scoped
- UUID primary keys with tenant-unique IDs
- Complete data isolation guarantees

### Fleet Cloning Strategies
1. **Timestamp-based**: `mediterranean-fleet-abc123-1731312000-x7k9`
2. **Clone-based**: `original-fleet-xyz-clone-1-abc123`
3. **Sequential**: `fleet-00005-abc123`
4. **Slug-based**: `fleet-main-fleet-abc123`

### Node Replication
- Parent-child relationship tracking
- Generation tracking for lineage
- Memory inheritance (optional)
- Auto-scaling based on load

### Multi-Database Operations
- PostgreSQL (transactional data)
- Redis (caching & queues)
- Qdrant (vector search)
- Neo4j (graph relationships)
- FAISS (similarity search)

---

## 📈 Decision Framework

### Context Window Critical?
- **Scripts/Skills**: Superior efficiency through progressive disclosure
- **MCP/CLI**: Full context consumed on each invocation

### Customization Required?
- **MCP**: Locked unless you control the server
- **CLI/Scripts/Skills**: Full implementation control

### Portability Needs?
- **Scripts/Skills**: Most portable (just Python files)
- **CLI**: Requires installation
- **MCP**: Needs client setup

### Agent Autonomy?
- **MCP/Skills**: Auto-trigger based on context
- **CLI/Scripts**: Require explicit invocation

---

## 🎯 Recommended Usage

### For Existing Ada Tools:
- **80% MCP Servers**: Simplicity-first for standard operations
- **15% CLI**: When modification/context control needed
- **5% Scripts/Skills**: Context preservation critical

### For New Ada Tools:
- **80% CLI + Prime Prompt**: Flexible, scalable, agent-compatible
- **10% MCP Wrapping**: At organizational scale
- **10% Scripts/Skills**: Context or portability essential

---

## 🚀 Quick Start

### MCP Server
```bash
cd tooling/mcp_server
uv run server.py
```

### CLI
```bash
cd tooling/cli
uv run ada_cli.py tenant list
```

### Scripts
```bash
cd tooling/scripts
python tenants/list_tenants.py
```

### Skills
```bash
# In Claude Code
"List all Ada tenants"  # Auto-triggers skill
```

---

## 🔧 Installation

All patterns require:
- Python 3.11+
- PostgreSQL database
- Ada environment variables configured

```bash
# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Test connectivity
cd tooling/cli
uv run ada_cli.py db health
```

---

## 📚 Pattern Comparison Table

| Feature | MCP Server | CLI | Scripts | Skills |
|---------|-----------|-----|---------|--------|
| Context Preservation | ❌ Low | ⚠️ Medium | ✅ High | ✅ High |
| Token Efficiency | ❌ Low | ⚠️ Medium | ✅ High | ✅ High |
| Standardization | ✅ High | ⚠️ Medium | ❌ Low | ❌ Low |
| Portability | ⚠️ Medium | ⚠️ Medium | ✅ High | ❌ Low |
| Auto-trigger | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| Multi-client | ✅ Yes | ⚠️ Subprocess | ⚠️ Subprocess | ❌ No |
| Customization | ❌ Limited | ✅ Full | ✅ Full | ✅ Full |
| Team Sharing | ✅ Easy | ⚠️ Medium | ✅ Easy | ✅ Easy |

---

## 📖 Learn More

- [MCP Server Documentation](./mcp_server/README.md)
- [CLI Documentation](./cli/README.md)
- [Scripts Documentation](./scripts/README.md)
- [Skills Documentation](./skills/README.md)
- [Beyond MCP (Original)](https://github.com/disler/beyond-mcp)
- [Ada Main Documentation](../README.md)

---

## 🤝 Contributing

These patterns are experimental and designed for exploration. Feedback and improvements welcome!

---

**Token Efficiency Insight:** The fundamental distinction separates *context-preserving* approaches (Scripts, Skills via progressive disclosure) from *context-consuming* approaches (MCP, CLI via full context loading). For Ada's complex multi-tenant operations, token efficiency compounds dramatically at scale.
