# Ada File System Scripts - Progressive Disclosure Pattern

Self-contained Python scripts for Ada multi-tenant operations. Each script handles a single operation with embedded database client.

## Architecture

```
Claude → Read tool → Individual script → Direct SQLAlchemy → PostgreSQL
```

**Key Characteristics:**
- **Progressive Disclosure**: Load only the functionality you need (~150-250 lines per script)
- **Maximum Portability**: Just Python + imports from Ada project
- **Complete Isolation**: Each script is self-contained
- **Absolute Path Resolution**: Works from any directory
- **Context Preservation**: Minimal token consumption through incremental loading

## Why Scripts Over CLI?

**Token Efficiency:**
- **CLI**: Loads entire CLI codebase (~1000+ lines) on every invocation
- **Scripts**: Load only the specific operation needed (~150-250 lines)
- **Savings**: ~75% reduction in context consumption

**When to Use:**
- Context window is critical
- Maximum portability required
- Standalone integration needed
- Agent needs to discover operations progressively

---

## Progressive Disclosure in Action

**The Core Principle:** "Load only what you need, when you need it." - Anthropic

### Real-World Comparison

**Scenario:** Agent needs to list tenants, then get details of one tenant.

#### ❌ CLI Approach (Full Context Loading)
```
User: "List Ada tenants"
→ Agent loads entire CLI: ~1,000+ lines
→ Executes: ada_cli.py tenant list
→ Context consumed: ~4,000 tokens

User: "Tell me about the first one"
→ Agent loads entire CLI again: ~1,000+ lines
→ Executes: ada_cli.py tenant get <id>
→ Context consumed: ~4,000 tokens

Total: ~8,000 tokens for 2 operations
```

#### ✅ Scripts Approach (Progressive Disclosure)
```
User: "List Ada tenants"
→ Agent reads ONLY list_tenants.py: ~150 lines
→ Executes: python list_tenants.py
→ Context consumed: ~600 tokens

User: "Tell me about the first one"
→ Agent reads ONLY get_tenant.py: ~120 lines
→ Executes: python get_tenant.py <id>
→ Context consumed: ~480 tokens

Total: ~1,080 tokens for 2 operations
```

**Savings:** **87% reduction** in context consumption!

### Token Efficiency at Scale

**Scenario:** Agent performs 10 Ada operations throughout a session.

| Pattern | Per Operation | 10 Operations | Total Context |
|---------|---------------|---------------|---------------|
| MCP Server | ~8,000 tokens | 10x | ~80,000 tokens |
| CLI | ~4,000 tokens | 10x | ~40,000 tokens |
| **Scripts** | **~1,500 tokens** | **10x** | **~15,000 tokens** |

**Result:** Scripts preserve **65,000 more tokens** than MCP Server across 10 operations!

With a 200K token budget, that's the difference between:
- **MCP**: 120K remaining (60% budget left)
- **CLI**: 160K remaining (80% budget left)
- **Scripts**: 185K remaining (92% budget left)

### Discovery Pattern: How Agents Use Scripts

Unlike CLI/MCP which load everything upfront, scripts enable **incremental discovery**:

```
1. User: "Show me Ada tenants"
   → Agent: Discovers scripts/tenants/ directory
   → Agent: Sees 3 files: list_tenants.py, get_tenant.py, create_tenant.py
   → Agent: Reads ONLY list_tenants.py (~150 lines)
   → Agent: Executes script
   ✅ Context: ~600 tokens

2. User: "Tell me more about Setur Marinas"
   → Agent: Already knows tenant ID from previous result
   → Agent: Reads ONLY get_tenant.py (~120 lines)
   → Agent: Executes script with tenant ID
   ✅ Context: ~480 tokens

3. User: "Create a fleet for them"
   → Agent: Discovers scripts/fleets/ directory
   → Agent: Reads ONLY create_fleet.py (~180 lines)
   → Agent: Executes script with tenant ID
   ✅ Context: ~720 tokens

Total: ~1,800 tokens vs ~12,000+ with CLI approach
```

**Key Insight:** Each script operation is **independent**. The agent only pays the cost for what it actually uses.

---

## Minimal Prime Prompt for Scripts

Want your agent to use progressive disclosure? Here's the simplest setup:

```markdown
# Ada Scripts

When the user asks about Ada operations, progressively discover and use scripts in `tooling/scripts/`.

**Discovery Process:**
1. List the directory to see available operations
2. Read ONLY the specific script needed
3. Execute the script
4. Repeat for next operation

**Do NOT:**
- Load multiple scripts upfront
- Read implementation details
- Consume unnecessary context

**Example:**
User asks to list tenants → Read scripts/tenants/list_tenants.py → Execute it
```

