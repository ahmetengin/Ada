#!/usr/bin/env python3
"""
Clone an existing fleet.

Usage:
    python clone_fleet.py <fleet-id> [strategy] [preserve-relationships]

Strategy options: clone (default), timestamp, sequential, slug
Preserve relationships: true/false (default: false)

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
from ada.utils.cloning import clone_entity
from ada.config import get_settings


async def clone_fleet(
    fleet_id: str,
    strategy: str = "clone",
    preserve_relationships: bool = False
) -> Optional[Fleet]:
    """Clone an existing fleet."""
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
            # Get original fleet
            result = await session.execute(
                select(Fleet)
                .options(selectinload(Fleet.tenant))
                .where(Fleet.id == fleet_id)
            )
            original_fleet = result.scalar_one_or_none()

            if not original_fleet:
                return None

            # Clone the entity
            cloned_fleet = await clone_entity(
                session=session,
                entity=original_fleet,
                strategy=strategy,
                preserve_relationships=preserve_relationships,
            )

            await session.commit()
            await session.refresh(cloned_fleet)
            await session.refresh(cloned_fleet, ['tenant'])
            return cloned_fleet
    finally:
        await engine.dispose()


def format_cloned_fleet(fleet: Optional[Fleet], original_id: str) -> str:
    """Format cloned fleet for output."""
    if not fleet:
        return f"❌ Error: Fleet not found: {original_id}"

    lines = ["✅ Fleet cloned successfully!\n"]
    lines.append("=== Cloned Fleet Details ===")
    lines.append(f"ID: {fleet.id}")
    lines.append(f"Original Fleet ID: {original_id}")
    lines.append(f"Tenant ID: {fleet.tenant_id}")
    lines.append(f"Tenant Name: {fleet.tenant.name if fleet.tenant else 'N/A'}")
    lines.append(f"Tenant Unique ID: {fleet.tenant_unique_id}")
    lines.append(f"Name: {fleet.name}")
    lines.append(f"Description: {fleet.description or 'N/A'}")

    if fleet.created_at:
        lines.append(f"Created At: {fleet.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


async def main():
    """Main execution."""
    if len(sys.argv) < 2:
        print("Usage: python clone_fleet.py <fleet-id> [strategy] [preserve-relationships]", file=sys.stderr)
        print("Strategy options: clone (default), timestamp, sequential, slug", file=sys.stderr)
        print("Preserve relationships: true/false (default: false)", file=sys.stderr)
        sys.exit(1)

    fleet_id = sys.argv[1]
    strategy = sys.argv[2] if len(sys.argv) > 2 else "clone"
    preserve_relationships = sys.argv[3].lower() == "true" if len(sys.argv) > 3 else False

    try:
        cloned_fleet = await clone_fleet(fleet_id, strategy, preserve_relationships)
        output = format_cloned_fleet(cloned_fleet, fleet_id)
        print(output)

        if not cloned_fleet:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
