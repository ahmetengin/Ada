"""User model for managing users within tenants and fleets."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.fleet import Fleet
    from ada.models.tenant import Tenant


class User(TenantScopedModel):
    """
    User model representing individual users within a tenant/fleet.

    This is the lowest-level entity in the multi-tenant hierarchy.
    Each user belongs to a tenant and optionally a fleet, with a tenant-scoped unique ID.
    """

    __tablename__ = "users"

    # Foreign key to tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Foreign key to fleet (optional)
    fleet_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fleets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # User information
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="User email address",
    )

    username: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Authentication (hashed password would go here in production)
    # password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Role within the tenant/fleet
    role: Mapped[str] = mapped_column(
        String(50),
        default="user",
        nullable=False,
        comment="User role (e.g., 'admin', 'manager', 'user', 'guest')",
    )

    # Status
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Contact information
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Preferences and metadata
    preferences: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="User preferences and settings",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")

    fleet: Mapped["Fleet | None"] = relationship("Fleet", back_populates="users")

    # Composite unique constraints
    __table_args__ = (
        Index(
            "ix_users_tenant_unique",
            "tenant_id",
            "tenant_unique_id",
            unique=True,
        ),
        Index(
            "ix_users_tenant_email",
            "tenant_id",
            "email",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<User(id={self.id}, tenant_id={self.tenant_id}, "
            f"tenant_unique_id={self.tenant_unique_id}, email={self.email})>"
        )

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.username or self.email

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "fleet_id": str(self.fleet_id) if self.fleet_id else None,
                "email": self.email,
                "username": self.username,
                "first_name": self.first_name,
                "last_name": self.last_name,
                "full_name": self.full_name,
                "role": self.role,
                "is_active": self.is_active,
                "is_verified": self.is_verified,
                "phone": self.phone,
                "preferences": self.preferences,
            }
        )
        return base_dict