That's it! The agent will naturally discover and use scripts progressively.

### Enhanced Prime Prompt with Structure

For more guidance:

```markdown
# Ada File System Scripts

## Progressive Disclosure Pattern

Load scripts incrementally as needed. Each script is self-contained.

## Available Operations

Check these directories for scripts:
- `tooling/scripts/tenants/` - Tenant management
- `tooling/scripts/fleets/` - Fleet operations
- `tooling/scripts/users/` - User management

## Workflow

1. User requests Ada operation
2. Identify which directory has relevant scripts
3. List that directory to discover available scripts
4. Read ONLY the specific script needed for this operation
5. Execute script with appropriate arguments
6. Present results to user
7. For next operation, repeat from step 1

## Critical Rules

- **Never** load all scripts upfront
- **Never** read scripts you don't immediately need
- **Always** use absolute paths (scripts work from any directory)
- **Always** check script exit codes (0 = success, 1 = failure)

## Example Flow

User: "List Ada tenants"
→ Read scripts/tenants/list_tenants.py
→ Execute: python list_tenants.py
→ Show results

User: "Get details on first tenant"
→ Read scripts/tenants/get_tenant.py (only now!)
→ Execute: python get_tenant.py <id>
→ Show results
```

This guides the agent to use progressive disclosure naturally.

---

## Installation

```bash
# No special installation needed!
# Scripts use imports from the main Ada project

# Ensure database is configured
cp ../../.env.example ../../.env
# Edit .env with your database credentials
```

## Directory Structure

```
scripts/
├── tenants/
│   ├── list_tenants.py       # List all tenants
│   ├── get_tenant.py          # Get tenant details
│   └── create_tenant.py       # Create new tenant
├── fleets/
│   ├── list_fleets.py         # List fleets
│   ├── get_fleet.py           # Get fleet details
│   ├── create_fleet.py        # Create new fleet
│   └── clone_fleet.py         # Clone existing fleet
└── users/
    ├── list_users.py          # List users
    └── create_user.py         # Create new user
```

---

## Tenant Scripts

### List Tenants
```bash
cd tooling/scripts/tenants
python list_tenants.py
```

**Output:**
```
=== 3 Tenant(s) ===

ID                                     | Name              | Description          | Created At
-------------------------------------- | ----------------- | -------------------- | --------------------
550e8400-e29b-41d4-a716-446655440000   | Setur Marinas     | Marina network       | 2025-01-15 10:30:00
6ba7b810-9dad-11d1-80b4-00c04fd430c8   | Bali Catamarans   | Catamaran fleet      | 2025-01-14 09:15:00
```

### Get Tenant
```bash
python get_tenant.py <tenant-id>
```

**Output:**
```
=== Tenant Details ===
ID: 550e8400-e29b-41d4-a716-446655440000
Name: Setur Marinas
Description: Turkish marina network
Created At: 2025-01-15 10:30:00
```

### Create Tenant
```bash
python create_tenant.py "Organization Name" "Optional description"
```

**Output:**
```
✅ Tenant created successfully!

=== Tenant Details ===
ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Name: Organization Name
Description: Optional description
Created At: 2025-01-15 11:45:00
```

---

## Fleet Scripts

### List Fleets
```bash
cd tooling/scripts/fleets

# All fleets
python list_fleets.py

# Tenant-specific fleets
python list_fleets.py <tenant-id>
```

**Output:**
```
=== 5 Fleet(s) ===

ID                                     | Tenant           | Name                     | Tenant Unique ID                         | Created At
-------------------------------------- | ---------------- | ------------------------ | ---------------------------------------- | --------------------
123e4567-e89b-12d3-a456-426614174000   | Setur Marinas    | Mediterranean Fleet      | mediterranean-fleet-abc123-1731312000... | 2025-01-15 10:35:00
```

### Get Fleet
```bash
python get_fleet.py <fleet-id>
```

**Output:**
```
=== Fleet Details ===
ID: 123e4567-e89b-12d3-a456-426614174000
Tenant ID: 550e8400-e29b-41d4-a716-446655440000
Tenant Name: Setur Marinas
Tenant Unique ID: mediterranean-fleet-abc123-1731312000-x7k9
Name: Mediterranean Fleet
Description: Main sailing fleet for Mediterranean operations
Created At: 2025-01-15 10:35:00
```

### Create Fleet
```bash
python create_fleet.py <tenant-id> "Fleet Name" "Description" [strategy]
```

