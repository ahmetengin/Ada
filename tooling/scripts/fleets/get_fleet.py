#!/usr/bin/env python3
"""
Get details of a specific fleet by ID.

Usage:
    python get_fleet.py <fleet-id>

Progressive Disclosure Pattern: Self-contained script with embedded database client.
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

# Resolve absolute path for imports (works from any directory)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import selectinload

from ada.models.fleet import Fleet
from ada.config import get_settings


async def get_fleet(fleet_id: str) -> Optional[Fleet]:
    """Get fleet by ID."""
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
                select(Fleet)
                .options(selectinload(Fleet.tenant))
                .where(Fleet.id == fleet_id)
            )
            fleet = result.scalar_one_or_none()
            return fleet
    finally:
        await engine.dispose()


def format_fleet(fleet: Optional[Fleet]) -> str:
    """Format fleet for human-readable output."""
    if not fleet:
        return "Fleet not found."

    lines = ["=== Fleet Details ==="]
    lines.append(f"ID: {fleet.id}")
    lines.append(f"Tenant ID: {fleet.tenant_id}")
    lines.append(f"Tenant Name: {fleet.tenant.name if fleet.tenant else 'N/A'}")
    lines.append(f"Tenant Unique ID: {fleet.tenant_unique_id}")
    lines.append(f"Name: {fleet.name}")
    lines.append(f"Description: {fleet.description or 'N/A'}")

    if fleet.created_at:
        lines.append(f"Created At: {fleet.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if fleet.updated_at:
        lines.append(f"Updated At: {fleet.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


async def main():
    """Main execution."""
    if len(sys.argv) < 2:
        print("Usage: python get_fleet.py <fleet-id>", file=sys.stderr)
        sys.exit(1)

    fleet_id = sys.argv[1]

    try:
        fleet = await get_fleet(fleet_id)
        output = format_fleet(fleet)
        print(output)

        if not fleet:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
