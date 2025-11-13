"""User activity log model for tracking user actions and events."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.tenant import Tenant
    from ada.models.user import User


class UserActivityLog(TenantScopedModel):
    """
    User activity log model for tracking user actions, events, and watch logs.

    Automatically logs user login/logout, watch start/end, and other events.
    """

    __tablename__ = "user_activity_logs"

    # Foreign key to tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Activity information
    activity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Activity type (login, logout, watch_start, watch_end, event)",
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Human-readable description of the activity",
    )

    # Additional metadata (JSON)
    metadata: Mapped[dict[str, Any] | None] = mapped_column(
        type_=None,  # Will be JSON in PostgreSQL
        nullable=True,
        comment="Additional metadata about the activity",
    )

    # Location data (JSON) - lat, lon, vessel_id, etc.
    location: Mapped[dict[str, Any] | None] = mapped_column(
        type_=None,  # Will be JSON in PostgreSQL
        nullable=True,
        comment="Location data when activity occurred",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    user: Mapped["User"] = relationship("User")

    # Composite indexes
    __table_args__ = (
        Index(
            "ix_user_activity_tenant_user",
            "tenant_id",
            "user_id",
        ),
        Index(
            "ix_user_activity_tenant_type",
            "tenant_id",
            "activity_type",
        ),
        Index(
            "ix_user_activity_user_created",
            "user_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<UserActivityLog(id={self.id}, user_id={self.user_id}, "
            f"activity_type={self.activity_type}, created_at={self.created_at})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "user_id": str(self.user_id),
                "activity_type": self.activity_type,
                "description": self.description,
                "metadata": self.metadata,
                "location": self.location,
            }
        )
        return base_dict
