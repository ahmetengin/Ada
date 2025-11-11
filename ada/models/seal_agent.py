"""SEAL Agent model for self-evolving agents."""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, String, Text, Uuid, JSON, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ada.models.base import TenantScopedModel

if TYPE_CHECKING:
    from ada.models.tenant import Tenant
    from ada.models.fleet import Fleet
    from ada.models.seal_experience import SEALExperience
    from ada.models.seal_memory import SEALMemory


class SEALAgent(TenantScopedModel):
    """
    SEAL Agent model for self-evolving agents.

    Represents an autonomous agent capable of learning from experiences
    and continuously improving its performance through the SEAL loop.
    """

    __tablename__ = "seal_agents"

    # Foreign keys
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    fleet_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fleets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Optional fleet association",
    )

    # Agent identity
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Name of the agent",
    )

    agent_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Type of agent: general, specialist, coordinator, etc.",
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Description of the agent's purpose and capabilities",
    )

    # Configuration
    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="claude-sonnet-4-5-20250929",
        comment="AI model being used",
    )

    system_prompt: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="System prompt for the agent",
    )

    capabilities: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="List of agent capabilities",
    )

    specializations: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Agent's areas of specialization",
    )

    # SEAL configuration
    seal_enabled: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
        comment="Whether SEAL learning is enabled",
    )

    max_iterations: Mapped[int] = mapped_column(
        Integer,
        default=10,
        nullable=False,
        comment="Maximum SEAL iterations per learning cycle",
    )

    learning_rate: Mapped[float] = mapped_column(
        Float,
        default=0.1,
        nullable=False,
        comment="Learning rate for self-evolution (0.0-1.0)",
    )

    reflection_frequency: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
        comment="How often to trigger reflection (every N experiences)",
    )

    # Performance metrics
    total_tasks: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Total number of tasks performed",
    )

    successful_tasks: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of successful tasks",
    )

    failed_tasks: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of failed tasks",
    )

    average_performance: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="Average performance score (0.0-1.0)",
    )

    # Learning statistics
    experience_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Total number of experiences recorded",
    )

    memory_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Total number of memories stored",
    )

    evolution_cycles: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of evolution cycles completed",
    )

    skills_learned: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Skills acquired through learning",
    )

    # Status
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
        comment="Whether the agent is currently active",
    )

    is_learning: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="Whether the agent is currently in a learning cycle",
    )

    # Metadata
    metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata",
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="seal_agents")
    fleet: Mapped["Fleet | None"] = relationship("Fleet", back_populates="seal_agents")
    experiences: Mapped[list["SEALExperience"]] = relationship(
        "SEALExperience",
        back_populates="agent",
        cascade="all, delete-orphan",
        order_by="SEALExperience.created_at.desc()",
    )
    memories: Mapped[list["SEALMemory"]] = relationship(
        "SEALMemory",
        back_populates="agent",
        cascade="all, delete-orphan",
        order_by="SEALMemory.importance_score.desc()",
    )

    # Indexes
    __table_args__ = (
        Index("ix_seal_agents_tenant_unique", "tenant_id", "tenant_unique_id", unique=True),
        Index("ix_seal_agents_type_active", "agent_type", "is_active"),
    )

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"<SEALAgent(id={self.id}, name={self.name}, "
            f"type={self.agent_type}, active={self.is_active})>"
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        base_dict = super().to_dict()
        base_dict.update(
            {
                "tenant_id": str(self.tenant_id),
                "fleet_id": str(self.fleet_id) if self.fleet_id else None,
                "name": self.name,
                "agent_type": self.agent_type,
                "description": self.description,
                "model": self.model,
                "system_prompt": self.system_prompt,
                "capabilities": self.capabilities,
                "specializations": self.specializations,
                "seal_enabled": self.seal_enabled,
                "max_iterations": self.max_iterations,
                "learning_rate": self.learning_rate,
                "reflection_frequency": self.reflection_frequency,
                "total_tasks": self.total_tasks,
                "successful_tasks": self.successful_tasks,
                "failed_tasks": self.failed_tasks,
                "average_performance": self.average_performance,
                "experience_count": self.experience_count,
                "memory_count": self.memory_count,
                "evolution_cycles": self.evolution_cycles,
                "skills_learned": self.skills_learned,
                "is_active": self.is_active,
                "is_learning": self.is_learning,
                "metadata": self.metadata,
            }
        )
        return base_dict

    def calculate_success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_tasks == 0:
            return 0.0
        return self.successful_tasks / self.total_tasks

    def update_performance(self, score: float) -> None:
        """Update average performance with new score."""
        if self.average_performance is None:
            self.average_performance = score
        else:
            # Moving average
            self.average_performance = (
                self.average_performance * 0.9 + score * 0.1
            )
