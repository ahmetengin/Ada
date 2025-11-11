"""Base model with tenant-scoped unique ID generation."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from ada.database.base import Base


class TenantScopedModel(Base):
    """
    Base model for all tenant-scoped entities.

    Provides automatic tenant-scoped unique ID generation for cloning operations.
    Each entity gets a UUID primary key and a tenant-scoped unique identifier.
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Tenant-scoped unique identifier for cloning
    tenant_unique_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Unique identifier within tenant scope for cloning operations",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate table name from class name."""
        return cls.__name__.lower() + "s"

    def __repr__(self) -> str:
        """String representation."""
        return f"<{self.__class__.__name__}(id={self.id}, tenant_unique_id={self.tenant_unique_id})>"

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "tenant_unique_id": self.tenant_unique_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
