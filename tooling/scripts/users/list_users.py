#!/usr/bin/env python3
"""
List users, optionally filtered by tenant.

Usage:
    python list_users.py [tenant-id]

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

from ada.models.user import User
from ada.config import get_settings


async def list_users(tenant_id: Optional[str] = None) -> List[User]:
    """List users, optionally filtered by tenant."""
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
            query = select(User).options(selectinload(User.tenant))

            if tenant_id:
                query = query.where(User.tenant_id == tenant_id)

            query = query.order_by(User.created_at.desc())
            result = await session.execute(query)
            users = list(result.scalars().all())
            return users
    finally:
        await engine.dispose()


def format_users(users: List[User]) -> str:
    """Format users for human-readable output."""
    if not users:
        return "No users found."

    lines = [f"=== {len(users)} User(s) ===\n"]

    # Header
    header = f"{'ID':<38} | {'Tenant':<20} | {'Name':<25} | {'Email':<30} | {'Created At':<20}"
    lines.append(header)
    lines.append("-" * len(header))

    # Rows
    for user in users:
        created_at = user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else "N/A"
        tenant_name = user.tenant.name if user.tenant else "N/A"

        row = f"{str(user.id):<38} | {tenant_name:<20} | {user.name:<25} | {user.email:<30} | {created_at:<20}"
        lines.append(row)

    return "\n".join(lines)


async def main():
    """Main execution."""
    tenant_id = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        users = await list_users(tenant_id)
        output = format_users(users)
        print(output)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
