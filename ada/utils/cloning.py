"""Utilities for cloning entities within a tenant."""

import uuid
from typing import Any, Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ada.models.base import TenantScopedModel
from ada.models.fleet import Fleet
from ada.models.user import User
from ada.utils.tenant_id_generator import TenantUniqueIdGenerator

T = TypeVar("T", bound=TenantScopedModel)


class EntityCloner:
    """
    Clone entities within a tenant with automatic tenant-scoped unique ID generation.

    This ensures proper data isolation and unique identification for cloned resources.
    """

    def __init__(self, session: AsyncSession):
        """Initialize cloner with database session."""
        self.session = session
        self.id_generator = TenantUniqueIdGenerator()

    async def clone_entity(
        self,
        entity: T,
        tenant_id: uuid.UUID,
        clone_number: Optional[int] = None,
        overrides: Optional[dict[str, Any]] = None,
    ) -> T:
        """
        Clone an entity within a tenant.

        Args:
            entity: The entity to clone
            tenant_id: The tenant ID
            clone_number: Optional clone number for tracking
            overrides: Optional dictionary of attributes to override

        Returns:
            The cloned entity with a new tenant_unique_id

        Example:
            >>> cloner = EntityCloner(session)
            >>> original_fleet = await session.get(Fleet, fleet_id)
            >>> cloned_fleet = await cloner.clone_entity(
            ...     original_fleet,
            ...     tenant_id,
            ...     clone_number=1,
            ...     overrides={"name": "Mediterranean Fleet - Clone 1"}
            ... )
        """
        # Generate new unique IDs
        new_id = uuid.uuid4()
        new_tenant_unique_id = self.id_generator.generate_clone_id(
            entity.tenant_unique_id,
            tenant_id,
            clone_number,
        )

        # Get entity class
        entity_class = type(entity)

        # Copy entity attributes
        entity_dict = {}
        for column in entity.__table__.columns:
            if column.name not in ["id", "tenant_unique_id", "created_at", "updated_at"]:
                entity_dict[column.name] = getattr(entity, column.name)

        # Apply overrides
        if overrides:
            entity_dict.update(overrides)

        # Create new entity
        entity_dict["id"] = new_id
        entity_dict["tenant_unique_id"] = new_tenant_unique_id

        cloned = entity_class(**entity_dict)

        # Add to session
        self.session.add(cloned)
        await self.session.flush()

        return cloned

    async def clone_fleet_with_users(
        self,
        fleet_id: uuid.UUID,
        tenant_id: uuid.UUID,
        new_fleet_name: Optional[str] = None,
        clone_users: bool = True,
    ) -> Fleet:
        """
        Clone a fleet and optionally all its users.

        Args:
            fleet_id: The ID of the fleet to clone
            tenant_id: The tenant ID
            new_fleet_name: Optional new name for the cloned fleet
            clone_users: Whether to clone associated users

        Returns:
            The cloned fleet

        Example:
            >>> cloner = EntityCloner(session)
            >>> cloned_fleet = await cloner.clone_fleet_with_users(
            ...     fleet_id=original_fleet_id,
            ...     tenant_id=tenant_id,
            ...     new_fleet_name="Mediterranean Fleet - Clone",
            ...     clone_users=True
            ... )
        """
        # Fetch original fleet with users
        stmt = (
            select(Fleet)
            .where(Fleet.id == fleet_id)
            .options(selectinload(Fleet.users))
        )
        result = await self.session.execute(stmt)
        original_fleet = result.scalar_one()

        # Clone the fleet
        overrides = {}
        if new_fleet_name:
            overrides["name"] = new_fleet_name

        cloned_fleet = await self.clone_entity(
            original_fleet,
            tenant_id,
            overrides=overrides,
        )

        # Clone users if requested
        if clone_users and original_fleet.users:
            for idx, user in enumerate(original_fleet.users, start=1):
                await self.clone_entity(
                    user,
                    tenant_id,
                    clone_number=idx,
                    overrides={"fleet_id": cloned_fleet.id},
                )

        await self.session.commit()
        await self.session.refresh(cloned_fleet)

        return cloned_fleet

    async def bulk_clone_entities(
        self,
        entity_class: Type[T],
        entity_ids: list[uuid.UUID],
        tenant_id: uuid.UUID,
        name_suffix: str = " - Clone",
    ) -> list[T]:
        """
        Clone multiple entities in bulk.

        Args:
            entity_class: The entity class to clone
            entity_ids: List of entity IDs to clone
            tenant_id: The tenant ID
            name_suffix: Suffix to add to entity names

        Returns:
            List of cloned entities

        Example:
            >>> cloner = EntityCloner(session)
            >>> cloned_fleets = await cloner.bulk_clone_entities(
            ...     Fleet,
            ...     [fleet_id1, fleet_id2, fleet_id3],
            ...     tenant_id,
            ...     name_suffix=" - Backup"
            ... )
        """
        cloned_entities = []

        for idx, entity_id in enumerate(entity_ids, start=1):
            # Fetch entity
            entity = await self.session.get(entity_class, entity_id)
            if not entity:
                continue

            # Prepare overrides
            overrides = {}
            if hasattr(entity, "name"):
                overrides["name"] = f"{entity.name}{name_suffix}"

            # Clone entity
            cloned = await self.clone_entity(
                entity,
                tenant_id,
                clone_number=idx,
                overrides=overrides,
            )
            cloned_entities.append(cloned)

        await self.session.commit()

        return cloned_entities


async def clone_entity(
    session: AsyncSession,
    entity: TenantScopedModel,
    tenant_id: uuid.UUID,
    clone_number: Optional[int] = None,
    overrides: Optional[dict[str, Any]] = None,
) -> TenantScopedModel:
    """
    Convenience function to clone an entity.

    Args:
        session: Database session
        entity: The entity to clone
        tenant_id: The tenant ID
        clone_number: Optional clone number
        overrides: Optional attribute overrides

    Returns:
        The cloned entity
    """
    cloner = EntityCloner(session)
    return await cloner.clone_entity(entity, tenant_id, clone_number, overrides)
