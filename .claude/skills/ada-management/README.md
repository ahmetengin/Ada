# Ada Management Skill

Claude Code skill for autonomous management of the Ada multi-tenant agent platform.

## Overview

This skill provides progressive disclosure access to Ada platform operations. Instead of loading all functionality upfront, Claude discovers and loads only the scripts needed for specific operations, resulting in ~75% token savings compared to traditional approaches.

## Architecture

```
Claude (detects trigger) → Loads SKILL.md → Reads specific script → Executes → Returns result
```

**Progressive Disclosure Flow:**
1. User mentions Ada management task
2. Skill activates based on triggers
3. Claude reads SKILL.md instructions
4. Claude selects relevant script
5. Claude reads only that script (~150-250 lines)
6. Claude executes script
7. Process repeats for additional operations

## Installation

This skill is already integrated into the Ada repository. Claude Code will automatically discover it when working in this project.

### Manual Installation (if needed)

```bash
# Skill is located at:
# .claude/skills/ada-management/

# Structure:
# .claude/skills/ada-management/
# ├── SKILL.md          # Skill description and instructions
# └── README.md         # This file
#
# Scripts are in:
# tooling/scripts/
# ├── tenants/
# ├── fleets/
# └── users/
```

## Skill Triggers

The skill activates when Claude detects:
- "manage Ada tenants"
- "list Ada fleets"
- "create Ada tenant"
- "clone Ada fleet"
- "Ada platform operations"
- "check Ada database"
- "Ada multi-tenant"
- "Ada cloning strategies"
- "tenant-scoped unique IDs"

## Available Operations

### Tenant Operations
- **List Tenants**: View all organizations in Ada
- **Get Tenant**: Detailed information about a specific tenant
- **Create Tenant**: Add new organization to the platform

### Fleet Operations
- **List Fleets**: View fleets (all or by tenant)
- **Get Fleet**: Detailed fleet information
- **Create Fleet**: New fleet with ID generation strategy
- **Clone Fleet**: Duplicate fleet with unique ID generation

### User Operations
- **List Users**: View users (all or by tenant)
- **Create User**: Add new user to a tenant

## Usage Examples

### Example 1: List and Inspect
```
User: "Show me all Ada tenants"

Claude:
1. Skill activates (trigger: "Ada tenants")
2. Reads SKILL.md for instructions
3. Selects scripts/tenants/list_tenants.py
4. Executes and displays results

User: "Tell me about the first tenant"

Claude:
1. Already has tenant ID from previous result
2. Selects scripts/tenants/get_tenant.py (progressive!)
3. Executes with tenant ID
4. Displays detailed information
```

### Example 2: Create Fleet with Strategy
```
User: "Create a Mediterranean fleet for Setur Marinas"

Claude:
1. Needs tenant ID first
2. Reads scripts/tenants/list_tenants.py
3. Finds "Setur Marinas" tenant ID
4. Then reads scripts/fleets/create_fleet.py
5. Creates fleet with timestamp strategy
6. Displays created fleet details
```

### Example 3: Clone Fleet
```
User: "Clone the Aegean fleet preserving relationships"

Claude:
1. Reads scripts/fleets/list_fleets.py
2. Finds "Aegean fleet" ID
3. Then reads scripts/fleets/clone_fleet.py
4. Executes: clone_fleet.py <id> clone true
5. Displays cloned fleet with new unique ID
```

## ID Generation Strategies

Ada implements sophisticated tenant-scoped unique ID generation:

| Strategy | Format | Use Case |
|----------|--------|----------|
| timestamp | `mediterranean-fleet-abc123-1731312000-x7k9` | Default, time-based uniqueness |
| clone | `original-fleet-xyz-clone-1-abc123` | Lineage tracking |
| sequential | `fleet-00005-abc123` | Numbered sequences |
| slug | `fleet-main-fleet-abc123` | Human-readable |

## Progressive Disclosure Benefits

### Token Efficiency

**Traditional CLI Approach:**
```
Load entire CLI: ~1000+ lines
Execute operation: tenant list
Load entire CLI again: ~1000+ lines
Execute operation: tenant get
Load entire CLI again: ~1000+ lines
Execute operation: fleet create

Total: ~3000+ lines loaded
```

