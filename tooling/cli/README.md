# Ada CLI - Command-Line Interface

Direct database access for Ada multi-tenant agent platform operations.

## Architecture

```
Claude → subprocess → Ada CLI → Direct SQLAlchemy → PostgreSQL
```

**Key Characteristics:**
- **Direct Database Access**: Uses SQLAlchemy async ORM for database operations
- **Dual Output Modes**: Human-readable tables or JSON for programmatic use
- **Single Source of Truth**: All Ada logic in one place
- **~50% Lower Context**: Compared to MCP Server pattern

---

## Why CLI First?

Following industry best practices from leading AI engineers, **always build CLI first for new tools**.

### The Trifecta: Works for Everyone

The CLI pattern simultaneously serves three critical audiences:

1. **👤 You (Developer)** - Direct terminal access for testing, debugging, operations
2. **👥 Your Team** - Scriptable interface for automation, CI/CD, deployment
3. **🤖 Your Agents** - Subprocess invocation with JSON output for programmatic access

**This is the only pattern that natively supports all three without additional work.**

### Why This Matters

**From the CLI, you can go anywhere:**

```
CLI (Foundation)
 ├─→ MCP Server (wrap CLI via subprocess)
 ├─→ REST API (expose CLI operations as endpoints)
 ├─→ Scripts (call CLI commands in isolated files)
 └─→ Direct Use (terminal, CI/CD, automation)
```

**From MCP Server, you're locked in:**

```
MCP Server (Locked)
 └─→ ❌ Can't easily convert to CLI
 └─→ ❌ Limited to MCP-compatible clients
 └─→ ❌ No direct terminal access
```

### Real-World Example

Our Ada MCP Server (`../mcp_server/server.py`) demonstrates this perfectly:

```python
def run_cli_command(args: List[str]) -> Dict[str, Any]:
    """MCP server delegates to CLI via subprocess."""
    cmd = ["python", str(CLI_PATH), "--format", "json"] + args
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

@mcp.tool()
def ada_tenant_list() -> List[Dict[str, Any]]:
    """MCP tool just calls the CLI."""
    return run_cli_command(["tenant", "list"])
```

**Benefits:**
- ✅ Single source of truth (CLI)
- ✅ Easy to maintain (one codebase)
- ✅ MCP gets all CLI improvements automatically
- ✅ Can still use CLI directly when needed

### Context Efficiency

While not as efficient as Scripts/Skills, CLI provides significant savings over MCP:

| Pattern | Context Consumed | Savings |
|---------|-----------------|---------|
| MCP Server | ~8,000 tokens | Baseline |
| **CLI** | ~4,000 tokens | **50% reduction** |
| Scripts | ~1,500 tokens | 80% reduction |

**When to use CLI over Scripts:**
- Need human-readable output (not just agent access)
- Want standard CLI UX (--help, flags, subcommands)
- Prefer cohesive codebase over isolated scripts
- Balance between context efficiency and developer experience

---

## Minimal Prime Prompt (5 Lines)

Want the simplest possible agent setup? Just give your agent this prompt:

```markdown
Read these files:
- tooling/cli/README.md
- tooling/cli/ada_cli.py

Summarize available tools, then help the user manage Ada operations.
```

That's it! Your agent now understands the CLI and can help users.

### Enhanced Prime Prompt

For more structured agent behavior, use this pattern:

```markdown
# Ada CLI Tools

## Setup
Read only these files to understand available tools:
1. `tooling/cli/README.md` - Command documentation
2. `tooling/cli/ada_cli.py` - CLI implementation

## Workflow
1. Summarize available commands and their purpose
2. When user requests Ada operations, use appropriate CLI commands
3. Always use `--format json` for programmatic access
4. Parse JSON responses and present in user-friendly format

## Important
- Do NOT read client.py or formatting.py (implementation details)
- Always verify tenant IDs before creating resources
- Use appropriate ID generation strategies for fleet operations
```

This 15-line prompt gives your agent everything needed without loading the entire codebase.

---

## Installation

```bash
cd tooling/cli

# Install dependencies (handled by parent uv project)
# The CLI uses imports from the main Ada project

# Ensure database is configured
cp ../../.env.example ../../.env
# Edit .env with your database credentials
```

## Quick Start

```bash
# Check database health
uv run ada_cli.py db health

# Get statistics
uv run ada_cli.py db stats

# List all tenants
uv run ada_cli.py tenant list

# Create a tenant
uv run ada_cli.py tenant create "Setur Marinas" --description "Turkish marina network"

# List fleets
uv run ada_cli.py fleet list --tenant-id <tenant-id>

# Create a fleet with timestamp strategy
uv run ada_cli.py fleet create "Mediterranean Fleet" --tenant-id <tenant-id> --strategy timestamp

# Clone a fleet
uv run ada_cli.py fleet clone <fleet-id> --strategy clone --preserve-relationships

# Create a user
uv run ada_cli.py user create "John Doe" "john@example.com" --tenant-id <tenant-id>
```

