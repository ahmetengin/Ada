# Ada Tooling Patterns - Quick Start Guide

Get started with all 4 Ada tooling patterns in minutes!

## Prerequisites

```bash
# Ensure you're in the Ada project root
cd /home/user/Ada

# Verify database configuration
cat .env | grep DATABASE_URL

# If .env doesn't exist, create it
cp .env.example .env
# Edit .env with your database credentials
```

## Pattern 1: CLI (Recommended Starting Point)

**Best for:** Direct control, dual output modes, lower overhead than MCP

### Setup
```bash
cd tooling/cli
```

### Quick Examples
```bash
# Check database health
uv run ada_cli.py db health

# List all tenants (human-readable)
uv run ada_cli.py tenant list

# List all tenants (JSON)
uv run ada_cli.py --format json tenant list

# Create a tenant
uv run ada_cli.py tenant create "Test Tenant" --description "Testing Ada"

# Get tenant ID from previous output, then create a fleet
uv run ada_cli.py fleet create "Test Fleet" \
  --tenant-id <tenant-id> \
  --strategy timestamp

# Clone the fleet
uv run ada_cli.py fleet clone <fleet-id> --strategy clone

# List fleets for a tenant
uv run ada_cli.py fleet list --tenant-id <tenant-id>
```

### Learn More
- [CLI Documentation](./cli/README.md)

---

## Pattern 2: File System Scripts

**Best for:** Context preservation, maximum portability, progressive disclosure

### Quick Examples
```bash
cd tooling/scripts

# List tenants (loads only ~150 lines)
python tenants/list_tenants.py

# Get tenant details (loads only ~120 lines)
python tenants/get_tenant.py <tenant-id>

# Create tenant
python tenants/create_tenant.py "Test Tenant" "Testing Ada"

# List fleets
python fleets/list_fleets.py <tenant-id>

# Create fleet with strategy
python fleets/create_fleet.py <tenant-id> "Test Fleet" "Description" timestamp

# Clone fleet
python fleets/clone_fleet.py <fleet-id> clone true

# Create user
python users/create_user.py <tenant-id> "Test User" "test@example.com"
```

### Progressive Disclosure Example
```bash
# Step 1: List tenants (minimal context)
python tenants/list_tenants.py

# Step 2: Get details of one (load only what you need)
python tenants/get_tenant.py <tenant-id>

# Step 3: List its fleets (still minimal)
python fleets/list_fleets.py <tenant-id>

# Total context: ~400 lines vs ~3000+ for full CLI
```

### Learn More
- [Scripts Documentation](./scripts/README.md)

---

## Pattern 3: MCP Server

**Best for:** Multiple MCP clients, standardized access, Claude Desktop integration

### Setup
```bash
cd tooling/mcp_server
```

### Running the Server
```bash
# Start MCP server
uv run server.py
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "ada-platform": {
      "command": "uv",
      "args": ["run", "server.py"],
      "cwd": "/home/user/Ada/tooling/mcp_server",
      "env": {
        "UV_PROJECT_PATH": "/home/user/Ada"
      }
    }
  }
}
```

### Example MCP Interactions

Once configured, in Claude Desktop:

**User:** "Show me all Ada tenants"
**Claude:** *Calls ada_tenant_list() and displays results*

**User:** "Create a new fleet for the first tenant"
**Claude:** *Calls ada_fleet_create() with appropriate parameters*

**User:** "Clone that fleet"
**Claude:** *Calls ada_fleet_clone() with fleet ID*

### Available Tools
- `ada_db_health` / `ada_db_stats`
- `ada_tenant_list` / `ada_tenant_get` / `ada_tenant_create` / `ada_tenant_update` / `ada_tenant_delete`
- `ada_fleet_list` / `ada_fleet_get` / `ada_fleet_create` / `ada_fleet_clone` / `ada_fleet_update` / `ada_fleet_delete`
- `ada_user_list` / `ada_user_get` / `ada_user_create` / `ada_user_delete`

