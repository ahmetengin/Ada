# Ada MCP Server

Model Context Protocol (MCP) server exposing Ada multi-tenant platform operations.

## Architecture

```
Claude/LLM → MCP Protocol → FastMCP Server → subprocess → CLI → Database
```

**Key Characteristics:**
- **Standardized Integration**: MCP protocol for universal client compatibility
- **Automatic Tool Discovery**: All tools exposed automatically to MCP clients
- **Wrapper Pattern**: Delegates to Ada CLI via subprocess
- **Context Loss**: Fresh start on every tool invocation (stateless)

## Installation

```bash
cd tooling/mcp_server

# Ensure Ada CLI is working first
cd ../cli
uv run ada_cli.py db health

# Return to MCP server
cd ../mcp_server
```

## Running the Server

### Standalone Mode
```bash
# Run MCP server
uv run server.py
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "ada-platform": {
      "command": "uv",
      "args": [
        "run",
        "/home/user/Ada/tooling/mcp_server/server.py"
      ],
      "cwd": "/home/user/Ada/tooling/mcp_server"
    }
  }
}
```

## Available Tools

The MCP server exposes 19 tools across 4 categories:

### Database Tools (2)
- `ada_db_health` - Check database connectivity and health
- `ada_db_stats` - Get comprehensive database statistics

### Tenant Tools (5)
- `ada_tenant_list` - List all tenants
- `ada_tenant_get` - Get tenant details by ID
- `ada_tenant_create` - Create new tenant
- `ada_tenant_update` - Update tenant details
- `ada_tenant_delete` - Delete tenant (cascades)

### Fleet Tools (6)
- `ada_fleet_list` - List fleets (optional tenant filter)
- `ada_fleet_get` - Get fleet details by ID
- `ada_fleet_create` - Create new fleet with ID strategy
- `ada_fleet_clone` - Clone fleet with unique ID generation
- `ada_fleet_update` - Update fleet details
- `ada_fleet_delete` - Delete fleet

### User Tools (4)
- `ada_user_list` - List users (optional tenant filter)
- `ada_user_get` - Get user details by ID
- `ada_user_create` - Create new user
- `ada_user_delete` - Delete user

## Usage Examples

### From MCP Client (Claude Desktop, etc.)

The client will see tool descriptions and can call them naturally:

**User:** "Show me all tenants in Ada"

**Claude (via MCP):**
```
Calling ada_tenant_list()...

I found 3 tenants:
1. Setur Marinas - Turkish marina network
2. Bali Catamarans - Catamaran fleet management
3. Blue Voyage - Cabin charter operations
```

**User:** "Create a new fleet for Setur Marinas"

**Claude (via MCP):**
```
Calling ada_fleet_create(
  name="Mediterranean Fleet",
  tenant_id="550e8400-e29b-41d4-a716-446655440000",
  strategy="timestamp"
)...

Created fleet with ID: mediterranean-fleet-abc123-1731312000-x7k9
```

**User:** "Clone that fleet"

**Claude (via MCP):**
```
Calling ada_fleet_clone(
  fleet_id="123e4567-e89b-12d3-a456-426614174000",
  strategy="clone"
)...

Cloned fleet with new ID: mediterranean-fleet-abc123-clone-1-y8j3
```

## Tool Details

### Database Tools

#### ada_db_health
```python
ada_db_health()
```

Returns:
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

#### ada_db_stats
```python
ada_db_stats()
```

Returns:
```json
{
  "totals": {
    "tenants": 3,
    "fleets": 12,
    "users": 45
  },
  "tenant_breakdown": [
    {"tenant": "Setur Marinas", "fleet_count": 7},
    {"tenant": "Bali Catamarans", "fleet_count": 3}
  ]
}
```

### Tenant Tools

#### ada_tenant_create
```python
ada_tenant_create(
    name="Organization Name",
    description="Optional description"
)
```

#### ada_fleet_create
```python
ada_fleet_create(
    name="Fleet Name",
    tenant_id="550e8400-e29b-41d4-a716-446655440000",
    description="Optional description",
    strategy="timestamp"  # or "clone", "sequential", "slug"
)
```

**ID Generation Strategies:**
- `timestamp` (default): `mediterranean-fleet-abc123-1731312000-x7k9`
- `clone`: `original-fleet-xyz-clone-1-abc123`
- `sequential`: `fleet-00005-abc123`
- `slug`: `fleet-main-fleet-abc123`

#### ada_fleet_clone
```python
ada_fleet_clone(
    fleet_id="123e4567-e89b-12d3-a456-426614174000",
    strategy="clone",
    preserve_relationships=False
)
```

### User Tools

#### ada_user_create
```python
ada_user_create(
    name="User Name",
    email="user@example.com",
    tenant_id="550e8400-e29b-41d4-a716-446655440000"
)
```

## How It Works

### Subprocess Delegation

The MCP server wraps the Ada CLI:

```python
def run_cli_command(args: List[str]) -> Dict[str, Any]:
    cmd = ["python", str(CLI_PATH), "--format", "json"] + args
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)
```

**Flow:**
1. MCP client calls tool (e.g., `ada_tenant_list`)
2. Server constructs CLI command: `python ada_cli.py --format json tenant list`
3. Server executes CLI via subprocess
4. CLI queries database and returns JSON
5. Server parses JSON and returns to MCP client
6. Client receives structured data

