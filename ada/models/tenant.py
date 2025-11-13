"""Tenant model for multi-tenant architecture."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.database.base import Base

if TYPE_CHECKING:
    from ada.models.fleet import Fleet
    from ada.models.user import User
    from ada.models.seal_agent import SEALAgent
    from ada.models.seal_experience import SEALExperience
    from ada.models.seal_memory import SEALMemory


class Tenant(Base):
    """
    Tenant model representing organizations like Setur Marinas, Bali Catamarans, etc.

    This is the top-level entity in the multi-tenant hierarchy.
    """

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Unique identifier for the tenant (slug-like)
    tenant_unique_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique identifier for tenant (e.g., 'setur-marinas', 'bali-catamarans')",
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Display name of the tenant",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Description of the tenant organization",
    )

    # Contact information
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Metadata
    settings: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Tenant-specific configuration and settings",
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

    # Relationships
    fleets: Mapped[list["Fleet"]] = relationship(
        "Fleet",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    seal_agents: Mapped[list["SEALAgent"]] = relationship(
        "SEALAgent",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    seal_experiences: Mapped[list["SEALExperience"]] = relationship(
        "SEALExperience",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    seal_memories: Mapped[list["SEALMemory"]] = relationship(
        "SEALMemory",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Tenant(id={self.id}, tenant_unique_id={self.tenant_unique_id}, name={self.name})>"

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        return {
            "id": str(self.id),
            "tenant_unique_id": self.tenant_unique_id,
            "name": self.name,
            "description": self.description,
            "email": self.email,
            "phone": self.phone,
            "website": self.website,
            "is_active": self.is_active,
            "settings": self.settings,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