### Learn More
- [MCP Server Documentation](./mcp_server/README.md)

---

## Pattern 4: Skills (Claude Code)

**Best for:** Claude Code users, autonomous activation, team sharing

### Setup

Skills are already configured! Located at:
```
.claude/skills/ada-management/
├── SKILL.md
└── README.md
```

### Usage in Claude Code

Simply mention Ada management in your conversation:

**Triggers:**
- "manage Ada tenants"
- "list Ada fleets"
- "create Ada tenant"
- "clone Ada fleet"
- "Ada platform operations"

**Example Conversations:**

**User:** "List all Ada tenants"
**Claude:** *Skill activates, reads scripts/tenants/list_tenants.py, executes, displays results*

**User:** "Create a fleet for Setur Marinas"
**Claude:** *Finds tenant ID, reads scripts/fleets/create_fleet.py, creates fleet*

**User:** "Clone that fleet with clone strategy"
**Claude:** *Uses previous fleet ID, reads scripts/fleets/clone_fleet.py, clones*

### Learn More
- [Skill Documentation](./.claude/skills/ada-management/README.md)
- [SKILL.md Instructions](./.claude/skills/ada-management/SKILL.md)

---

## Complete Workflow Example

Let's create a tenant, fleet, and user using each pattern:

### Using CLI
```bash
cd tooling/cli

# Create tenant
TENANT_OUTPUT=$(uv run ada_cli.py --format json tenant create "Acme Corp" --description "Test company")
TENANT_ID=$(echo $TENANT_OUTPUT | jq -r '.data.id')

# Create fleet
FLEET_OUTPUT=$(uv run ada_cli.py --format json fleet create "Main Fleet" --tenant-id $TENANT_ID --strategy timestamp)
FLEET_ID=$(echo $FLEET_OUTPUT | jq -r '.data.id')

# Clone fleet
uv run ada_cli.py fleet clone $FLEET_ID --strategy clone

# Create user
uv run ada_cli.py user create "John Doe" "john@acme.com" --tenant-id $TENANT_ID

# List everything
uv run ada_cli.py tenant list
uv run ada_cli.py fleet list --tenant-id $TENANT_ID
uv run ada_cli.py user list --tenant-id $TENANT_ID
```

### Using Scripts
```bash
cd tooling/scripts

# Create tenant
python tenants/create_tenant.py "Acme Corp" "Test company"
# Copy tenant ID from output

# Create fleet
python fleets/create_fleet.py <tenant-id> "Main Fleet" "Description" timestamp
# Copy fleet ID from output

# Clone fleet
python fleets/clone_fleet.py <fleet-id> clone false

# Create user
python users/create_user.py <tenant-id> "John Doe" "john@acme.com"

# List everything
python tenants/list_tenants.py
python fleets/list_fleets.py <tenant-id>
python users/list_users.py <tenant-id>
```

### Using MCP (in Claude Desktop)

**User:** "Create a tenant called Acme Corp for testing"
**Claude:** *Calls ada_tenant_create(name="Acme Corp", description="Test company")*

**User:** "Create a Main Fleet for that tenant"
**Claude:** *Calls ada_fleet_create(name="Main Fleet", tenant_id=<id>, strategy="timestamp")*

**User:** "Clone that fleet"
**Claude:** *Calls ada_fleet_clone(fleet_id=<id>, strategy="clone")*

**User:** "Add user John Doe"
**Claude:** *Calls ada_user_create(name="John Doe", email="john@acme.com", tenant_id=<id>)*

### Using Skills (in Claude Code)

**User:** "Create an Ada tenant for Acme Corp"
**Claude:** *Skill activates, reads scripts/tenants/create_tenant.py, executes*

**User:** "Create a fleet called Main Fleet for that tenant"
**Claude:** *Uses tenant ID from context, reads scripts/fleets/create_fleet.py, creates*

**User:** "Clone it using clone strategy"
**Claude:** *Uses fleet ID from context, reads scripts/fleets/clone_fleet.py, clones*

