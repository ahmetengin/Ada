#!/usr/bin/env python3
"""
List fleets, optionally filtered by tenant.

Usage:
    python list_fleets.py [tenant-id]

Progressive Disclosure Pattern: Self-contained script with embedded database client.
"""

import asyncio
import sys
from pathlib import Path
from typing import List, Optional

# Resolve absolute path for imports (works from any directory)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import selectinload

from ada.models.fleet import Fleet
from ada.config import get_settings


async def list_fleets(tenant_id: Optional[str] = None) -> List[Fleet]:
    """List fleets, optionally filtered by tenant."""
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
            query = select(Fleet).options(selectinload(Fleet.tenant))

            if tenant_id:
                query = query.where(Fleet.tenant_id == tenant_id)

            query = query.order_by(Fleet.created_at.desc())
            result = await session.execute(query)
            fleets = list(result.scalars().all())
            return fleets
    finally:
        await engine.dispose()


def format_fleets(fleets: List[Fleet]) -> str:
    """Format fleets for human-readable output."""
    if not fleets:
        return "No fleets found."

    lines = [f"=== {len(fleets)} Fleet(s) ===\n"]

    # Header
    header = f"{'ID':<38} | {'Tenant':<20} | {'Name':<25} | {'Tenant Unique ID':<40} | {'Created At':<20}"
    lines.append(header)
    lines.append("-" * len(header))

    # Rows
    for fleet in fleets:
        created_at = fleet.created_at.strftime("%Y-%m-%d %H:%M:%S") if fleet.created_at else "N/A"
        tenant_name = fleet.tenant.name if fleet.tenant else "N/A"
        tenant_unique_id = fleet.tenant_unique_id[:40] if fleet.tenant_unique_id else "N/A"

        row = f"{str(fleet.id):<38} | {tenant_name:<20} | {fleet.name:<25} | {tenant_unique_id:<40} | {created_at:<20}"
        lines.append(row)

    return "\n".join(lines)


async def main():
    """Main execution."""
    tenant_id = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        fleets = await list_fleets(tenant_id)
        output = format_fleets(fleets)
        print(output)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
