"""SEAL Manager for orchestrating the Self-Evolving Agent Loop."""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ada.config import get_settings
from ada.models import SEALAgent, SEALExperience, SEALMemory
from ada.services.embeddings import get_embeddings_service
from ada.services.llm_reflection import get_llm_reflection_service
from ada.utils.tenant_id_generator import TenantUniqueIdGenerator

settings = get_settings()


class SEALManager:
    """
    SEAL Manager for orchestrating the Self-Evolving Agent Loop.

    The SEAL loop consists of:
    1. Experience Collection: Recording agent actions and outcomes
    2. Reflection: Analyzing experiences to extract insights
    3. Memory Formation: Creating durable knowledge from insights
    4. Application: Using memories to improve future performance
    5. Evolution: Continuous improvement through iteration
    """

    def __init__(
        self,
        session: AsyncSession,
        use_embeddings: bool = True,
        use_llm_reflection: bool = True,
    ):
        """
        Initialize SEAL Manager.

        Args:
            session: Database session
            use_embeddings: Whether to use vector embeddings for semantic search
            use_llm_reflection: Whether to use LLM for intelligent reflection
        """
        self.session = session
        self.id_generator = TenantUniqueIdGenerator()
        self.use_embeddings = use_embeddings
        self.use_llm_reflection = use_llm_reflection

        if use_embeddings:
            self.embeddings = get_embeddings_service()

        if use_llm_reflection:
            try:
                self.llm_reflection = get_llm_reflection_service()
            except ValueError as e:
                print(f"Warning: LLM reflection disabled: {e}")
                self.use_llm_reflection = False

    async def create_agent(
        self,
        tenant_id: uuid.UUID,
        name: str,
        agent_type: str,
        fleet_id: Optional[uuid.UUID] = None,
        description: Optional[str] = None,
        capabilities: Optional[list[str]] = None,
        specializations: Optional[list[str]] = None,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> SEALAgent:
        """Create a new SEAL agent."""
        agent = SEALAgent(
            tenant_id=tenant_id,
            fleet_id=fleet_id,
            tenant_unique_id=self.id_generator.generate_unique_id(
                tenant_id=tenant_id,
                entity_type="seal_agent",
                prefix=agent_type,
            ),
            name=name,
            agent_type=agent_type,
            description=description,
            capabilities=capabilities or [],
            specializations=specializations or [],
            system_prompt=system_prompt,
            model=kwargs.get("model", settings.seal_model),
            max_iterations=kwargs.get("max_iterations", settings.seal_max_iterations),
            **kwargs,
        )

        self.session.add(agent)
        await self.session.commit()
        await self.session.refresh(agent)

        return agent

    async def record_experience(
        self,
        agent_id: uuid.UUID,
        tenant_id: uuid.UUID,
        experience_type: str,
        task_name: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
        action_taken: Optional[str] = None,
        reasoning: Optional[str] = None,
        outcome: Optional[str] = None,
        success: Optional[bool] = None,
        performance_score: Optional[float] = None,
        feedback: Optional[str] = None,
        error_occurred: bool = False,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
        **kwargs,
    ) -> SEALExperience:
        """Record a new experience for the agent."""
        experience = SEALExperience(
            tenant_id=tenant_id,
            agent_id=agent_id,
            tenant_unique_id=self.id_generator.generate_unique_id(
                tenant_id=tenant_id,
                entity_type="seal_experience",
            ),
            experience_type=experience_type,
            task_name=task_name,
            context=context,
            action_taken=action_taken,
            reasoning=reasoning,
            outcome=outcome,
            success=success,
            performance_score=performance_score,
            feedback=feedback,
            error_occurred=error_occurred,
            error_message=error_message,
            error_type=error_type,
            **kwargs,
        )

        self.session.add(experience)

        # Update agent statistics
        agent = await self.session.get(SEALAgent, agent_id)
        if agent:
            agent.experience_count += 1
            agent.total_tasks += 1
            if success is True:
                agent.successful_tasks += 1
            elif success is False:
                agent.failed_tasks += 1

            if performance_score is not None:
                agent.update_performance(performance_score)

        await self.session.commit()
        await self.session.refresh(experience)

        # Generate and store embedding if enabled
        if self.use_embeddings:
            await self._generate_experience_embedding(experience)

        # Trigger reflection if needed
        if agent and agent.seal_enabled:
            if agent.experience_count % agent.reflection_frequency == 0:
                await self.trigger_reflection(agent.id)

        return experience

    async def _generate_experience_embedding(self, experience: SEALExperience) -> None:
        """Generate and store embedding for an experience."""
        # Create text representation of experience
        text_parts = []
        if experience.task_name:
            text_parts.append(f"Task: {experience.task_name}")
        if experience.action_taken:
            text_parts.append(f"Action: {experience.action_taken}")
        if experience.reasoning:
            text_parts.append(f"Reasoning: {experience.reasoning}")
        if experience.outcome:
            text_parts.append(f"Outcome: {experience.outcome}")

        text = " | ".join(text_parts) if text_parts else "Empty experience"

        # Generate embedding
        embedding = await self.embeddings.generate_embedding(text)

        # Store in database
        experience.embedding = embedding
        await self.session.commit()

        # Store in Qdrant
        try:
            collection_name = f"experiences_{experience.tenant_id}".replace("-", "_")
            await self.embeddings.create_collection(collection_name)
            await self.embeddings.upsert_embedding(
                collection_name=collection_name,
                point_id=str(experience.id),
                text=text,
                metadata={
                    "agent_id": str(experience.agent_id),
                    "experience_type": experience.experience_type,
                    "success": experience.success,
                    "performance_score": experience.performance_score,
                },
            )
        except Exception as e:
            # Log error but don't fail the operation
            print(f"Warning: Failed to store embedding in Qdrant: {e}")

    async def trigger_reflection(self, agent_id: uuid.UUID) -> list[SEALMemory]:
        """
        Trigger reflection process for an agent.

        Analyzes recent experiences to extract learnings and create memories.
        """
        agent = await self.session.get(SEALAgent, agent_id)
        if not agent or not agent.seal_enabled:
            return []

        # Mark agent as learning
        agent.is_learning = True
        await self.session.commit()

        try:
            # Get recent unprocessed experiences
            stmt = (
                select(SEALExperience)
                .where(
                    SEALExperience.agent_id == agent_id,
                    SEALExperience.processed == False,
                )
                .order_by(SEALExperience.created_at.desc())
                .limit(agent.reflection_frequency * 2)
            )
            result = await self.session.execute(stmt)
            experiences = list(result.scalars().all())

            if not experiences:
                return []

            # Analyze experiences and create memories
            memories = await self._analyze_experiences(agent, experiences)

            # Mark experiences as processed
            for exp in experiences:
                exp.processed = True
                exp.processed_at = datetime.now(timezone.utc)

            # Update agent
            agent.evolution_cycles += 1
            agent.memory_count = len(memories)

            await self.session.commit()

            return memories

        finally:
            agent.is_learning = False
            await self.session.commit()

    async def _analyze_experiences(
        self,
        agent: SEALAgent,
        experiences: list[SEALExperience],
    ) -> list[SEALMemory]:
        """
        Analyze experiences to extract learnings using LLM or fallback patterns.

        Uses LLM-powered analysis when available, falls back to pattern matching.
        """
        memories = []

        # Try LLM-powered analysis first
        if self.use_llm_reflection:
            try:
                # Prepare agent context
                agent_context = {
                    "name": agent.name,
                    "type": agent.agent_type,
                    "capabilities": agent.capabilities,
                    "specializations": agent.specializations,
                    "total_tasks": agent.total_tasks,
                    "success_rate": agent.calculate_success_rate(),
                }

                # Analyze with LLM
                analysis = await self.llm_reflection.analyze_experiences(
                    experiences, agent_context
                )

                # Create memories from patterns
                for pattern in analysis.get("patterns", []):
                    memory_data = await self.llm_reflection.create_memory_from_insight(
                        pattern, pattern_type="pattern"
                    )
                    memory = await self._create_memory_from_data(
                        agent=agent,
                        memory_data=memory_data,
                        source_experiences=experiences,
                        derivation_method="llm_analysis",
                    )
                    if memory:
                        memories.append(memory)

                # Create memories from insights
                for insight in analysis.get("insights", []):
                    memory_data = await self.llm_reflection.create_memory_from_insight(
                        insight, pattern_type="insight"
                    )
                    memory = await self._create_memory_from_data(
                        agent=agent,
                        memory_data=memory_data,
                        source_experiences=experiences,
                        derivation_method="llm_insight",
                    )
                    if memory:
                        memories.append(memory)

                # Create memories from learned skills
                for skill in analysis.get("skills_learned", []):
                    memory_data = await self.llm_reflection.create_memory_from_insight(
                        skill, pattern_type="skill"
                    )
                    memory = await self._create_memory_from_data(
                        agent=agent,
                        memory_data=memory_data,
                        source_experiences=experiences,
                        derivation_method="skill_extraction",
                    )
                    if memory:
                        memories.append(memory)

                        # Add skill to agent
                        if agent.skills_learned is None:
                            agent.skills_learned = []
                        skill_name = skill.get("skill_name", "Unknown skill")
                        if skill_name not in agent.skills_learned:
                            agent.skills_learned.append(skill_name)

                # If LLM analysis produced memories, return them
                if memories:
                    return memories

            except Exception as e:
                print(f"Warning: LLM analysis failed, using fallback: {e}")

        # Fallback to simple pattern matching
        # Pattern 1: Extract successful strategies
        successful_experiences = [e for e in experiences if e.success is True]
        if successful_experiences:
            memory = await self._create_memory_from_pattern(
                agent=agent,
                pattern_type="successful_strategy",
                experiences=successful_experiences,
                title="Successful task execution patterns",
                content=self._summarize_successful_patterns(successful_experiences),
            )
            if memory:
                memories.append(memory)

        # Pattern 2: Learn from errors
        error_experiences = [e for e in experiences if e.error_occurred]
        if error_experiences:
            memory = await self._create_memory_from_pattern(
                agent=agent,
                pattern_type="error_pattern",
                experiences=error_experiences,
                title="Common error patterns and avoidance strategies",
                content=self._summarize_error_patterns(error_experiences),
            )
            if memory:
                memories.append(memory)

        # Pattern 3: Performance insights
        scored_experiences = [e for e in experiences if e.performance_score is not None]
        if scored_experiences:
            memory = await self._create_memory_from_pattern(
                agent=agent,
                pattern_type="performance_insight",
                experiences=scored_experiences,
                title="Performance optimization insights",
                content=self._summarize_performance_insights(scored_experiences),
            )
            if memory:
                memories.append(memory)

        return memories

    async def _create_memory_from_data(
        self,
        agent: SEALAgent,
        memory_data: dict[str, Any],
        source_experiences: list[SEALExperience],
        derivation_method: str,
    ) -> Optional[SEALMemory]:
        """Create a memory from LLM-generated data."""
        if not memory_data.get("content"):
            return None

        memory = SEALMemory(
            tenant_id=agent.tenant_id,
            agent_id=agent.id,
            tenant_unique_id=self.id_generator.generate_unique_id(
                tenant_id=agent.tenant_id,
                entity_type="seal_memory",
            ),
            memory_type=memory_data.get("category", "pattern"),
            category=memory_data.get("category", "general"),
            title=memory_data.get("title", "Learned pattern"),
            content=memory_data.get("content", ""),
            source_experiences=[str(e.id) for e in source_experiences],
            derivation_method=derivation_method,
            confidence=memory_data.get("confidence", 0.7),
            importance_score=memory_data.get("importance_score", 0.5),
        )

        self.session.add(memory)
        await self.session.flush()

        # Generate embedding if enabled
        if self.use_embeddings:
            await self._generate_memory_embedding(memory)

        return memory

    async def _create_memory_from_pattern(
        self,
        agent: SEALAgent,
        pattern_type: str,
        experiences: list[SEALExperience],
        title: str,
        content: str,
    ) -> Optional[SEALMemory]:
        """Create a memory from identified pattern."""
        if not content:
            return None

        memory = SEALMemory(
            tenant_id=agent.tenant_id,
            agent_id=agent.id,
            tenant_unique_id=self.id_generator.generate_unique_id(
                tenant_id=agent.tenant_id,
                entity_type="seal_memory",
            ),
            memory_type="pattern",
            category=pattern_type,
            title=title,
            content=content,
            source_experiences=[str(e.id) for e in experiences],
            derivation_method="pattern_matching",
            confidence=min(0.9, len(experiences) / 10.0),
            importance_score=0.5,
        )

        self.session.add(memory)
        await self.session.flush()  # Flush to get the ID

        # Generate and store embedding if enabled
        if self.use_embeddings:
            await self._generate_memory_embedding(memory)

        return memory

    async def _generate_memory_embedding(self, memory: SEALMemory) -> None:
        """Generate and store embedding for a memory."""
        # Create text representation of memory
        text = f"Title: {memory.title} | Content: {memory.content}"

        # Generate embedding
        embedding = await self.embeddings.generate_embedding(text)

        # Store in database
        memory.embedding = embedding

        # Store in Qdrant
        try:
            collection_name = f"memories_{memory.tenant_id}".replace("-", "_")
            await self.embeddings.create_collection(collection_name)
            await self.embeddings.upsert_embedding(
                collection_name=collection_name,
                point_id=str(memory.id),
                text=text,
                metadata={
                    "agent_id": str(memory.agent_id),
                    "memory_type": memory.memory_type,
                    "category": memory.category,
                    "importance_score": memory.importance_score,
                    "confidence": memory.confidence,
                },
            )
        except Exception as e:
            # Log error but don't fail the operation
            print(f"Warning: Failed to store memory embedding in Qdrant: {e}")

    def _summarize_successful_patterns(
        self,
        experiences: list[SEALExperience],
    ) -> str:
        """Summarize successful patterns from experiences."""
        if not experiences:
            return ""

        # In production, this would use LLM to generate meaningful summaries
        actions = [e.action_taken for e in experiences if e.action_taken]
        contexts = [e.task_name for e in experiences if e.task_name]

        summary_parts = []
        if actions:
            summary_parts.append(
                f"Successful actions observed in {len(experiences)} experiences:"
            )
            summary_parts.extend([f"- {action[:100]}" for action in actions[:5]])

        if contexts:
            unique_tasks = list(set(contexts))
            summary_parts.append(f"\nSuccessful in tasks: {', '.join(unique_tasks[:5])}")

        return "\n".join(summary_parts)

    def _summarize_error_patterns(
        self,
        experiences: list[SEALExperience],
    ) -> str:
        """Summarize error patterns from experiences."""
        if not experiences:
            return ""

        error_types = {}
        for exp in experiences:
            if exp.error_type:
                error_types[exp.error_type] = error_types.get(exp.error_type, 0) + 1

        summary_parts = [f"Analyzed {len(experiences)} error occurrences:"]

        for error_type, count in sorted(error_types.items(), key=lambda x: x[1], reverse=True):
            summary_parts.append(f"- {error_type}: {count} occurrences")

        # Add sample error messages
        sample_errors = [e.error_message for e in experiences[:3] if e.error_message]
        if sample_errors:
            summary_parts.append("\nSample errors:")
            summary_parts.extend([f"- {err[:100]}" for err in sample_errors])

        return "\n".join(summary_parts)

    def _summarize_performance_insights(
        self,
        experiences: list[SEALExperience],
    ) -> str:
        """Summarize performance insights from experiences."""
        if not experiences:
            return ""

        scores = [e.performance_score for e in experiences if e.performance_score is not None]
        if not scores:
            return ""

        avg_score = sum(scores) / len(scores)
        max_score = max(scores)
        min_score = min(scores)

        # Find high-performing experiences
        high_performers = [
            e for e in experiences
            if e.performance_score and e.performance_score >= 0.8
        ]

        summary_parts = [
            f"Performance analysis from {len(experiences)} experiences:",
            f"- Average score: {avg_score:.2f}",
            f"- Range: {min_score:.2f} to {max_score:.2f}",
        ]

        if high_performers:
            summary_parts.append(
                f"\n{len(high_performers)} high-performing experiences (≥0.8) identified"
            )
            tasks = [e.task_name for e in high_performers[:5] if e.task_name]
            if tasks:
                summary_parts.append(f"Top tasks: {', '.join(tasks)}")

        return "\n".join(summary_parts)

    async def retrieve_relevant_memories(
        self,
        agent_id: uuid.UUID,
        context: str,
        limit: int = 5,
        memory_type: Optional[str] = None,
        score_threshold: float = 0.5,
    ) -> list[SEALMemory]:
        """
        Retrieve relevant memories for a given context using semantic search.

        Args:
            agent_id: Agent ID
            context: Context string for similarity search
            limit: Maximum number of memories to return
            memory_type: Optional filter by memory type
            score_threshold: Minimum similarity score (0-1)

        Returns:
            List of relevant memories, ordered by relevance
        """
        # Get agent to find tenant_id
        agent = await self.session.get(SEALAgent, agent_id)
        if not agent:
            return []

        memories = []

        # Try semantic search if embeddings are enabled and context is provided
        if self.use_embeddings and context and context.strip():
            try:
                collection_name = f"memories_{agent.tenant_id}".replace("-", "_")

                # Search in Qdrant
                results = await self.embeddings.search_similar(
                    collection_name=collection_name,
                    query=context,
                    limit=limit * 2,  # Get more initially for filtering
                    score_threshold=score_threshold,
                )

                # Retrieve memories from database
                memory_ids = [result["id"] for result in results]
                if memory_ids:
                    stmt = select(SEALMemory).where(
                        SEALMemory.id.in_([uuid.UUID(mid) for mid in memory_ids]),
                        SEALMemory.agent_id == agent_id,
                        SEALMemory.is_active == True,
                    )

                    if memory_type:
                        stmt = stmt.where(SEALMemory.memory_type == memory_type)

                    result = await self.session.execute(stmt)
                    db_memories = {str(m.id): m for m in result.scalars().all()}

                    # Order by search results
                    for search_result in results:
                        if search_result["id"] in db_memories:
                            memory = db_memories[search_result["id"]]
                            memories.append(memory)
                            if len(memories) >= limit:
                                break

            except Exception as e:
                print(f"Warning: Semantic search failed, falling back to simple search: {e}")
                memories = []

        # Fallback to importance-based retrieval if semantic search failed or disabled
        if not memories:
            stmt = (
                select(SEALMemory)
                .where(
                    SEALMemory.agent_id == agent_id,
                    SEALMemory.is_active == True,
                )
                .order_by(SEALMemory.importance_score.desc())
            )

            if memory_type:
                stmt = stmt.where(SEALMemory.memory_type == memory_type)

            stmt = stmt.limit(limit)

            result = await self.session.execute(stmt)
            memories = list(result.scalars().all())

        # Update usage statistics
        for memory in memories:
            memory.usage_count += 1
            memory.last_used_at = datetime.now(timezone.utc)

        await self.session.commit()

        return memories

    async def update_memory_feedback(
        self,
        memory_id: uuid.UUID,
        success: bool,
    ) -> SEALMemory:
        """Update memory with feedback on its effectiveness."""
        memory = await self.session.get(SEALMemory, memory_id)
        if not memory:
            raise ValueError(f"Memory {memory_id} not found")

        if success:
            memory.success_count += 1
        else:
            memory.failure_count += 1

        # Update importance score
        memory.update_importance()

        # Validate memory after sufficient usage
        if memory.usage_count >= 5 and not memory.is_validated:
            if memory.calculate_effectiveness() >= 0.7:
                memory.is_validated = True

        await self.session.commit()
        await self.session.refresh(memory)

        return memory

    async def evolve_agent(
        self,
        agent_id: uuid.UUID,
        iterations: Optional[int] = None,
    ) -> dict[str, Any]:
        """
        Run evolution cycle for an agent.

        This orchestrates the full SEAL loop.
        """
        agent = await self.session.get(SEALAgent, agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        if not agent.seal_enabled:
            return {"status": "disabled", "message": "SEAL is disabled for this agent"}

        max_iterations = iterations or agent.max_iterations

        results = {
            "agent_id": str(agent_id),
            "cycles_completed": 0,
            "memories_created": 0,
            "experiences_processed": 0,
            "improvements": [],
        }

        for i in range(max_iterations):
            # Trigger reflection
            memories = await self.trigger_reflection(agent_id)

            if not memories:
                break  # No more experiences to process

            results["cycles_completed"] += 1
            results["memories_created"] += len(memories)

            # Track improvements
            for memory in memories:
                results["improvements"].append(
                    {
                        "type": memory.memory_type,
                        "title": memory.title,
                        "confidence": memory.confidence,
                    }
                )

        await self.session.refresh(agent)

        results.update(
            {
                "total_experiences": agent.experience_count,
                "total_memories": agent.memory_count,
                "evolution_cycles": agent.evolution_cycles,
                "success_rate": agent.calculate_success_rate(),
                "average_performance": agent.average_performance,
            }
        )

        return results

    async def get_agent_insights(
        self,
        agent_id: uuid.UUID,
    ) -> dict[str, Any]:
        """Get comprehensive insights about an agent's learning."""
        agent = await self.session.get(SEALAgent, agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Get recent experiences
        stmt = (
            select(SEALExperience)
            .where(SEALExperience.agent_id == agent_id)
            .order_by(SEALExperience.created_at.desc())
            .limit(10)
        )
        result = await self.session.execute(stmt)
        recent_experiences = list(result.scalars().all())

        # Get top memories
        stmt = (
            select(SEALMemory)
            .where(SEALMemory.agent_id == agent_id, SEALMemory.is_active == True)
            .order_by(SEALMemory.importance_score.desc())
            .limit(10)
        )
        result = await self.session.execute(stmt)
        top_memories = list(result.scalars().all())

        return {
            "agent": agent.to_dict(),
            "statistics": {
                "total_tasks": agent.total_tasks,
                "successful_tasks": agent.successful_tasks,
                "failed_tasks": agent.failed_tasks,
                "success_rate": agent.calculate_success_rate(),
                "average_performance": agent.average_performance,
                "experience_count": agent.experience_count,
                "memory_count": agent.memory_count,
                "evolution_cycles": agent.evolution_cycles,
            },
            "recent_experiences": [exp.to_dict() for exp in recent_experiences],
            "top_memories": [mem.to_dict() for mem in top_memories],
            "skills_learned": agent.skills_learned or [],
        }
