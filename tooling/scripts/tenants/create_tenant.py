#!/usr/bin/env python3
"""
Create a new tenant in the Ada platform.

Usage:
    python create_tenant.py <name> [description]

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

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from ada.models.tenant import Tenant
from ada.config import get_settings


async def create_tenant(name: str, description: Optional[str] = None) -> Tenant:
    """Create a new tenant."""
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
            tenant = Tenant(name=name, description=description)
            session.add(tenant)
            await session.commit()
            await session.refresh(tenant)
            return tenant
    finally:
        await engine.dispose()


def format_tenant(tenant: Tenant) -> str:
    """Format created tenant for output."""
    lines = ["✅ Tenant created successfully!\n"]
    lines.append("=== Tenant Details ===")
    lines.append(f"ID: {tenant.id}")
    lines.append(f"Name: {tenant.name}")
    lines.append(f"Description: {tenant.description or 'N/A'}")

    if tenant.created_at:
        lines.append(f"Created At: {tenant.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


async def main():
    """Main execution."""
    if len(sys.argv) < 2:
        print("Usage: python create_tenant.py <name> [description]", file=sys.stderr)
        sys.exit(1)

    name = sys.argv[1]
    description = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        tenant = await create_tenant(name, description)
        output = format_tenant(tenant)
        print(output)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