**Skills Progressive Approach:**
```
Load list_tenants.py: ~150 lines
Load get_tenant.py: ~120 lines
Load create_fleet.py: ~180 lines

Total: ~450 lines loaded (85% savings!)
```

### Context Preservation

Each script is isolated, so Claude:
- Loads only what's needed
- Preserves conversation context
- Avoids overwhelming the context window
- Can handle more operations in a single session

## Multi-Tenancy Support

All operations respect Ada's multi-tenant architecture:
- Tenant-scoped unique IDs
- Complete data isolation
- Relationship preservation within tenants
- Clone lineage tracking

## Best Practices

1. **Let Progressive Disclosure Work**: Don't ask to load all scripts upfront
2. **Verify IDs**: Always confirm tenant/fleet IDs before operations
3. **Choose Strategies**: Select appropriate ID generation for your use case
4. **Check Results**: Verify success before chaining operations
5. **Preserve Context**: Use clone strategy for tracking lineage

## Comparison with Other Patterns

| Pattern | Context Usage | Access Method | Best For |
|---------|---------------|---------------|----------|
| **Skills** (this) | ✅ Minimal (~450 lines) | Progressive discovery | Claude Code users |
| Scripts | ✅ Minimal (~450 lines) | Manual execution | Standalone use |
| CLI | ⚠️ Medium (~3000 lines) | Command-line | Direct access |
| MCP Server | ❌ High (~3000+ lines) | MCP protocol | Multi-client |

## Advantages

✅ **Context Preservation**: ~75% token reduction vs CLI
✅ **Autonomous Activation**: Claude detects and triggers automatically
✅ **Progressive Discovery**: Load operations incrementally
✅ **Team Sharing**: Git-versioned, shareable across teams
✅ **Claude Code Native**: Designed for Claude Code workflow
✅ **Multi-Tenancy**: Full support for Ada's architecture

## Disadvantages

❌ **Claude Code Only**: Requires Claude Code environment
❌ **Learning Curve**: Team must understand skill system
❌ **Platform Specific**: Not portable to other environments

## When to Use This Skill

Use this skill when:
- Working in Claude Code
- Context window is critical
- Need autonomous operation discovery
- Team collaboration on Ada management
- Progressive loading is beneficial

Don't use when:
- Need MCP standard access → Use MCP Server
- Direct CLI preferred → Use Ada CLI
- Maximum portability needed → Use Scripts directly

## Environment Requirements

Requires:
- Claude Code environment
- Ada repository
- Configured `.env` with database credentials
- Python 3.11+
- Ada dependencies installed

## Troubleshooting

### Skill Not Activating
- Check trigger words in SKILL.md
- Ensure `.claude/skills/ada-management/` exists
- Verify SKILL.md is properly formatted

### Script Execution Errors
- Verify `.env` configuration
- Check database connectivity
- Ensure Python dependencies installed
- See `tooling/scripts/README.md` for script troubleshooting

### Context Issues
- Skill is designed for low context usage
- If hitting limits, you may need to summarize results
- Progressive disclosure should prevent most issues

## Development

### Adding New Operations

1. Create script in `tooling/scripts/`
2. Update `SKILL.md` with new operation
3. Add to "Available Operations" section
4. Document usage patterns
5. Commit to git (skill auto-updates)

### Updating Skill Description

Edit `SKILL.md` to:
- Add new triggers
- Update operation lists
- Refine instructions
- Add examples

## Related Documentation

- [SKILL.md](./SKILL.md) - Skill instructions for Claude
- [Scripts Documentation](../../tooling/scripts/README.md) - Script details
- [Tooling Overview](../../tooling/README.md) - All patterns comparison
- [Ada Documentation](../../README.md) - Full platform docs
- [Claude Code Skills Guide](https://docs.claude.com/claude-code/skills) - Skills system

## Support

For issues or questions:
- Check `tooling/scripts/README.md` for script documentation
- See `tooling/README.md` for pattern comparison
- Review Ada main `README.md` for platform details

---

**Progressive Disclosure Philosophy**: This skill embodies the core principle that agents should discover and load functionality incrementally, preserving context by loading only what's needed when it's needed. For Ada's complex multi-tenant operations, this approach provides the most efficient way to manage the platform while maintaining conversational context.
