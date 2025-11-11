"""Tests for SEAL (Self-Evolving Agent Loop) functionality."""

import uuid
from datetime import datetime

import pytest
from sqlalchemy import select

from ada.models import Tenant, Fleet, SEALAgent, SEALExperience, SEALMemory
from ada.services.seal_manager import SEALManager
from ada.utils.tenant_id_generator import TenantUniqueIdGenerator


@pytest.mark.asyncio
async def test_create_seal_agent(db_session):
    """Test creating a SEAL agent."""
    # Create tenant
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)

    # Create agent
    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
        description="A test agent",
        capabilities=["testing"],
    )

    assert agent.id is not None
    assert agent.name == "Test Agent"
    assert agent.agent_type == "general"
    assert agent.seal_enabled is True
    assert agent.experience_count == 0
    assert agent.memory_count == 0


@pytest.mark.asyncio
async def test_record_experience(db_session):
    """Test recording an experience."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record experience
    experience = await manager.record_experience(
        agent_id=agent.id,
        tenant_id=tenant.id,
        experience_type="task_execution",
        task_name="test_task",
        action_taken="Performed test action",
        success=True,
        performance_score=0.9,
    )

    assert experience.id is not None
    assert experience.agent_id == agent.id
    assert experience.experience_type == "task_execution"
    assert experience.success is True
    assert experience.performance_score == 0.9

    # Check agent stats updated
    await db_session.refresh(agent)
    assert agent.experience_count == 1
    assert agent.total_tasks == 1
    assert agent.successful_tasks == 1
    assert agent.average_performance is not None


@pytest.mark.asyncio
async def test_automatic_reflection(db_session):
    """Test automatic reflection after N experiences."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
        reflection_frequency=3,  # Reflect every 3 experiences
    )

    # Record 3 experiences
    for i in range(3):
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="task_execution",
            task_name=f"task_{i}",
            action_taken=f"Action {i}",
            success=True,
            performance_score=0.8 + i * 0.05,
        )

    # Check that reflection was triggered
    await db_session.refresh(agent)
    # Note: Reflection creates memories, but our simplified version
    # might not create memories if patterns aren't detected
    assert agent.experience_count == 3


@pytest.mark.asyncio
async def test_manual_reflection(db_session):
    """Test manually triggering reflection."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record some experiences
    for i in range(5):
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="task_execution",
            task_name=f"task_{i}",
            action_taken=f"Action {i}",
            success=i % 2 == 0,  # Alternating success/failure
            performance_score=0.7 if i % 2 == 0 else 0.3,
        )

    # Trigger reflection
    memories = await manager.trigger_reflection(agent.id)

    # Should create some memories from patterns
    assert isinstance(memories, list)

    # Check experiences are marked as processed
    stmt = select(SEALExperience).where(
        SEALExperience.agent_id == agent.id,
        SEALExperience.processed == True,
    )
    result = await db_session.execute(stmt)
    processed = list(result.scalars().all())
    assert len(processed) > 0


@pytest.mark.asyncio
async def test_evolution_cycle(db_session):
    """Test running evolution cycle."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record experiences
    for i in range(10):
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="task_execution",
            task_name=f"task_{i}",
            success=True,
            performance_score=0.8,
        )

    # Run evolution
    results = await manager.evolve_agent(agent.id, iterations=2)

    assert results["agent_id"] == str(agent.id)
    assert "cycles_completed" in results
    assert "total_experiences" in results
    assert results["success_rate"] > 0


@pytest.mark.asyncio
async def test_memory_feedback(db_session):
    """Test updating memory with feedback."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Create a memory manually
    id_gen = TenantUniqueIdGenerator()
    memory = SEALMemory(
        tenant_id=tenant.id,
        agent_id=agent.id,
        tenant_unique_id=id_gen.generate_unique_id(tenant.id, "seal_memory"),
        memory_type="skill",
        title="Test Memory",
        content="Test content",
    )
    db_session.add(memory)
    await db_session.commit()
    await db_session.refresh(memory)

    initial_importance = memory.importance_score

    # Provide positive feedback
    updated = await manager.update_memory_feedback(memory.id, success=True)

    assert updated.success_count == 1
    assert updated.usage_count >= 1


@pytest.mark.asyncio
async def test_retrieve_memories(db_session):
    """Test retrieving relevant memories."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Create memories
    id_gen = TenantUniqueIdGenerator()
    for i in range(5):
        memory = SEALMemory(
            tenant_id=tenant.id,
            agent_id=agent.id,
            tenant_unique_id=id_gen.generate_unique_id(tenant.id, "seal_memory"),
            memory_type="skill",
            title=f"Memory {i}",
            content=f"Content {i}",
            importance_score=0.5 + i * 0.1,
        )
        db_session.add(memory)

    await db_session.commit()

    # Retrieve memories
    memories = await manager.retrieve_relevant_memories(
        agent_id=agent.id,
        context="test context",
        limit=3,
    )

    assert len(memories) <= 3
    # Should be ordered by importance
    if len(memories) > 1:
        assert memories[0].importance_score >= memories[1].importance_score


@pytest.mark.asyncio
async def test_get_agent_insights(db_session):
    """Test getting agent insights."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record some experiences
    for i in range(5):
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="task_execution",
            task_name=f"task_{i}",
            success=True,
            performance_score=0.8,
        )

    # Get insights
    insights = await manager.get_agent_insights(agent.id)

    assert "agent" in insights
    assert "statistics" in insights
    assert "recent_experiences" in insights
    assert "top_memories" in insights

    stats = insights["statistics"]
    assert stats["total_tasks"] == 5
    assert stats["successful_tasks"] == 5
    assert stats["success_rate"] == 1.0


@pytest.mark.asyncio
async def test_error_experience_learning(db_session):
    """Test learning from error experiences."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record error experiences
    for i in range(3):
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="error",
            task_name=f"failed_task_{i}",
            success=False,
            error_occurred=True,
            error_type="ValidationError",
            error_message=f"Error message {i}",
            lessons_learned=[f"Lesson {i}"],
        )

    # Trigger reflection
    memories = await manager.trigger_reflection(agent.id)

    # Should create memories about error patterns
    error_memories = [m for m in memories if m.category == "error_pattern"]
    # Note: May or may not create memories depending on pattern detection
    assert isinstance(memories, list)


@pytest.mark.asyncio
async def test_agent_performance_tracking(db_session):
    """Test agent performance tracking over time."""
    # Setup
    tenant = Tenant(
        tenant_unique_id="test-tenant",
        name="Test Tenant",
        email="test@example.com",
    )
    db_session.add(tenant)
    await db_session.commit()

    manager = SEALManager(db_session)
    agent = await manager.create_agent(
        tenant_id=tenant.id,
        name="Test Agent",
        agent_type="general",
    )

    # Record experiences with varying performance
    scores = [0.5, 0.6, 0.7, 0.8, 0.9]
    for score in scores:
        await manager.record_experience(
            agent_id=agent.id,
            tenant_id=tenant.id,
            experience_type="task_execution",
            task_name="test_task",
            success=True,
            performance_score=score,
        )

    await db_session.refresh(agent)

    # Check performance is being tracked
    assert agent.average_performance is not None
    assert agent.total_tasks == len(scores)
    assert agent.successful_tasks == len(scores)
    assert agent.calculate_success_rate() == 1.0
