#!/usr/bin/env python3
"""
Create a new user for a tenant.

Usage:
    python create_user.py <tenant-id> <name> <email>

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

from ada.models.tenant import Tenant
from ada.models.user import User
from ada.utils.tenant_id_generator import TenantIDGenerator
from ada.config import get_settings


async def create_user(tenant_id: str, name: str, email: str) -> Optional[User]:
    """Create a new user."""
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

            # Generate tenant-unique ID
            generator = TenantIDGenerator(tenant_id=tenant_id, resource_type="user")
            tenant_unique_id = generator.generate_timestamp_based(base_name=name)

            user = User(
                tenant_id=tenant_id,
                tenant_unique_id=tenant_unique_id,
                name=name,
                email=email,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            await session.refresh(user, ['tenant'])
            return user
    finally:
        await engine.dispose()


def format_user(user: Optional[User]) -> str:
    """Format created user for output."""
    if not user:
        return "❌ Error: Tenant not found."

    lines = ["✅ User created successfully!\n"]
    lines.append("=== User Details ===")
    lines.append(f"ID: {user.id}")
    lines.append(f"Tenant ID: {user.tenant_id}")
    lines.append(f"Tenant Name: {user.tenant.name if user.tenant else 'N/A'}")
    lines.append(f"Tenant Unique ID: {user.tenant_unique_id}")
    lines.append(f"Name: {user.name}")
    lines.append(f"Email: {user.email}")

    if user.created_at:
        lines.append(f"Created At: {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


async def main():
    """Main execution."""
    if len(sys.argv) < 4:
        print("Usage: python create_user.py <tenant-id> <name> <email>", file=sys.stderr)
        sys.exit(1)

    tenant_id = sys.argv[1]
    name = sys.argv[2]
    email = sys.argv[3]

    try:
        user = await create_user(tenant_id, name, email)
        output = format_user(user)
        print(output)

        if not user:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
