#!/usr/bin/env python3
"""
Create a new fleet for a tenant.

Usage:
    python create_fleet.py <tenant-id> <name> [description] [strategy]

Strategy options: timestamp (default), clone, sequential, slug

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

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import selectinload

from ada.models.tenant import Tenant
from ada.models.fleet import Fleet
from ada.utils.tenant_id_generator import TenantIDGenerator
from ada.config import get_settings


async def create_fleet(
    tenant_id: str,
    name: str,
    description: Optional[str] = None,
    strategy: str = "timestamp"
) -> Optional[Fleet]:
    """Create a new fleet."""
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
            # Verify tenant exists
            tenant_result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                return None

            # Generate tenant-unique ID based on strategy
            generator = TenantIDGenerator(tenant_id=tenant_id, resource_type="fleet")

            if strategy == "timestamp":
                tenant_unique_id = generator.generate_timestamp_based(base_name=name)
            elif strategy == "clone":
                tenant_unique_id = generator.generate_clone_based(
                    original_id="new",
                    clone_number=1
                )
            elif strategy == "sequential":
                # Get next sequence number
                count_result = await session.execute(
                    select(func.count(Fleet.id)).where(Fleet.tenant_id == tenant_id)
                )
                next_seq = count_result.scalar_one() + 1
                tenant_unique_id = generator.generate_sequential(sequence_number=next_seq)
            elif strategy == "slug":
                tenant_unique_id = generator.generate_slug_based(slug=name)
            else:
                tenant_unique_id = generator.generate_timestamp_based(base_name=name)

            fleet = Fleet(
                tenant_id=tenant_id,
                tenant_unique_id=tenant_unique_id,
                name=name,
                description=description,
            )
            session.add(fleet)
            await session.commit()
            await session.refresh(fleet)
            await session.refresh(fleet, ['tenant'])
            return fleet
    finally:
        await engine.dispose()


def format_fleet(fleet: Optional[Fleet]) -> str:
    """Format created fleet for output."""
    if not fleet:
        return "❌ Error: Tenant not found."

    lines = ["✅ Fleet created successfully!\n"]
    lines.append("=== Fleet Details ===")
    lines.append(f"ID: {fleet.id}")
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
    if len(sys.argv) < 3:
        print("Usage: python create_fleet.py <tenant-id> <name> [description] [strategy]", file=sys.stderr)
        print("Strategy options: timestamp (default), clone, sequential, slug", file=sys.stderr)
        sys.exit(1)

    tenant_id = sys.argv[1]
    name = sys.argv[2]
    description = sys.argv[3] if len(sys.argv) > 3 else None
    strategy = sys.argv[4] if len(sys.argv) > 4 else "timestamp"

    try:
        fleet = await create_fleet(tenant_id, name, description, strategy)
        output = format_fleet(fleet)
        print(output)

        if not fleet:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
