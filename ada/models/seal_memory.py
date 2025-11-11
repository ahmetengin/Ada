"""SEAL Memory model for storing learned knowledge."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.tenant import Tenant
    from ada.models.seal_agent import SEALAgent


class SEALMemory(TenantScopedModel):
    """
    SEAL Memory model for storing learned knowledge.

    Represents distilled knowledge and skills learned from experiences.
    Memories are used to improve future agent performance.
    """

    __tablename__ = "seal_memories"

    # Foreign keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("seal_agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Memory metadata
    memory_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Type: skill, pattern, strategy, heuristic, concept, lesson",
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Category for organizing memories",
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Short title/summary of the memory",
    )

    # Content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="The actual learned knowledge or skill",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Detailed description of the memory",
    )

    conditions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Conditions under which this memory is applicable",
    )

    # Source and derivation
    source_experiences: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="List of experience IDs this memory was derived from",
    )

    derivation_method: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Method used to derive this memory: reflection, pattern_matching, etc.",
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        default=0.5,
        nullable=False,
        comment="Confidence in this memory (0.0-1.0)",
    )

    # Effectiveness tracking
    importance_score: Mapped[float] = mapped_column(
        Float,
        default=0.5,
        nullable=False,
        index=True,
        comment="Importance/priority score (0.0-1.0)",
    )

    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of times this memory has been retrieved/used",
    )

    success_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of successful applications",
    )

    failure_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of failed applications",
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time this memory was used",
    )

    # Embeddings for similarity search
    embedding: Mapped[list[float] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Vector embedding for similarity search",
    )

    # Related concepts
    tags: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Tags for categorization and search",
    )

    related_memories: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="IDs of related memories",
    )

    # Evolution tracking
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="Version number (increments when memory is updated)",
    )

    parent_memory_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        comment="ID of parent memory if this is an evolution",
    )

    superseded_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        comment="ID of memory that supersedes this one",
    )

    # Status
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
        comment="Whether this memory is currently active",
    )

    is_validated: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="Whether this memory has been validated through use",
    )

    # Metadata
    metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="seal_memories")
    agent: Mapped["SEALAgent"] = relationship("SEALAgent", back_populates="memories")

    # Indexes
    __table_args__ = (
        Index("ix_seal_memories_tenant_unique", "tenant_id", "tenant_unique_id", unique=True),
        Index("ix_seal_memories_type_active", "memory_type", "is_active"),
        Index("ix_seal_memories_importance", "importance_score"),
        Index("ix_seal_memories_category", "category"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<SEALMemory(id={self.id}, agent_id={self.agent_id}, "
            f"type={self.memory_type}, title={self.title})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "agent_id": str(self.agent_id),
                "memory_type": self.memory_type,
                "category": self.category,
                "title": self.title,
                "content": self.content,
                "description": self.description,
                "conditions": self.conditions,
                "source_experiences": self.source_experiences,
                "derivation_method": self.derivation_method,
                "confidence": self.confidence,
                "importance_score": self.importance_score,
                "usage_count": self.usage_count,
                "success_count": self.success_count,
                "failure_count": self.failure_count,
                "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
                "tags": self.tags,
                "related_memories": self.related_memories,
                "version": self.version,
                "parent_memory_id": str(self.parent_memory_id) if self.parent_memory_id else None,
                "superseded_by": str(self.superseded_by) if self.superseded_by else None,
                "is_active": self.is_active,
                "is_validated": self.is_validated,
                "metadata": self.metadata,
            }
        )
        return base_dict

    def calculate_effectiveness(self) -> float:
        """Calculate effectiveness ratio."""
        total = self.success_count + self.failure_count
        if total == 0:
            return 0.5  # Neutral if not used
        return self.success_count / total

    def update_importance(self) -> None:
        """Update importance score based on usage and effectiveness."""
        effectiveness = self.calculate_effectiveness()
        recency_factor = 1.0 if self.last_used_at else 0.5
        usage_factor = min(1.0, self.usage_count / 10.0)  # Cap at 10 uses

        self.importance_score = (
            effectiveness * 0.5 +
            usage_factor * 0.3 +
            recency_factor * 0.2
        )