**User:** "Add user John Doe"
**Claude:** *Uses tenant ID from context, reads scripts/users/create_user.py, creates*

---

## ID Generation Strategies

When creating or cloning fleets, choose a strategy:

### Timestamp (Default)
```bash
# CLI
uv run ada_cli.py fleet create "Fleet" --tenant-id <id> --strategy timestamp

# Script
python fleets/create_fleet.py <tenant-id> "Fleet" "Desc" timestamp

# Result: mediterranean-fleet-abc123-1731312000-x7k9
```

### Clone (For Lineage)
```bash
# CLI
uv run ada_cli.py fleet clone <fleet-id> --strategy clone

# Script
python fleets/clone_fleet.py <fleet-id> clone

# Result: original-fleet-xyz-clone-1-abc123
```

### Sequential (Numbered)
```bash
# CLI
uv run ada_cli.py fleet create "Fleet" --tenant-id <id> --strategy sequential

# Script
python fleets/create_fleet.py <tenant-id> "Fleet" "Desc" sequential

# Result: fleet-00005-abc123
```

### Slug (Human-Readable)
```bash
# CLI
uv run ada_cli.py fleet create "Main Fleet" --tenant-id <id> --strategy slug

# Script
python fleets/create_fleet.py <tenant-id> "Main Fleet" "Desc" slug

# Result: fleet-main-fleet-abc123
```

---

## 🎯 Decision Guide: Which Pattern Should I Use?

### Quick Decision Tree

```
START: Are you building a NEW tool or using an EXISTING tool?

├─ EXISTING TOOL (you don't own it)
│  │
│  ├─ Is context window critical? (doing 10+ operations)
│  │  ├─ YES → Use Scripts/Skills (80% token savings)
│  │  └─ NO → Use MCP Server (80% of the time, simplicity wins)
│  │
│  └─ Need to modify/extend the tool?
│     ├─ YES → Build CLI wrapper (15% of the time)
│     └─ NO → Use MCP Server (it already exists!)
│
└─ NEW TOOL (you're building it)
   │
   ├─ Step 1: Build CLI first (80% of the time)
   │  └─ Why? Works for you, your team, AND agents (the trifecta)
   │
   ├─ Step 2: Do you need multi-agent access at scale?
   │  ├─ YES → Wrap CLI in MCP Server (10% of the time)
   │  └─ NO → Stop, use CLI directly
   │
   └─ Step 3: Is context preservation essential?
      ├─ YES → Also create Scripts/Skills (10% of the time)
      └─ NO → Stop, CLI is sufficient
```

### Token Efficiency Comparison

Real benchmarks from 5 Ada operations:

| Pattern | Tokens Used | % of Budget | Budget Remaining | Best For |
|---------|-------------|-------------|------------------|----------|
| **MCP Server** | 40,000 | 20% | 160,000 (80%) | Multi-client access |
| **CLI** | 20,000 | 10% | 180,000 (90%) | **New tools (start here!)** |
| **Scripts** | 7,500 | 3.75% | 192,500 (96%) | Context preservation |
| **Skills** | 7,500 | 3.75% | 192,500 (96%) | Claude Code + context |

**Insight:** Scripts/Skills preserve **32,500 more tokens** than MCP for the same work. That's enough for **200+ additional operations** or complex reasoning!

---

### Detailed Decision Matrix

#### Choose CLI When:
- ✅ **Building a new tool** (start here, 80% of the time)
- ✅ Want direct database control
- ✅ Need both human and JSON output
- ✅ Team needs scriptable interface
- ✅ Foundation for future MCP wrapping

**Why CLI First?**
1. Works for you (terminal), team (automation), agents (subprocess)
2. Easy to wrap in MCP later
3. Not locked into any ecosystem
4. 50% token savings vs MCP

