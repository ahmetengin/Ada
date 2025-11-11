"""Fleet model for managing groups of vessels within a tenant."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.tenant import Tenant
    from ada.models.user import User


class Fleet(TenantScopedModel):
    """
    Fleet model representing groups of vessels within a tenant.

    This is the mid-level entity in the multi-tenant hierarchy.
    Each fleet belongs to a tenant and has a tenant-scoped unique ID for cloning.
    """

    __tablename__ = "fleets"

    # Foreign key to tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Name of the fleet",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Description of the fleet",
    )

    # Fleet type (e.g., 'catamaran', 'sailboat', 'motorboat', 'gulet')
    fleet_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    # Location/home port
    home_port: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Capacity
    vessel_count: Mapped[int] = mapped_column(default=0, nullable=False)
    total_capacity: Mapped[int | None] = mapped_column(
        nullable=True,
        comment="Total passenger capacity across all vessels",
    )

    # Status
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Additional data for cloning
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata for the fleet",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="fleets")

    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="fleet",
        cascade="all, delete-orphan",
    )

    # Composite unique constraint: tenant_id + tenant_unique_id
    __table_args__ = (
        Index(
            "ix_fleets_tenant_unique",
            "tenant_id",
            "tenant_unique_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<Fleet(id={self.id}, tenant_id={self.tenant_id}, "
            f"tenant_unique_id={self.tenant_unique_id}, name={self.name})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "name": self.name,
                "description": self.description,
                "fleet_type": self.fleet_type,
                "home_port": self.home_port,
                "vessel_count": self.vessel_count,
                "total_capacity": self.total_capacity,
                "is_active": self.is_active,
                "extra_data": self.extra_data,
            }
        )
        return base_dict
