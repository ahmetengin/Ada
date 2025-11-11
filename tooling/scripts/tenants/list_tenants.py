#!/usr/bin/env python3
"""
List all tenants in the Ada platform.

Usage:
    python list_tenants.py

Progressive Disclosure Pattern: Self-contained script with embedded database client.
"""

import asyncio
import sys
from pathlib import Path
from typing import List

# Resolve absolute path for imports (works from any directory)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from ada.models.tenant import Tenant
from ada.config import get_settings


async def list_tenants() -> List[Tenant]:
    """List all tenants from database."""
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
            result = await session.execute(
                select(Tenant).order_by(Tenant.created_at.desc())
            )
            tenants = list(result.scalars().all())
            return tenants
    finally:
        await engine.dispose()


def format_tenants(tenants: List[Tenant]) -> str:
    """Format tenants for human-readable output."""
    if not tenants:
        return "No tenants found."

    lines = [f"=== {len(tenants)} Tenant(s) ===\n"]

    # Header
    header = f"{'ID':<38} | {'Name':<30} | {'Description':<40} | {'Created At':<20}"
    lines.append(header)
    lines.append("-" * len(header))

    # Rows
    for tenant in tenants:
        created_at = tenant.created_at.strftime("%Y-%m-%d %H:%M:%S") if tenant.created_at else "N/A"
        description = (tenant.description or "")[:40]

        row = f"{str(tenant.id):<38} | {tenant.name:<30} | {description:<40} | {created_at:<20}"
        lines.append(row)

    return "\n".join(lines)


async def main():
    """Main execution."""
    try:
        tenants = await list_tenants()
        output = format_tenants(tenants)
        print(output)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
