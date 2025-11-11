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

## Decision Guide

### Choose CLI When:
- ✅ You want direct database control
- ✅ You need both human and JSON output
- ✅ You're scripting or automating
- ✅ Lower overhead than MCP is important

### Choose Scripts When:
- ✅ Context window is critical
- ✅ Maximum portability needed
- ✅ Progressive disclosure preferred
- ✅ Standalone integration required

### Choose MCP Server When:
- ✅ Multiple MCP clients will connect
- ✅ Standardized protocol required
- ✅ Claude Desktop integration wanted
- ✅ Team needs shared access point

### Choose Skills When:
- ✅ Working in Claude Code
- ✅ Autonomous activation desired
- ✅ Context preservation critical
- ✅ Team collaboration on git

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
