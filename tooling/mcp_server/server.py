#!/usr/bin/env python3
"""
Ada MCP Server - Exposes Ada operations via Model Context Protocol.

Wraps the Ada CLI via subprocess for standardized MCP access.

Based on FastMCP framework.
"""

import subprocess
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("ada-platform")

# Path to CLI
CLI_PATH = Path(__file__).resolve().parent.parent / "cli" / "ada_cli.py"


def run_cli_command(args: List[str]) -> Dict[str, Any]:
    """
    Execute Ada CLI command and return JSON result.

    Args:
        args: CLI command arguments

    Returns:
        Parsed JSON response from CLI
    """
    cmd = ["python", str(CLI_PATH), "--format", "json"] + args

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )

        # Parse JSON output
        output = result.stdout.strip()
        if output:
            return json.loads(output)
        else:
            return {"success": True}

    except subprocess.CalledProcessError as e:
        error_output = e.stderr.strip() if e.stderr else str(e)
        return {"error": error_output, "success": False}
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out after 30 seconds", "success": False}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON response: {e}", "success": False, "raw_output": result.stdout}
    except Exception as e:
        return {"error": str(e), "success": False}


# ==================== Database Tools ====================

@mcp.tool()
def ada_db_health() -> Dict[str, Any]:
    """
    Check Ada database health and connectivity.

    Returns database status and resource counts.
    """
    return run_cli_command(["db", "health"])


@mcp.tool()
def ada_db_stats() -> Dict[str, Any]:
    """
    Get comprehensive Ada database statistics.

    Returns total counts and tenant breakdown.
    """
    return run_cli_command(["db", "stats"])


# ==================== Tenant Tools ====================

@mcp.tool()
def ada_tenant_list() -> List[Dict[str, Any]]:
    """
    List all tenants in the Ada platform.

    Returns list of tenant objects with IDs, names, and descriptions.
    """
    return run_cli_command(["tenant", "list"])


@mcp.tool()
def ada_tenant_get(tenant_id: str) -> Dict[str, Any]:
    """
    Get details of a specific tenant by ID.

    Args:
        tenant_id: The UUID of the tenant

    Returns:
        Tenant object with full details
    """
    return run_cli_command(["tenant", "get", tenant_id])


@mcp.tool()
def ada_tenant_create(name: str, description: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new tenant in the Ada platform.

    Args:
        name: Tenant name (e.g., "Setur Marinas")
        description: Optional description

    Returns:
        Created tenant object
    """
    args = ["tenant", "create", name]
    if description:
        args.extend(["--description", description])

    return run_cli_command(args)


@mcp.tool()
def ada_tenant_update(
    tenant_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update tenant details.

    Args:
        tenant_id: The UUID of the tenant
        name: New tenant name (optional)
        description: New description (optional)

    Returns:
        Updated tenant object
    """
    args = ["tenant", "update", tenant_id]
    if name:
        args.extend(["--name", name])
    if description:
        args.extend(["--description", description])

    return run_cli_command(args)


@mcp.tool()
def ada_tenant_delete(tenant_id: str) -> Dict[str, Any]:
    """
    Delete a tenant (cascades to fleets and users).

    WARNING: This is destructive and cannot be undone.

    Args:
        tenant_id: The UUID of the tenant

    Returns:
        Success/failure status
    """
    # Note: CLI prompts for confirmation, but we'll skip it in MCP context
    # In production, you'd want to handle this differently
    return run_cli_command(["tenant", "delete", tenant_id])


# ==================== Fleet Tools ====================

@mcp.tool()
def ada_fleet_list(tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List fleets, optionally filtered by tenant.

    Args:
        tenant_id: Optional tenant UUID to filter by

    Returns:
        List of fleet objects
    """
    args = ["fleet", "list"]
    if tenant_id:
        args.extend(["--tenant-id", tenant_id])

    return run_cli_command(args)


@mcp.tool()
def ada_fleet_get(fleet_id: str) -> Dict[str, Any]:
    """
    Get details of a specific fleet by ID.

    Args:
        fleet_id: The UUID of the fleet

    Returns:
        Fleet object with full details including tenant info
    """
    return run_cli_command(["fleet", "get", fleet_id])


@mcp.tool()
def ada_fleet_create(
    name: str,
    tenant_id: str,
    description: Optional[str] = None,
    strategy: str = "timestamp"
) -> Dict[str, Any]:
    """
    Create a new fleet for a tenant.

    Args:
        name: Fleet name
        tenant_id: The UUID of the tenant
        description: Optional description
        strategy: ID generation strategy (timestamp, clone, sequential, slug)

    Returns:
        Created fleet object with tenant-scoped unique ID
    """
    args = ["fleet", "create", name, "--tenant-id", tenant_id]
    if description:
        args.extend(["--description", description])
    args.extend(["--strategy", strategy])

    return run_cli_command(args)


@mcp.tool()
def ada_fleet_clone(
    fleet_id: str,
    strategy: str = "clone",
    preserve_relationships: bool = False
) -> Dict[str, Any]:
    """
    Clone an existing fleet with Ada's unique ID system.

    Args:
        fleet_id: The UUID of the fleet to clone
        strategy: ID generation strategy (clone, timestamp, sequential, slug)
        preserve_relationships: Whether to preserve entity relationships

    Returns:
        Cloned fleet object with new unique ID
    """
    args = ["fleet", "clone", fleet_id, "--strategy", strategy]
    if preserve_relationships:
        args.append("--preserve-relationships")

    return run_cli_command(args)


@mcp.tool()
def ada_fleet_update(
    fleet_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update fleet details.

    Args:
        fleet_id: The UUID of the fleet
        name: New fleet name (optional)
        description: New description (optional)

    Returns:
        Updated fleet object
    """
    args = ["fleet", "update", fleet_id]
    if name:
        args.extend(["--name", name])
    if description:
        args.extend(["--description", description])

    return run_cli_command(args)


@mcp.tool()
def ada_fleet_delete(fleet_id: str) -> Dict[str, Any]:
    """
    Delete a fleet.

    Args:
        fleet_id: The UUID of the fleet

    Returns:
        Success/failure status
    """
    return run_cli_command(["fleet", "delete", fleet_id])


# ==================== User Tools ====================

@mcp.tool()
def ada_user_list(tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List users, optionally filtered by tenant.

    Args:
        tenant_id: Optional tenant UUID to filter by

    Returns:
        List of user objects
    """
    args = ["user", "list"]
    if tenant_id:
        args.extend(["--tenant-id", tenant_id])

    return run_cli_command(args)


@mcp.tool()
def ada_user_get(user_id: str) -> Dict[str, Any]:
    """
    Get details of a specific user by ID.

    Args:
        user_id: The UUID of the user

    Returns:
        User object with full details including tenant info
    """
    return run_cli_command(["user", "get", user_id])


@mcp.tool()
def ada_user_create(
    name: str,
    email: str,
    tenant_id: str
) -> Dict[str, Any]:
    """
    Create a new user for a tenant.

    Args:
        name: User name
        email: User email address
        tenant_id: The UUID of the tenant

    Returns:
        Created user object with tenant-scoped unique ID
    """
    return run_cli_command(["user", "create", name, email, "--tenant-id", tenant_id])


@mcp.tool()
def ada_user_delete(user_id: str) -> Dict[str, Any]:
    """
    Delete a user.

    Args:
        user_id: The UUID of the user

    Returns:
        Success/failure status
    """
    return run_cli_command(["user", "delete", user_id])


# ==================== Server Lifecycle ====================

if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