## Command Reference

### Database Commands

```bash
# Health check
ada_cli.py db health

# Comprehensive statistics
ada_cli.py db stats
```

**Output (human format):**
```
=== Ada Health Check ===
Status: healthy
Database: connected

Resource Counts:
  tenants: 3
  fleets: 12
  users: 45
```

**Output (JSON format):**
```bash
ada_cli.py --format json db health
```
```json
{
  "status": "healthy",
  "database": "connected",
  "counts": {
    "tenants": 3,
    "fleets": 12,
    "users": 45
  }
}
```

---

### Tenant Commands

#### List Tenants
```bash
ada_cli.py tenant list
```

**Example Output:**
```
=== 3 Tenant(s) ===

id                                     | name              | description          | created_at
-------------------------------------- | ----------------- | -------------------- | --------------------
550e8400-e29b-41d4-a716-446655440000   | Setur Marinas     | Marina network       | 2025-01-15 10:30:00
6ba7b810-9dad-11d1-80b4-00c04fd430c8   | Bali Catamarans   | Catamaran fleet      | 2025-01-14 09:15:00
6ba7b811-9dad-11d1-80b4-00c04fd430c8   | Blue Voyage       | Cabin charters       | 2025-01-13 14:20:00
```

#### Get Tenant
```bash
ada_cli.py tenant get <tenant-id>
```

#### Create Tenant
```bash
ada_cli.py tenant create "Organization Name" --description "Optional description"
```

#### Update Tenant
```bash
ada_cli.py tenant update <tenant-id> --name "New Name" --description "New description"
```

#### Delete Tenant
```bash
ada_cli.py tenant delete <tenant-id>
# Prompts for confirmation
# Cascades to delete all fleets and users
```

---

### Fleet Commands

#### List Fleets
```bash
# All fleets
ada_cli.py fleet list

# Tenant-specific fleets
ada_cli.py fleet list --tenant-id <tenant-id>
```

#### Get Fleet
```bash
ada_cli.py fleet get <fleet-id>
```

**Example Output:**
```
=== Fleet ===
id: 123e4567-e89b-12d3-a456-426614174000
tenant_id: 550e8400-e29b-41d4-a716-446655440000
tenant_unique_id: mediterranean-fleet-abc123-1731312000-x7k9
name: Mediterranean Fleet
description: Main sailing fleet
created_at: 2025-01-15 10:35:00
updated_at: 2025-01-15 10:35:00

tenant: Tenant
```

#### Create Fleet
```bash
ada_cli.py fleet create "Fleet Name" \
  --tenant-id <tenant-id> \
  --description "Optional description" \
  --strategy [timestamp|clone|sequential|slug]
```

**ID Generation Strategies:**
- `timestamp`: `mediterranean-fleet-abc123-1731312000-x7k9` (default)
- `clone`: `original-fleet-xyz-clone-1-abc123`
- `sequential`: `fleet-00005-abc123`
- `slug`: `fleet-main-fleet-abc123`

#### Clone Fleet
```bash
ada_cli.py fleet clone <fleet-id> \
  --strategy [timestamp|clone|sequential|slug] \
  --preserve-relationships
```

**Example:**
```bash
# Clone with clone-based ID strategy
ada_cli.py fleet clone 123e4567-e89b-12d3-a456-426614174000 --strategy clone

# Clone and preserve relationships
ada_cli.py fleet clone 123e4567-e89b-12d3-a456-426614174000 --preserve-relationships
```

#### Update Fleet
```bash
ada_cli.py fleet update <fleet-id> --name "New Name" --description "New description"
```

#### Delete Fleet
```bash
ada_cli.py fleet delete <fleet-id>
# Prompts for confirmation
```

---

### User Commands

#### List Users
```bash
# All users
ada_cli.py user list

# Tenant-specific users
ada_cli.py user list --tenant-id <tenant-id>
```

#### Get User
```bash
ada_cli.py user get <user-id>
```

#### Create User
```bash
ada_cli.py user create "User Name" "email@example.com" --tenant-id <tenant-id>
```

#### Delete User
```bash
ada_cli.py user delete <user-id>
# Prompts for confirmation
```

---

## Output Formats

### Human-Readable (Default)
```bash
ada_cli.py tenant list
```
- Formatted tables
- Success/error messages with emojis
- Readable timestamps

### JSON
```bash
ada_cli.py --format json tenant list
```
- Machine-parsable output
- ISO 8601 timestamps
- Complete field serialization

