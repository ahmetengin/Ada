"""SEAL Experience model for tracking agent learning experiences."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.tenant import Tenant
    from ada.models.seal_agent import SEALAgent


class SEALExperience(TenantScopedModel):
    """
    SEAL Experience model for tracking agent experiences.

    Records every significant interaction, decision, and outcome
    for the self-evolving agent to learn from.
    """

    __tablename__ = "seal_experiences"

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

    # Experience metadata
    experience_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Type of experience: task_execution, decision, error, success, reflection",
    )

    task_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Name of the task being performed",
    )

    # Context and execution
    context: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Context in which the experience occurred",
    )

    action_taken: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Action or decision made by the agent",
    )

    reasoning: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Agent's reasoning for the action",
    )

    # Results and feedback
    outcome: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Outcome of the action",
    )

    success: Mapped[bool | None] = mapped_column(
        nullable=True,
        comment="Whether the action was successful",
    )

    performance_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Numeric score of performance (0.0-1.0)",
    )

    feedback: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="External feedback received",
    )

    # Error tracking
    error_occurred: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Error message if error occurred",
    )

    error_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Type of error",
    )

    # Learning and reflection
    reflection: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Agent's reflection on the experience",
    )

    lessons_learned: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Key lessons extracted from this experience",
    )

    improvement_suggestions: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Suggestions for improvement",
    )

    # Embeddings for similarity search
    embedding: Mapped[list[float] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Vector embedding for similarity search",
    )

    # Processing status
    processed: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="Whether this experience has been processed for learning",
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Importance and relevance
    importance_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Importance score for prioritizing learning (0.0-1.0)",
    )

    replay_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of times this experience has been replayed for learning",
    )

    # Metadata
    metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="seal_experiences")
    agent: Mapped["SEALAgent"] = relationship("SEALAgent", back_populates="experiences")

    # Indexes
    __table_args__ = (
        Index("ix_seal_experiences_tenant_unique", "tenant_id", "tenant_unique_id", unique=True),
        Index("ix_seal_experiences_type_success", "experience_type", "success"),
        Index("ix_seal_experiences_processed", "processed"),
        Index("ix_seal_experiences_importance", "importance_score"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<SEALExperience(id={self.id}, agent_id={self.agent_id}, "
            f"type={self.experience_type}, success={self.success})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "agent_id": str(self.agent_id),
                "experience_type": self.experience_type,
                "task_name": self.task_name,
                "context": self.context,
                "action_taken": self.action_taken,
                "reasoning": self.reasoning,
                "outcome": self.outcome,
                "success": self.success,
                "performance_score": self.performance_score,
                "feedback": self.feedback,
                "error_occurred": self.error_occurred,
                "error_message": self.error_message,
                "error_type": self.error_type,
                "reflection": self.reflection,
                "lessons_learned": self.lessons_learned,
                "improvement_suggestions": self.improvement_suggestions,
                "processed": self.processed,
                "processed_at": self.processed_at.isoformat() if self.processed_at else None,
                "importance_score": self.importance_score,
                "replay_count": self.replay_count,
                "metadata": self.metadata,
            }
        )
        return base_dict
