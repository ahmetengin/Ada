# Ada Management Skill

Autonomous management of the Ada multi-tenant agent platform. This skill provides progressive disclosure access to Ada's tenant, fleet, and user operations.

## Triggers

Activate this skill when the user mentions:
- "manage Ada tenants"
- "list Ada fleets"
- "create Ada tenant"
- "clone Ada fleet"
- "Ada platform operations"
- "check Ada database"
- "Ada multi-tenant"
- "Ada cloning strategies"
- "tenant-scoped unique IDs"

## Capabilities

This skill provides access to Ada's multi-tenant platform operations through self-contained Python scripts. Each script is isolated and loads only the functionality needed for its specific operation, ensuring minimal context consumption.

### Available Operations

**Tenant Management:**
- `scripts/tenants/list_tenants.py` - List all tenants in the platform
- `scripts/tenants/get_tenant.py <tenant-id>` - Get tenant details
- `scripts/tenants/create_tenant.py <name> [description]` - Create new tenant

**Fleet Management:**
- `scripts/fleets/list_fleets.py [tenant-id]` - List fleets (optionally by tenant)
- `scripts/fleets/get_fleet.py <fleet-id>` - Get fleet details
- `scripts/fleets/create_fleet.py <tenant-id> <name> [description] [strategy]` - Create fleet with ID strategy
- `scripts/fleets/clone_fleet.py <fleet-id> [strategy] [preserve-relationships]` - Clone fleet with unique ID

**User Management:**
- `scripts/users/list_users.py [tenant-id]` - List users (optionally by tenant)
- `scripts/users/create_user.py <tenant-id> <name> <email>` - Create new user

## ID Generation Strategies

Ada implements sophisticated tenant-scoped unique ID generation:

- **timestamp**: `mediterranean-fleet-abc123-1731312000-x7k9` (default)
- **clone**: `original-fleet-xyz-clone-1-abc123` (for cloning)
- **sequential**: `fleet-00005-abc123` (numbered sequence)
- **slug**: `fleet-main-fleet-abc123` (human-readable)

Use these strategies when creating or cloning fleets to control ID format.

## Usage Instructions

### Progressive Disclosure Pattern

**IMPORTANT:** Only load the script you need for the current operation. Do NOT load multiple scripts upfront.

1. **Discover**: User asks about Ada operations
2. **Select**: Choose the specific script needed
3. **Load**: Read only that script file
4. **Execute**: Run the script with appropriate arguments
5. **Repeat**: If another operation is needed, load that script

### Example Workflows

**Workflow 1: List and Inspect**
```
User: "Show me all Ada tenants"
→ Read scripts/tenants/list_tenants.py
→ Execute: python list_tenants.py

User: "Tell me more about the first one"
→ Read scripts/tenants/get_tenant.py (only now!)
→ Execute: python get_tenant.py <tenant-id>
```

**Workflow 2: Create Fleet with Strategy**
```
User: "Create a new fleet for Setur Marinas"
→ First, read scripts/tenants/list_tenants.py to find tenant ID
→ Then, read scripts/fleets/create_fleet.py
→ Execute: python create_fleet.py <tenant-id> "Fleet Name" "Description" timestamp
```

**Workflow 3: Clone with Preservation**
```
User: "Clone the Mediterranean fleet"
→ Read scripts/fleets/list_fleets.py to find fleet ID
→ Then, read scripts/fleets/clone_fleet.py
→ Execute: python clone_fleet.py <fleet-id> clone true
```

## Multi-Tenancy Awareness

Ada is a **multi-tenant platform**. Always ensure:
- Operations are scoped to the correct tenant
- Tenant IDs are verified before creating resources
- Unique IDs are generated with tenant context
- Relationships are preserved within tenant boundaries

## Script Characteristics

All scripts:
- Are self-contained with embedded database clients
- Use absolute path resolution (work from any directory)
- Return exit code 0 on success, 1 on failure
- Print results to stdout, errors to stderr
- Include detailed formatted output

## Best Practices

1. **Progressive Loading**: Load scripts incrementally as needed
2. **Verify IDs**: Always verify tenant/fleet IDs exist before operations
3. **Choose Strategies**: Select appropriate ID generation strategy for context
4. **Preserve Context**: Use clone strategy for lineage tracking
5. **Check Results**: Always verify operation success before proceeding

## Error Handling

Scripts return clear error messages:
```
❌ Error: Tenant not found: invalid-id
```

Always check script output for success indicators (✅) or error messages (❌).

## Integration with Ada Platform

These scripts directly access:
- **PostgreSQL**: Tenant, fleet, and user data
- **Tenant ID Generator**: Multi-strategy unique ID generation
- **Cloning System**: Entity duplication with lineage tracking
- **SQLAlchemy ORM**: Async database operations

## Context Efficiency

**Token Savings:** By loading only the script needed (150-250 lines), this pattern uses ~75% fewer tokens than loading the entire CLI (1000+ lines).

**Example:**
- List tenants: ~150 lines
- Get tenant details: ~120 lines
- Create fleet: ~180 lines
- **Total: ~450 lines vs ~3000+ for full CLI**

## Team Sharing

This skill is git-versioned and shareable across teams. All scripts are in the repository under `tooling/scripts/`.

## Documentation

For detailed information about each operation:
- See `tooling/scripts/README.md` for complete script documentation
- See `tooling/README.md` for pattern comparison
- See main `README.md` for full Ada platform overview

## When NOT to Use This Skill

- If the user is asking about Ada's **architecture** or **design** → Use general knowledge
- If the user wants to **modify Ada's code** → Use standard code editing
- If the user needs **real-time monitoring** → Recommend the CLI or MCP patterns
- If operations require **transaction guarantees** → Each script is isolated

## Example Interactions

**User:** "List all tenants in Ada"
**Claude:** *Reads scripts/tenants/list_tenants.py, executes it, displays formatted results*

**User:** "Create a tenant for Blue Voyage"
**Claude:** *Reads scripts/tenants/create_tenant.py, executes with name and description*

**User:** "Clone the Aegean fleet using clone strategy"
**Claude:** *Reads scripts/fleets/list_fleets.py to find ID, then scripts/fleets/clone_fleet.py to clone*

---

Remember: This skill prioritizes **context preservation** through **progressive disclosure**. Only load what you need, when you need it!