**Use JSON format when:**
- Piping to other tools (jq, etc.)
- Programmatic processing
- Logging/auditing
- API integration testing

---

## Usage Patterns

### Scripting with JSON Output
```bash
#!/bin/bash

# Get tenant ID by name
TENANT_ID=$(ada_cli.py --format json tenant list | \
  jq -r '.[] | select(.name == "Setur Marinas") | .id')

# Create fleet in that tenant
ada_cli.py fleet create "New Fleet" \
  --tenant-id "$TENANT_ID" \
  --strategy timestamp
```

### Bulk Operations
```bash
# Clone multiple fleets
for fleet_id in $(ada_cli.py --format json fleet list --tenant-id $TENANT_ID | jq -r '.[].id'); do
  ada_cli.py fleet clone $fleet_id --strategy clone
done
```

### Health Monitoring
```bash
# Check health every 30 seconds
watch -n 30 'ada_cli.py db health'
```

---

## Advantages

✅ **Direct Database Control**: Full access to Ada's data layer
✅ **~50% Lower Context**: Compared to MCP Server wrapper overhead
✅ **Dual Output**: Switch between human and JSON seamlessly
✅ **Single Source of Truth**: All Ada logic in one codebase
✅ **Tenant Isolation**: Built-in tenant scoping
✅ **Strategy Support**: Multiple ID generation strategies
✅ **Relationship Preservation**: Optional cloning with relationships

---

## Disadvantages

❌ **Subprocess Overhead**: Agent must spawn processes
❌ **Local Installation**: Requires Python environment setup
❌ **Shared State Complexity**: Database connection pooling
❌ **No MCP Standard**: Custom command interface

---

## Best For

- **Direct Ada Control**: When you need full database access
- **Dual CLI/Programmatic Use**: Both human and machine interfaces
- **Performance-Critical Operations**: Lower overhead than MCP
- **Development/Testing**: Quick iteration on Ada operations
- **Scripting/Automation**: Shell script integration
- **Operations/DevOps**: Monitoring, backups, migrations

---

## Integration with Other Patterns

### MCP Server
The MCP Server (in `../mcp_server/`) wraps this CLI via subprocess:
```python
# MCP Server calls:
subprocess.run(["python", "ada_cli.py", "--format", "json", "tenant", "list"])
```

### File System Scripts
Scripts (in `../scripts/`) duplicate this functionality but are self-contained:
```python
# Scripts avoid shared dependencies but duplicate database logic
```

### Skills
Skills (in `../skills/`) wrap the scripts for Claude Code:
```markdown
# SKILL.md triggers scripts when Claude detects context
```

---

## Environment Variables

Required in `.env` (at repository root):
```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ada
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

---

## Error Handling

All commands provide clear error messages:

```bash
# Tenant not found
❌ Error: Tenant not found: invalid-id

# JSON format
{
  "error": "Tenant not found: invalid-id"
}
```

---

## Performance

- **Database Connection Pooling**: Reuses connections across commands
- **Async Operations**: Non-blocking database I/O
- **Optimized Queries**: Uses selectinload for relationships
- **Minimal Overhead**: Direct SQLAlchemy access

---

## Development

### Adding New Commands

1. Add client method in `client.py`:
```python
async def new_operation(self, param: str) -> Result:
    async with self.session() as session:
        # Database logic
        return result
```

2. Add CLI command in `ada_cli.py`:
```python
@cli.command('new-command')
@click.argument('param')
@click.pass_context
def new_command(ctx, param):
    """Command description."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _new():
        result = await client.new_operation(param)
        return formatter.output(result)

    result = run_async(_new())
    click.echo(result)
```

3. Update this README with usage examples

---

## Troubleshooting

### Database Connection Errors
```bash
# Check .env configuration
cat ../../.env | grep DATABASE_URL

# Test connectivity
ada_cli.py db health
```

### Import Errors
```bash
# Ensure you're running from tooling/cli directory
cd tooling/cli
uv run ada_cli.py --help
```

### Permission Errors
```bash
# Make CLI executable
chmod +x ada_cli.py
```

---

## Related Documentation

- [Main Tooling README](../README.md) - Pattern comparison
- [MCP Server](../mcp_server/README.md) - MCP wrapper around this CLI
- [Scripts](../scripts/README.md) - Self-contained alternative
- [Skills](../skills/README.md) - Claude Code integration
- [Ada Main Documentation](../../README.md) - Full platform overview

---

**Context Efficiency**: While the CLI pattern consumes more context than Scripts/Skills, it provides ~50% reduction compared to MCP Server due to eliminating protocol overhead and wrapper layers. For operations requiring full database control, this trade-off is worthwhile.
