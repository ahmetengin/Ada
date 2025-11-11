#!/usr/bin/env python3
"""
Ada CLI - Command-line interface for Ada multi-tenant agent platform.

Provides direct database access for all Ada operations with dual output modes.
"""

import asyncio
import sys
from pathlib import Path

import click

# Add parent directory to path for ada imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from client import AdaClient
from formatting import OutputFormatter


def run_async(coro):
    """Run async function synchronously."""
    return asyncio.run(coro)


@click.group()
@click.option('--format', type=click.Choice(['human', 'json']), default='human', help='Output format')
@click.pass_context
def cli(ctx, format):
    """Ada CLI - Multi-tenant agent platform management."""
    ctx.ensure_object(dict)
    ctx.obj['format'] = format
    ctx.obj['formatter'] = OutputFormatter(format)
    ctx.obj['client'] = AdaClient()


# ==================== Database Commands ====================

@cli.group()
def db():
    """Database operations."""
    pass


@db.command()
@click.pass_context
def health(ctx):
    """Check database health and connectivity."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _health():
        health_data = await client.health_check()
        return formatter.format_health(health_data)

    result = run_async(_health())
    click.echo(result)


@db.command()
@click.pass_context
def stats(ctx):
    """Get comprehensive database statistics."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _stats():
        stats_data = await client.get_stats()
        return formatter.format_stats(stats_data)

    result = run_async(_stats())
    click.echo(result)


# ==================== Tenant Commands ====================

@cli.group()
def tenant():
    """Tenant management operations."""
    pass


@tenant.command('list')
@click.pass_context
def tenant_list(ctx):
    """List all tenants."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _list():
        tenants = await client.list_tenants()
        return formatter.output(tenants)

    result = run_async(_list())
    click.echo(result)


@tenant.command('get')
@click.argument('tenant_id')
@click.pass_context
def tenant_get(ctx, tenant_id):
    """Get tenant by ID."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _get():
        tenant = await client.get_tenant(tenant_id)
        if tenant:
            return formatter.output(tenant)
        else:
            return formatter.format_error(f"Tenant not found: {tenant_id}")

    result = run_async(_get())
    click.echo(result)


@tenant.command('create')
@click.argument('name')
@click.option('--description', help='Tenant description')
@click.pass_context
def tenant_create(ctx, name, description):
    """Create a new tenant."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _create():
        tenant = await client.create_tenant(name, description)
        return formatter.format_success(f"Created tenant: {name}", tenant)

    result = run_async(_create())
    click.echo(result)


@tenant.command('update')
@click.argument('tenant_id')
@click.option('--name', help='New tenant name')
@click.option('--description', help='New description')
@click.pass_context
def tenant_update(ctx, tenant_id, name, description):
    """Update tenant details."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _update():
        tenant = await client.update_tenant(tenant_id, name, description)
        if tenant:
            return formatter.format_success(f"Updated tenant: {tenant_id}", tenant)
        else:
            return formatter.format_error(f"Tenant not found: {tenant_id}")

    result = run_async(_update())
    click.echo(result)


@tenant.command('delete')
@click.argument('tenant_id')
@click.confirmation_option(prompt='Are you sure you want to delete this tenant?')
@click.pass_context
def tenant_delete(ctx, tenant_id):
    """Delete a tenant (cascades to fleets and users)."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _delete():
        success = await client.delete_tenant(tenant_id)
        if success:
            return formatter.format_success(f"Deleted tenant: {tenant_id}")
        else:
            return formatter.format_error(f"Tenant not found: {tenant_id}")

    result = run_async(_delete())
    click.echo(result)


# ==================== Fleet Commands ====================

@cli.group()
def fleet():
    """Fleet management operations."""
    pass


@fleet.command('list')
@click.option('--tenant-id', help='Filter by tenant ID')
@click.pass_context
def fleet_list(ctx, tenant_id):
    """List fleets, optionally filtered by tenant."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _list():
        fleets = await client.list_fleets(tenant_id)
        return formatter.output(fleets)

    result = run_async(_list())
    click.echo(result)


