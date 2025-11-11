"""Tenant-scoped unique ID generator for cloning operations."""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional


class TenantUniqueIdGenerator:
    """
    Generate tenant-scoped unique identifiers for cloning operations.

    This ensures that when resources/entities are cloned within a tenant,
    each clone gets a unique identifier that is scoped to that tenant.
    """

    @staticmethod
    def generate_unique_id(
        tenant_id: uuid.UUID,
        entity_type: str,
        prefix: Optional[str] = None,
        suffix: Optional[str] = None,
    ) -> str:
        """
        Generate a tenant-scoped unique ID.

        Args:
            tenant_id: The tenant's UUID
            entity_type: Type of entity (e.g., 'fleet', 'user', 'vessel')
            prefix: Optional prefix for the ID
            suffix: Optional suffix for the ID

        Returns:
            A unique identifier string scoped to the tenant

        Example:
            >>> gen = TenantUniqueIdGenerator()
            >>> gen.generate_unique_id(tenant_id, "fleet", prefix="mediterranean")
            'mediterranean-fleet-a3f2e9d1-1234567890'
        """
        # Generate timestamp component
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)

        # Generate random component for uniqueness
        random_suffix = secrets.token_hex(4)

        # Create tenant-specific hash component (first 8 chars)
        tenant_hash = hashlib.sha256(str(tenant_id).encode()).hexdigest()[:8]

        # Build the unique ID
        parts = []

        if prefix:
            parts.append(prefix)

        parts.append(entity_type)
        parts.append(tenant_hash)
        parts.append(str(timestamp))
        parts.append(random_suffix)

        if suffix:
            parts.append(suffix)

        return "-".join(parts)

    @staticmethod
    def generate_clone_id(
        original_tenant_unique_id: str,
        tenant_id: uuid.UUID,
        clone_number: Optional[int] = None,
    ) -> str:
        """
        Generate a unique ID for a cloned entity.

        Args:
            original_tenant_unique_id: The tenant_unique_id of the original entity
            tenant_id: The tenant's UUID
            clone_number: Optional clone number (1, 2, 3, etc.)

        Returns:
            A unique identifier for the clone

        Example:
            >>> gen = TenantUniqueIdGenerator()
            >>> gen.generate_clone_id("mediterranean-fleet-xyz", tenant_id, 1)
            'mediterranean-fleet-xyz-clone-1-a3f2e9d1'
        """
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        tenant_hash = hashlib.sha256(str(tenant_id).encode()).hexdigest()[:8]

        parts = [original_tenant_unique_id, "clone"]

        if clone_number:
            parts.append(str(clone_number))

        parts.append(tenant_hash)
        parts.append(str(timestamp)[-6:])  # Last 6 digits of timestamp

        return "-".join(parts)

    @staticmethod
    def generate_sequential_id(
        tenant_id: uuid.UUID,
        entity_type: str,
        sequence_number: int,
        prefix: Optional[str] = None,
    ) -> str:
        """
        Generate a sequential tenant-scoped unique ID.

        Useful for ordered entities or when you want predictable IDs.

        Args:
            tenant_id: The tenant's UUID
            entity_type: Type of entity
            sequence_number: Sequence number (1, 2, 3, etc.)
            prefix: Optional prefix

        Returns:
            A sequential unique identifier

        Example:
            >>> gen = TenantUniqueIdGenerator()
            >>> gen.generate_sequential_id(tenant_id, "fleet", 5, "aegean")
            'aegean-fleet-00005-a3f2e9d1'
        """
        tenant_hash = hashlib.sha256(str(tenant_id).encode()).hexdigest()[:8]

        # Zero-pad sequence number
        seq_str = f"{sequence_number:05d}"

        parts = []
        if prefix:
            parts.append(prefix)

        parts.append(entity_type)
        parts.append(seq_str)
        parts.append(tenant_hash)

        return "-".join(parts)

    @staticmethod
    def generate_slug_based_id(
        tenant_id: uuid.UUID,
        entity_type: str,
        slug: str,
    ) -> str:
        """
        Generate a slug-based tenant-scoped unique ID.

        Args:
            tenant_id: The tenant's UUID
            entity_type: Type of entity
            slug: Human-readable slug (e.g., 'john-doe', 'main-fleet')

        Returns:
            A slug-based unique identifier

        Example:
            >>> gen = TenantUniqueIdGenerator()
            >>> gen.generate_slug_based_id(tenant_id, "user", "john-doe")
            'user-john-doe-a3f2e9d1'
        """
        tenant_hash = hashlib.sha256(str(tenant_id).encode()).hexdigest()[:8]

        # Sanitize slug
        clean_slug = slug.lower().replace(" ", "-").replace("_", "-")
        clean_slug = "".join(c for c in clean_slug if c.isalnum() or c == "-")

        return f"{entity_type}-{clean_slug}-{tenant_hash}"

    @staticmethod
    def validate_tenant_unique_id(
        tenant_unique_id: str,
        tenant_id: uuid.UUID,
    ) -> bool:
        """
        Validate that a tenant_unique_id belongs to the specified tenant.

        Args:
            tenant_unique_id: The tenant_unique_id to validate
            tenant_id: The tenant's UUID

        Returns:
            True if the ID is valid for the tenant, False otherwise
        """
        tenant_hash = hashlib.sha256(str(tenant_id).encode()).hexdigest()[:8]
        return tenant_hash in tenant_unique_id