**Strategy Options:**
- `timestamp` (default): `mediterranean-fleet-abc123-1731312000-x7k9`
- `clone`: `original-fleet-xyz-clone-1-abc123`
- `sequential`: `fleet-00005-abc123`
- `slug`: `fleet-main-fleet-abc123`

**Examples:**
```bash
# With timestamp strategy (default)
python create_fleet.py 550e8400-e29b-41d4-a716-446655440000 "Aegean Fleet" "Aegean operations"

# With sequential strategy
python create_fleet.py 550e8400-e29b-41d4-a716-446655440000 "Black Sea Fleet" "Black Sea ops" sequential
```

**Output:**
```
✅ Fleet created successfully!

=== Fleet Details ===
ID: 987fbc97-4bed-5078-9f07-9141ba07c9f3
Tenant ID: 550e8400-e29b-41d4-a716-446655440000
Tenant Name: Setur Marinas
Tenant Unique ID: aegean-fleet-abc123-1731315600-m2n8
Name: Aegean Fleet
Description: Aegean operations
Created At: 2025-01-15 11:40:00
```

### Clone Fleet
```bash
python clone_fleet.py <fleet-id> [strategy] [preserve-relationships]
```

**Arguments:**
- `strategy`: clone (default), timestamp, sequential, slug
- `preserve-relationships`: true/false (default: false)

**Examples:**
```bash
# Clone with clone-based ID strategy
python clone_fleet.py 123e4567-e89b-12d3-a456-426614174000 clone

# Clone with timestamp strategy
python clone_fleet.py 123e4567-e89b-12d3-a456-426614174000 timestamp

# Clone and preserve relationships
python clone_fleet.py 123e4567-e89b-12d3-a456-426614174000 clone true
```

**Output:**
```
✅ Fleet cloned successfully!

=== Cloned Fleet Details ===
ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Original Fleet ID: 123e4567-e89b-12d3-a456-426614174000
Tenant ID: 550e8400-e29b-41d4-a716-446655440000
Tenant Name: Setur Marinas
Tenant Unique ID: mediterranean-fleet-abc123-clone-1-x9k2
Name: Mediterranean Fleet
Description: Main sailing fleet for Mediterranean operations
Created At: 2025-01-15 11:50:00
```

---

## User Scripts

### List Users
```bash
cd tooling/scripts/users

# All users
python list_users.py

# Tenant-specific users
python list_users.py <tenant-id>
```

**Output:**
```
=== 8 User(s) ===

ID                                     | Tenant           | Name                     | Email                            | Created At
-------------------------------------- | ---------------- | ------------------------ | -------------------------------- | --------------------
def01234-5678-90ab-cdef-012345678901   | Setur Marinas    | John Doe                 | john@seturmarinas.com            | 2025-01-15 10:40:00
```

### Create User
```bash
python create_user.py <tenant-id> "User Name" "email@example.com"
```

**Example:**
```bash
python create_user.py 550e8400-e29b-41d4-a716-446655440000 "Jane Smith" "jane@example.com"
```

**Output:**
```
✅ User created successfully!

=== User Details ===
ID: 456def78-90ab-cdef-0123-456789abcdef
Tenant ID: 550e8400-e29b-41d4-a716-446655440000
Tenant Name: Setur Marinas
Tenant Unique ID: jane-smith-abc123-1731316200-p4q7
Name: Jane Smith
Email: jane@example.com
Created At: 2025-01-15 11:50:00
```

---

## How Scripts Work

### Absolute Path Resolution
All scripts use this pattern to work from any directory:

```python
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
```

This ensures:
- Scripts can be called from anywhere
- Imports always resolve correctly
- No dependency on current working directory

### Embedded Database Client
Each script contains its own database client logic:

```python
async def operation():
    settings = get_settings()

    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )

    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    try:
        async with async_session() as session:
            # Operation logic
            pass
    finally:
        await engine.dispose()
```

### Self-Contained Execution
Each script:
1. Imports only what it needs from Ada
2. Creates its own database connection
3. Performs the operation
4. Formats and displays output
5. Cleans up resources
6. Returns appropriate exit code

---

## Progressive Disclosure Benefits

### Context Efficiency Example

**Scenario:** Agent needs to list tenants, then get details of one tenant.

**CLI Approach:**
```
1. Load entire CLI (~1000+ lines) → List tenants
2. Load entire CLI again (~1000+ lines) → Get tenant
Total context: ~2000+ lines
```