@fleet.command('get')
@click.argument('fleet_id')
@click.pass_context
def fleet_get(ctx, fleet_id):
    """Get fleet by ID."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _get():
        fleet = await client.get_fleet(fleet_id)
        if fleet:
            return formatter.output(fleet)
        else:
            return formatter.format_error(f"Fleet not found: {fleet_id}")

    result = run_async(_get())
    click.echo(result)


@fleet.command('create')
@click.argument('name')
@click.option('--tenant-id', required=True, help='Tenant ID')
@click.option('--description', help='Fleet description')
@click.option(
    '--strategy',
    type=click.Choice(['timestamp', 'clone', 'sequential', 'slug']),
    default='timestamp',
    help='ID generation strategy'
)
@click.pass_context
def fleet_create(ctx, name, tenant_id, description, strategy):
    """Create a new fleet."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _create():
        fleet = await client.create_fleet(tenant_id, name, description, strategy)
        if fleet:
            return formatter.format_success(f"Created fleet: {name}", fleet)
        else:
            return formatter.format_error(f"Tenant not found: {tenant_id}")

    result = run_async(_create())
    click.echo(result)


@fleet.command('clone')
@click.argument('fleet_id')
@click.option(
    '--strategy',
    type=click.Choice(['timestamp', 'clone', 'sequential', 'slug']),
    default='clone',
    help='ID generation strategy'
)
@click.option('--preserve-relationships', is_flag=True, help='Preserve entity relationships')
@click.pass_context
def fleet_clone(ctx, fleet_id, strategy, preserve_relationships):
    """Clone an existing fleet."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _clone():
        cloned_fleet = await client.clone_fleet(fleet_id, strategy, preserve_relationships)
        if cloned_fleet:
            return formatter.format_success(f"Cloned fleet: {fleet_id}", cloned_fleet)
        else:
            return formatter.format_error(f"Fleet not found: {fleet_id}")

    result = run_async(_clone())
    click.echo(result)


@fleet.command('update')
@click.argument('fleet_id')
@click.option('--name', help='New fleet name')
@click.option('--description', help='New description')
@click.pass_context
def fleet_update(ctx, fleet_id, name, description):
    """Update fleet details."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _update():
        fleet = await client.update_fleet(fleet_id, name, description)
        if fleet:
            return formatter.format_success(f"Updated fleet: {fleet_id}", fleet)
        else:
            return formatter.format_error(f"Fleet not found: {fleet_id}")

    result = run_async(_update())
    click.echo(result)


@fleet.command('delete')
@click.argument('fleet_id')
@click.confirmation_option(prompt='Are you sure you want to delete this fleet?')
@click.pass_context
def fleet_delete(ctx, fleet_id):
    """Delete a fleet."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _delete():
        success = await client.delete_fleet(fleet_id)
        if success:
            return formatter.format_success(f"Deleted fleet: {fleet_id}")
        else:
            return formatter.format_error(f"Fleet not found: {fleet_id}")

    result = run_async(_delete())
    click.echo(result)


# ==================== User Commands ====================

@cli.group()
def user():
    """User management operations."""
    pass


@user.command('list')
@click.option('--tenant-id', help='Filter by tenant ID')
@click.pass_context
def user_list(ctx, tenant_id):
    """List users, optionally filtered by tenant."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _list():
        users = await client.list_users(tenant_id)
        return formatter.output(users)

    result = run_async(_list())
    click.echo(result)


@user.command('get')
@click.argument('user_id')
@click.pass_context
def user_get(ctx, user_id):
    """Get user by ID."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _get():
        user = await client.get_user(user_id)
        if user:
            return formatter.output(user)
        else:
            return formatter.format_error(f"User not found: {user_id}")

    result = run_async(_get())
    click.echo(result)


@user.command('create')
@click.argument('name')
@click.argument('email')
@click.option('--tenant-id', required=True, help='Tenant ID')
@click.pass_context
def user_create(ctx, name, email, tenant_id):
    """Create a new user."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _create():
        user = await client.create_user(tenant_id, name, email)
        if user:
            return formatter.format_success(f"Created user: {name}", user)
        else:
            return formatter.format_error(f"Tenant not found: {tenant_id}")

    result = run_async(_create())
    click.echo(result)


@user.command('delete')
@click.argument('user_id')
@click.confirmation_option(prompt='Are you sure you want to delete this user?')
@click.pass_context
def user_delete(ctx, user_id):
    """Delete a user."""
    client = ctx.obj['client']
    formatter = ctx.obj['formatter']

    async def _delete():
        success = await client.delete_user(user_id)
        if success:
            return formatter.format_success(f"Deleted user: {user_id}")
        else:
            return formatter.format_error(f"User not found: {user_id}")

    result = run_async(_delete())
    click.echo(result)


if __name__ == '__main__':
    cli(obj={})
