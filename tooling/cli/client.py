"""
Ada CLI Database Client

Provides direct database access for CLI operations.
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import sys

# Add parent directory to path for ada imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import selectinload

from ada.models.base import Base
from ada.models.tenant import Tenant
from ada.models.fleet import Fleet
from ada.models.user import User
from ada.config import get_settings
from ada.utils.tenant_id_generator import TenantIDGenerator
from ada.utils.cloning import clone_entity


class AdaClient:
    """Client for Ada database operations."""

    def __init__(self):
        self.settings = get_settings()
        self.engine = create_async_engine(
            self.settings.database_url,
            echo=False,
            pool_pre_ping=True,
        )
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def close(self):
        """Close database connections."""
        await self.engine.dispose()

    @asynccontextmanager
    async def session(self):
        """Get async database session."""
        async with self.async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    # ==================== Health & Stats ====================

    async def health_check(self) -> Dict[str, Any]:
        """Check database connectivity and health."""
        try:
            async with self.session() as session:
                result = await session.execute(select(func.count(Tenant.id)))
                tenant_count = result.scalar_one()

                result = await session.execute(select(func.count(Fleet.id)))
                fleet_count = result.scalar_one()

                result = await session.execute(select(func.count(User.id)))
                user_count = result.scalar_one()

                return {
                    "status": "healthy",
                    "database": "connected",
                    "counts": {
                        "tenants": tenant_count,
                        "fleets": fleet_count,
                        "users": user_count,
                    }
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }

    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        async with self.session() as session:
            # Tenant stats
            tenant_result = await session.execute(select(func.count(Tenant.id)))
            tenant_count = tenant_result.scalar_one()

            # Fleet stats
            fleet_result = await session.execute(select(func.count(Fleet.id)))
            fleet_count = fleet_result.scalar_one()

            # User stats
            user_result = await session.execute(select(func.count(User.id)))
            user_count = user_result.scalar_one()

            # Fleets per tenant
            fleets_per_tenant = await session.execute(
                select(Tenant.name, func.count(Fleet.id).label('fleet_count'))
                .join(Fleet, Fleet.tenant_id == Tenant.id, isouter=True)
                .group_by(Tenant.id, Tenant.name)
            )

            tenant_fleet_stats = [
                {"tenant": row.name, "fleet_count": row.fleet_count}
                for row in fleets_per_tenant.all()
            ]

            return {
                "totals": {
                    "tenants": tenant_count,
                    "fleets": fleet_count,
                    "users": user_count,
                },
                "tenant_breakdown": tenant_fleet_stats,
            }

    # ==================== Tenant Operations ====================

    async def list_tenants(self) -> List[Tenant]:
        """List all tenants."""
        async with self.session() as session:
            result = await session.execute(
                select(Tenant).order_by(Tenant.created_at.desc())
            )
            return list(result.scalars().all())

    async def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        async with self.session() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            return result.scalar_one_or_none()

    async def create_tenant(self, name: str, description: Optional[str] = None) -> Tenant:
        """Create a new tenant."""
        async with self.session() as session:
            tenant = Tenant(name=name, description=description)
            session.add(tenant)
            await session.flush()
            await session.refresh(tenant)
            return tenant

    async def update_tenant(
        self,
        tenant_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Tenant]:
        """Update tenant details."""
        async with self.session() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = result.scalar_one_or_none()

            if not tenant:
                return None

            if name is not None:
                tenant.name = name
            if description is not None:
                tenant.description = description

            await session.flush()
            await session.refresh(tenant)
            return tenant

    async def delete_tenant(self, tenant_id: str) -> bool:
        """Delete a tenant (cascades to fleets and users)."""
        async with self.session() as session:
            result = await session.execute(
                delete(Tenant).where(Tenant.id == tenant_id)
            )
            return result.rowcount > 0

    # ==================== Fleet Operations ====================

    async def list_fleets(self, tenant_id: Optional[str] = None) -> List[Fleet]:
        """List fleets, optionally filtered by tenant."""
        async with self.session() as session:
            query = select(Fleet).options(selectinload(Fleet.tenant))

            if tenant_id:
                query = query.where(Fleet.tenant_id == tenant_id)

            query = query.order_by(Fleet.created_at.desc())
            result = await session.execute(query)
            return list(result.scalars().all())

    async def get_fleet(self, fleet_id: str) -> Optional[Fleet]:
        """Get fleet by ID."""
        async with self.session() as session:
            result = await session.execute(
                select(Fleet)
                .options(selectinload(Fleet.tenant))
                .where(Fleet.id == fleet_id)
            )
            return result.scalar_one_or_none()

    async def create_fleet(
        self,
        tenant_id: str,
        name: str,
        description: Optional[str] = None,
        strategy: str = "timestamp"
    ) -> Optional[Fleet]:
        """Create a new fleet with specified ID generation strategy."""
        async with self.session() as session:
            # Verify tenant exists
            tenant_result = await session.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                return None

            # Generate tenant-unique ID
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
            await session.flush()
            await session.refresh(fleet)
            await session.refresh(fleet, ['tenant'])
            return fleet

    async def clone_fleet(
        self,
        fleet_id: str,
        strategy: str = "clone",
        preserve_relationships: bool = False
    ) -> Optional[Fleet]:
        """Clone an existing fleet."""
        async with self.session() as session:
            # Get original fleet
            result = await session.execute(
                select(Fleet).where(Fleet.id == fleet_id)
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

            await session.flush()
            await session.refresh(cloned_fleet)
            await session.refresh(cloned_fleet, ['tenant'])
            return cloned_fleet

    async def update_fleet(
        self,
        fleet_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Fleet]:
        """Update fleet details."""
        async with self.session() as session:
            result = await session.execute(
                select(Fleet).where(Fleet.id == fleet_id)
            )
            fleet = result.scalar_one_or_none()

            if not fleet:
                return None

            if name is not None:
                fleet.name = name
            if description is not None:
                fleet.description = description

            await session.flush()
            await session.refresh(fleet)
            return fleet

    async def delete_fleet(self, fleet_id: str) -> bool:
        """Delete a fleet."""
        async with self.session() as session:
            result = await session.execute(
                delete(Fleet).where(Fleet.id == fleet_id)
            )
            return result.rowcount > 0

    # ==================== User Operations ====================

    async def list_users(self, tenant_id: Optional[str] = None) -> List[User]:
        """List users, optionally filtered by tenant."""
        async with self.session() as session:
            query = select(User).options(selectinload(User.tenant))

            if tenant_id:
                query = query.where(User.tenant_id == tenant_id)

            query = query.order_by(User.created_at.desc())
            result = await session.execute(query)
            return list(result.scalars().all())

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        async with self.session() as session:
            result = await session.execute(
                select(User)
                .options(selectinload(User.tenant))
                .where(User.id == user_id)
            )
            return result.scalar_one_or_none()

    async def create_user(
        self,
        tenant_id: str,
        name: str,
        email: str,
    ) -> Optional[User]:
        """Create a new user."""
        async with self.session() as session:
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
            await session.flush()
            await session.refresh(user)
            await session.refresh(user, ['tenant'])
            return user

    async def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        async with self.session() as session:
            result = await session.execute(
                delete(User).where(User.id == user_id)
            )
            return result.rowcount > 0
