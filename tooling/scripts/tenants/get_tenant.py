#!/usr/bin/env python3
"""
Get details of a specific tenant by ID.

Usage:
    python get_tenant.py <tenant-id>

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

from ada.models.tenant import Tenant
from ada.config import get_settings


async def get_tenant(tenant_id: str) -> Optional[Tenant]:
    """Get tenant by ID."""
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
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = result.scalar_one_or_none()
            return tenant
    finally:
        await engine.dispose()


def format_tenant(tenant: Optional[Tenant]) -> str:
    """Format tenant for human-readable output."""
    if not tenant:
        return "Tenant not found."

    lines = ["=== Tenant Details ==="]
    lines.append(f"ID: {tenant.id}")
    lines.append(f"Name: {tenant.name}")
    lines.append(f"Description: {tenant.description or 'N/A'}")

    if tenant.created_at:
        lines.append(f"Created At: {tenant.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if tenant.updated_at:
        lines.append(f"Updated At: {tenant.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


async def main():
    """Main execution."""
    if len(sys.argv) < 2:
        print("Usage: python get_tenant.py <tenant-id>", file=sys.stderr)
        sys.exit(1)

    tenant_id = sys.argv[1]

    try:
        tenant = await get_tenant(tenant_id)
        output = format_tenant(tenant)
        print(output)

        if not tenant:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