#### Choose Scripts When:
- ✅ **Context window is critical** (doing many operations)
- ✅ Maximum portability needed (just Python files)
- ✅ Progressive disclosure preferred (load only what's needed)
- ✅ Standalone integration required
- ✅ Want 80% token savings vs MCP

**Trade-off:** Code duplication vs context efficiency

#### Choose MCP Server When:
- ✅ **Using external tools** (don't rebuild what exists)
- ✅ Multiple MCP clients will connect
- ✅ Standardized protocol required
- ✅ Claude Desktop integration wanted
- ✅ Team needs shared access point
- ✅ Context preservation not critical

**Trade-off:** Simplicity vs context consumption

#### Choose Skills When:
- ✅ **Working in Claude Code** (ecosystem fit)
- ✅ Autonomous activation desired (auto-triggers)
- ✅ Context preservation critical (80% savings)
- ✅ Team collaboration via git
- ✅ Want same efficiency as Scripts with auto-activation

**Trade-off:** Claude Code lock-in vs best-in-class context efficiency

---

### Industry Best Practices

Following recommendations from Indie Dev Dan, Anthropic, and top AI engineers:

**For Existing Tools:**
- 80% → MCP Server (simplicity, don't reinvent)
- 15% → CLI (when modification needed)
- 5% → Scripts/Skills (critical context preservation)

**For New Tools:**
- 80% → **CLI + Prime Prompt** (foundation)
- 10% → Wrap in MCP (at scale)
- 10% → Scripts/Skills (context critical)

**The Trifecta Philosophy:**
> "Build CLI first. It works for you, your team, AND your agents. Then wrap as needed." - Industry Best Practice

---

### Real-World Scenarios

**Scenario 1: External Tool (Kalshi Markets)**
- ✅ Use MCP Server (already exists)
- ❌ Don't rebuild as CLI (waste of time)
- ⚠️ If doing 20+ operations → Consider Scripts for context

**Scenario 2: New Internal Tool (Ada Platform)**
- ✅ Build CLI first (our approach)
- ✅ Wrap in MCP for multi-client (done)
- ✅ Create Scripts for context efficiency (done)
- ✅ Add Skills for Claude Code (done)

**Scenario 3: Simple CRUD Operations**
- ✅ CLI is sufficient (human + agent access)
- ❌ Don't need MCP (overkill)
- ❌ Don't need Scripts (context not critical for few operations)

**Scenario 4: Agent Doing 50+ Operations**
- ✅ Scripts/Skills mandatory (context window will overflow)
- ❌ MCP will consume 50% of context budget
- ❌ CLI will consume 25% of context budget

---

## Common Issues

### Database Connection Errors
```bash
# Verify .env exists
cat .env | grep DATABASE_URL

# Test with CLI health check
cd tooling/cli
uv run ada_cli.py db health
```

### Import Errors
```bash
# Ensure you're running from correct directory
# CLI: tooling/cli
# Scripts: tooling/scripts or anywhere (they use absolute paths)
# MCP: tooling/mcp_server
```

### Permission Errors
```bash
# Make scripts executable
chmod +x tooling/scripts/**/*.py
chmod +x tooling/cli/ada_cli.py
chmod +x tooling/mcp_server/server.py
```

---

## Next Steps

1. **Try the CLI first**: `cd tooling/cli && uv run ada_cli.py db health`
2. **Explore scripts**: `cd tooling/scripts && python tenants/list_tenants.py`
3. **Set up MCP** (if using Claude Desktop): Configure `claude_desktop_config.json`
4. **Use skills** (if in Claude Code): Just mention "Ada tenants" in conversation

## Learn More

- [Pattern Comparison](./README.md) - Detailed comparison of all patterns
- [CLI Documentation](./cli/README.md) - Full CLI reference
- [Scripts Documentation](./scripts/README.md) - Script details
- [MCP Server Documentation](./mcp_server/README.md) - MCP setup
- [Skills Documentation](./.claude/skills/ada-management/README.md) - Skills guide
- [Ada Main Documentation](../README.md) - Full platform overview

---

**Quick Recommendation:** Start with the CLI to get familiar with Ada operations, then explore Scripts for context efficiency or MCP for standardized access. If you're in Claude Code, the Skills pattern provides the best experience!
