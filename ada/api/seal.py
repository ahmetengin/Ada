"""SEAL API endpoints."""

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ada.database.session import get_db
from ada.services.seal_manager import SEALManager

router = APIRouter()


# Request/Response Models
class CreateAgentRequest(BaseModel):
    """Request model for creating a SEAL agent."""

    tenant_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    agent_type: str = Field(..., min_length=1, max_length=100)
    fleet_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    capabilities: Optional[list[str]] = None
    specializations: Optional[list[str]] = None
    system_prompt: Optional[str] = None
    seal_enabled: bool = True
    max_iterations: int = Field(default=10, ge=1, le=100)
    learning_rate: float = Field(default=0.1, ge=0.0, le=1.0)
    reflection_frequency: int = Field(default=5, ge=1)


class RecordExperienceRequest(BaseModel):
    """Request model for recording an experience."""

    agent_id: uuid.UUID
    tenant_id: uuid.UUID
    experience_type: str = Field(..., min_length=1, max_length=100)
    task_name: Optional[str] = None
    context: Optional[dict[str, Any]] = None
    action_taken: Optional[str] = None
    reasoning: Optional[str] = None
    outcome: Optional[str] = None
    success: Optional[bool] = None
    performance_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    feedback: Optional[str] = None
    error_occurred: bool = False
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    reflection: Optional[str] = None
    lessons_learned: Optional[list[str]] = None
    improvement_suggestions: Optional[list[str]] = None


class MemoryFeedbackRequest(BaseModel):
    """Request model for memory feedback."""

    success: bool


class AgentResponse(BaseModel):
    """Response model for agent data."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    agent_type: str
    is_active: bool
    seal_enabled: bool
    total_tasks: int
    successful_tasks: int
    failed_tasks: int
    success_rate: float
    average_performance: Optional[float]
    experience_count: int
    memory_count: int
    evolution_cycles: int


# Endpoints
@router.post("/agents", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: CreateAgentRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new SEAL agent."""
    manager = SEALManager(db)

    agent = await manager.create_agent(
        tenant_id=request.tenant_id,
        name=request.name,
        agent_type=request.agent_type,
        fleet_id=request.fleet_id,
        description=request.description,
        capabilities=request.capabilities,
        specializations=request.specializations,
        system_prompt=request.system_prompt,
        seal_enabled=request.seal_enabled,
        max_iterations=request.max_iterations,
        learning_rate=request.learning_rate,
        reflection_frequency=request.reflection_frequency,
    )

    return agent.to_dict()


@router.post("/experiences", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_experience(
    request: RecordExperienceRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Record a new experience for an agent."""
    manager = SEALManager(db)

    experience = await manager.record_experience(
        agent_id=request.agent_id,
        tenant_id=request.tenant_id,
        experience_type=request.experience_type,
        task_name=request.task_name,
        context=request.context,
        action_taken=request.action_taken,
        reasoning=request.reasoning,
        outcome=request.outcome,
        success=request.success,
        performance_score=request.performance_score,
        feedback=request.feedback,
        error_occurred=request.error_occurred,
        error_message=request.error_message,
        error_type=request.error_type,
        reflection=request.reflection,
        lessons_learned=request.lessons_learned,
        improvement_suggestions=request.improvement_suggestions,
    )

    return experience.to_dict()


@router.post("/agents/{agent_id}/reflect", response_model=dict)
async def trigger_reflection(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger reflection process for an agent."""
    manager = SEALManager(db)

    try:
        memories = await manager.trigger_reflection(agent_id)
        return {
            "agent_id": str(agent_id),
            "memories_created": len(memories),
            "memories": [mem.to_dict() for mem in memories],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reflection failed: {str(e)}",
        )


@router.post("/agents/{agent_id}/evolve", response_model=dict)
async def evolve_agent(
    agent_id: uuid.UUID,
    iterations: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Run evolution cycle for an agent."""
    manager = SEALManager(db)

    try:
        results = await manager.evolve_agent(agent_id, iterations)
        return results
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evolution failed: {str(e)}",
        )


@router.get("/agents/{agent_id}", response_model=dict)
async def get_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get agent details."""
    from ada.models import SEALAgent

    agent = await db.get(SEALAgent, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id} not found",
        )

    return agent.to_dict()


@router.get("/agents/{agent_id}/insights", response_model=dict)
async def get_agent_insights(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get comprehensive insights about an agent's learning."""
    manager = SEALManager(db)

    try:
        insights = await manager.get_agent_insights(agent_id)
        return insights
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/agents/{agent_id}/memories", response_model=dict)
async def get_agent_memories(
    agent_id: uuid.UUID,
    limit: int = 10,
    memory_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get agent's memories."""
    manager = SEALManager(db)

    memories = await manager.retrieve_relevant_memories(
        agent_id=agent_id,
        context="",  # For listing, context is not needed
        limit=limit,
        memory_type=memory_type,
    )

    return {
        "agent_id": str(agent_id),
        "count": len(memories),
        "memories": [mem.to_dict() for mem in memories],
    }


@router.post("/memories/{memory_id}/feedback", response_model=dict)
async def update_memory_feedback(
    memory_id: uuid.UUID,
    request: MemoryFeedbackRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update memory with feedback on its effectiveness."""
    manager = SEALManager(db)

    try:
        memory = await manager.update_memory_feedback(memory_id, request.success)
        return memory.to_dict()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/agents/{agent_id}/experiences", response_model=dict)
async def get_agent_experiences(
    agent_id: uuid.UUID,
    limit: int = 20,
    experience_type: Optional[str] = None,
    processed: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get agent's experiences."""
    from sqlalchemy import select

    from ada.models import SEALExperience

    stmt = (
        select(SEALExperience)
        .where(SEALExperience.agent_id == agent_id)
        .order_by(SEALExperience.created_at.desc())
    )

    if experience_type:
        stmt = stmt.where(SEALExperience.experience_type == experience_type)

    if processed is not None:
        stmt = stmt.where(SEALExperience.processed == processed)

    stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    experiences = list(result.scalars().all())

    return {
        "agent_id": str(agent_id),
        "count": len(experiences),
        "experiences": [exp.to_dict() for exp in experiences],
    }