### Context Loss

**Critical Trade-off:** Every MCP tool call starts fresh. The server is stateless.

**Example:**
```
1. Client calls ada_tenant_list() → Fresh subprocess
2. Client calls ada_tenant_get(id) → Fresh subprocess (no memory of list)
3. Client calls ada_fleet_create() → Fresh subprocess (no memory of previous calls)
```

This means:
- No caching across calls
- No shared state
- Higher overhead per operation
- But: Clean, predictable behavior

## Advantages

✅ **Standardized Integration**: Works with any MCP-compatible client
✅ **Automatic Tool Discovery**: Clients see all tools immediately
✅ **Clean Abstractions**: MCP protocol handles serialization
✅ **Multi-Client Support**: Multiple clients can connect
✅ **Separation of Concerns**: MCP layer separate from business logic
✅ **Type Safety**: FastMCP provides type checking

## Disadvantages

❌ **Context Loss**: Fresh start on every call (stateless)
❌ **Higher Overhead**: MCP wrapper + CLI wrapper + database
❌ **Locked Implementation**: Clients can't modify unless they control server
❌ **Subprocess Overhead**: Process spawn for each operation
❌ **No Caching**: Can't cache results across calls

## Best For

- **Multiple MCP Clients**: Claude Desktop, VS Code, other MCP clients
- **Standard Integration**: Need MCP protocol compliance
- **Team Sharing**: One server, many clients
- **Separation**: Business logic separate from MCP layer
- **Exploration**: Clients discover Ada capabilities automatically

## Not Best For

- **Context-Critical Operations**: Use Scripts or Skills instead
- **Performance**: Use CLI directly for lower overhead
- **Single Agent**: If only one agent, Scripts/Skills more efficient
- **Custom Integration**: If you need non-MCP access

## Configuration

### Environment Variables

The server uses the same environment as Ada CLI:

```bash
# In /home/user/Ada/.env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ada
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### Timeouts

Default command timeout: 30 seconds

Modify in `server.py`:
```python
result = subprocess.run(
    cmd,
    capture_output=True,
    text=True,
    check=True,
    timeout=30  # Adjust here
)
```

## Error Handling

All tools return structured errors:

```json
{
  "error": "Tenant not found: invalid-id",
  "success": false
}
```

The MCP client will receive and can handle these gracefully.

## Development

### Adding New Tools

1. Add CLI command in `../cli/ada_cli.py`
2. Add MCP tool wrapper in `server.py`:

```python
@mcp.tool()
def ada_new_operation(param: str) -> Dict[str, Any]:
    """
    Description of the operation.

    Args:
        param: Parameter description

    Returns:
        Result description
    """
    return run_cli_command(["new", "operation", param])
```

3. Restart MCP server
4. MCP clients automatically discover new tool

### Testing Tools

```bash
# Test CLI first
cd ../cli
uv run ada_cli.py --format json tenant list

# Test MCP server
cd ../mcp_server
uv run server.py
# In another terminal, use MCP client to call tools
```

## Comparison with Other Patterns

### vs CLI
- **MCP**: Standardized protocol, multi-client, context loss
- **CLI**: Direct access, lower overhead, single user

### vs Scripts
- **MCP**: Higher overhead, but standardized access
- **Scripts**: Lower context, but no standard protocol

### vs Skills
- **MCP**: Works with any MCP client
- **Skills**: Claude Code only, but context preservation

## Integration Example

### Claude Desktop Configuration

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

After configuration, Claude Desktop will:
1. Discover all 19 Ada tools automatically
2. Understand tool capabilities from docstrings
3. Call tools when relevant to user requests
4. Handle responses and errors gracefully

## Security Considerations

**Warning:** This server provides direct database access.

Recommendations:
- Run on trusted networks only
- Implement authentication if exposing remotely
- Use read-only database user for list/get operations
- Audit all tool calls
- Consider rate limiting for production

## Performance

**Latency per tool call:**
- MCP serialization: ~5-10ms
- Subprocess spawn: ~50-100ms
- CLI initialization: ~100-200ms
- Database query: ~10-50ms
- **Total: ~165-360ms per operation**

For comparison:
- **CLI Direct**: ~110-250ms
- **Scripts**: ~110-250ms
- **MCP Server**: ~165-360ms (overhead: ~50-110ms)

## Related Documentation

- [Main Tooling README](../README.md) - Pattern comparison
- [CLI Documentation](../cli/README.md) - Underlying CLI
- [Scripts Documentation](../scripts/README.md) - Lower-context alternative
- [Skills Documentation](../skills/README.md) - Claude Code integration
- [FastMCP Documentation](https://github.com/anthropics/fastmcp) - MCP framework
- [Ada Main Documentation](../../README.md) - Full platform overview

---

**Context Loss Insight:** The MCP Server pattern prioritizes standardization and multi-client access over context preservation. For Ada's complex multi-tenant operations involving cloning strategies and relationship preservation, this context loss means each operation must be fully specified—no memory of previous fleet details, tenant choices, or operation history. If context preservation is critical, consider Scripts or Skills patterns instead.