**Scripts Approach:**
```
1. Read list_tenants.py (~150 lines) → List tenants
2. Read get_tenant.py (~120 lines) → Get tenant
Total context: ~270 lines
```

**Savings:** ~87% reduction in context consumption!

### Discovery Pattern

Claude can discover operations progressively:

1. User: "Show me Ada tenants"
2. Claude reads `tooling/scripts/tenants/` directory
3. Claude discovers `list_tenants.py`
4. Claude reads and executes script
5. User: "Tell me more about the first one"
6. Claude discovers `get_tenant.py`
7. Claude reads and executes with tenant ID

No upfront context loading required!

---

## Advantages

✅ **Minimal Context**: ~75% reduction vs CLI, ~90% vs MCP
✅ **Maximum Portability**: Just Python files
✅ **Complete Isolation**: No shared state
✅ **Works Anywhere**: Absolute path resolution
✅ **Progressive Discovery**: Load only what you need
✅ **Tenant Isolation**: Built-in multi-tenancy
✅ **Strategy Support**: Multiple ID generation methods
✅ **Self-Documenting**: Clear usage in each file

---

## Disadvantages

❌ **Code Duplication**: Database client in each script
❌ **No Shared State**: Can't cache across operations
❌ **Maintenance Overhead**: Updates needed in multiple places
❌ **No CLI Niceties**: No --help, --version, etc.

---

## Best For

- **Context-Critical Operations**: When every token counts
- **Maximum Portability**: Minimal dependencies
- **Standalone Integration**: External tools/systems
- **Progressive Disclosure**: Agent discovers operations incrementally
- **Learning/Exploration**: Clear, simple examples
- **Prototyping**: Quick standalone tests

---

## Usage Patterns

### Agent Progressive Discovery
```
1. Agent: "What can I do with tenants?"
2. Reads tooling/scripts/tenants/ directory
3. Discovers: list_tenants.py, get_tenant.py, create_tenant.py
4. Agent: "Here are the available operations..."
```

### Sequential Operations
```bash
# List all tenants
TENANT_ID=$(python list_tenants.py | grep "Setur" | awk '{print $1}')

# Get that tenant
python get_tenant.py $TENANT_ID

# Create fleet in that tenant
python ../fleets/create_fleet.py $TENANT_ID "New Fleet" "Description"
```

### Error Handling
All scripts:
- Return exit code 0 on success
- Return exit code 1 on failure
- Print errors to stderr
- Print results to stdout

```bash
if python create_tenant.py "Test Tenant"; then
    echo "Success!"
else
    echo "Failed!"
fi
```

---

## Integration with Other Patterns

### CLI Pattern
The CLI (in `../cli/`) provides same operations but:
- Higher context overhead
- Better UX (--help, flags, etc.)
- Dual output modes (JSON)
- Shared connection pooling

### MCP Server
The MCP Server (in `../mcp_server/`) wraps the CLI:
- Highest context overhead
- Standardized MCP protocol
- Multi-client support
- Context loss on every call

### Skills
Skills (in `../skills/`) wrap these scripts:
- Claude Code integration
- Auto-triggered by context
- Team-shareable
- Same low context as scripts

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

## Making Scripts Executable

```bash
# Make all scripts executable
chmod +x tenants/*.py
chmod +x fleets/*.py
chmod +x users/*.py

# Run directly
./tenants/list_tenants.py
```

---

## Troubleshooting

### Import Errors
```bash
# Ensure you have the Ada environment configured
# Scripts use imports from the main Ada project

# Check PYTHONPATH (scripts handle this automatically)
```

### Database Connection Errors
```bash
# Verify .env exists and has DATABASE_URL
cat ../../.env | grep DATABASE_URL

# Test with a simple script
python tenants/list_tenants.py
```

### Path Resolution Errors
```bash
# Scripts work from ANY directory
cd /tmp
python /home/user/Ada/tooling/scripts/tenants/list_tenants.py

# This works because of absolute path resolution
```

---

## Related Documentation

- [Main Tooling README](../README.md) - Pattern comparison
- [CLI Documentation](../cli/README.md) - Higher-level interface
- [MCP Server](../mcp_server/README.md) - MCP wrapper
- [Skills](../skills/README.md) - Claude Code integration
- [Ada Main Documentation](../../README.md) - Full platform overview

---

**Context Preservation Philosophy:** The fundamental design principle of this pattern is **progressive disclosure**. Unlike CLI or MCP patterns that load all functionality upfront, scripts allow agents to discover and load only what they need, when they need it. This compounds dramatically at scale—from dozens to hundreds of operations, the token savings become massive.
