"""
Advanced SEAL Example with Vector Embeddings and LLM Reflection.

This example demonstrates advanced SEAL features:
- Vector embeddings for semantic search
- LLM-powered intelligent reflection
- Semantic memory retrieval
"""

import asyncio
import uuid

from ada.database.session import get_db
from ada.models import Tenant, Fleet
from ada.services.seal_manager import SEALManager


async def main():
    """Run advanced SEAL example."""
    print("=" * 80)
    print("Advanced SEAL Example: Embeddings + LLM Reflection")
    print("=" * 80)

    async with get_db() as session:
        # Create SEAL Manager with all features enabled
        manager = SEALManager(
            session,
            use_embeddings=True,  # Enable vector embeddings
            use_llm_reflection=True,  # Enable LLM-powered reflection
        )

        # Step 1: Create tenant and fleet
        print("\n[1] Setting up tenant and fleet...")
        tenant = Tenant(
            tenant_unique_id="advanced-demo",
            name="Advanced Demo Marina",
            email="advanced@demo.com",
        )
        session.add(tenant)
        await session.commit()
        await session.refresh(tenant)

        from ada.utils.tenant_id_generator import TenantUniqueIdGenerator

        id_gen = TenantUniqueIdGenerator()
        fleet = Fleet(
            tenant_id=tenant.id,
            tenant_unique_id=id_gen.generate_unique_id(tenant.id, "fleet", prefix="adv"),
            name="Advanced Fleet",
            fleet_type="yacht",
        )
        session.add(fleet)
        await session.commit()
        await session.refresh(fleet)
        print(f"✓ Created tenant: {tenant.name}")
        print(f"✓ Created fleet: {fleet.name}")

        # Step 2: Create an intelligent SEAL agent
        print("\n[2] Creating intelligent SEAL agent...")
        agent = await manager.create_agent(
            tenant_id=tenant.id,
            fleet_id=fleet.id,
            name="Advanced Maritime AI",
            agent_type="specialist",
            description="Advanced AI agent with semantic learning capabilities",
            capabilities=[
                "route_optimization",
                "predictive_maintenance",
                "resource_planning",
                "customer_analytics",
            ],
            specializations=["maritime_operations", "data_analysis", "optimization"],
            seal_enabled=True,
            reflection_frequency=5,  # Reflect every 5 experiences
        )
        print(f"✓ Created agent: {agent.name}")
        print(f"  SEAL enabled: {agent.seal_enabled}")
        print(f"  Embeddings: Enabled")
        print(f"  LLM Reflection: Enabled")

        # Step 3: Record diverse experiences
        print("\n[3] Recording rich, contextual experiences...")

        experiences_data = [
            {
                "experience_type": "task_execution",
                "task_name": "route_optimization",
                "action_taken": "Optimized route from Istanbul to Bodrum using weather patterns",
                "reasoning": (
                    "Analyzed historical weather data and current conditions. "
                    "Identified optimal departure time to avoid storm system. "
                    "Calculated fuel-efficient speed profile."
                ),
                "outcome": "Route completed 25% faster with 15% less fuel consumption",
                "success": True,
                "performance_score": 0.95,
            },
            {
                "experience_type": "task_execution",
                "task_name": "predictive_maintenance",
                "action_taken": "Predicted engine maintenance need based on sensor data",
                "reasoning": (
                    "Monitored engine temperature, vibration, and oil pressure. "
                    "Detected anomalous pattern indicating impending failure."
                ),
                "outcome": "Maintenance performed before failure, saving $10,000",
                "success": True,
                "performance_score": 0.92,
            },
            {
                "experience_type": "error",
                "task_name": "resource_planning",
                "action_taken": "Attempted to allocate crew without checking certifications",
                "reasoning": "Used standard allocation algorithm",
                "outcome": "Assignment rejected due to missing certifications",
                "success": False,
                "performance_score": 0.3,
                "error_occurred": True,
                "error_type": "ValidationError",
                "error_message": "Crew member lacks required maritime certification",
                "lessons_learned": [
                    "Always verify crew certifications before assignment",
                    "Maintain real-time certification status database",
                ],
            },
            {
                "experience_type": "task_execution",
                "task_name": "customer_analytics",
                "action_taken": "Analyzed customer preferences from booking history",
                "reasoning": (
                    "Identified patterns in successful bookings. "
                    "Segmented customers by preferences and booking behavior."
                ),
                "outcome": "Increased booking conversion by 30%",
                "success": True,
                "performance_score": 0.88,
            },
            {
                "experience_type": "decision",
                "task_name": "emergency_response",
                "action_taken": "Coordinated emergency medical evacuation",
                "reasoning": (
                    "Assessed medical emergency severity. "
                    "Calculated fastest route to nearest port with medical facilities. "
                    "Coordinated with coast guard and medical services."
                ),
                "outcome": "Patient evacuated safely within optimal timeframe",
                "success": True,
                "performance_score": 0.98,
            },
        ]

        for i, exp_data in enumerate(experiences_data, 1):
            exp = await manager.record_experience(
                agent_id=agent.id,
                tenant_id=tenant.id,
                **exp_data,
            )
            print(f"  [{i}] {'✓' if exp.success else '✗'} {exp.task_name}")

        print("\n[4] Triggering LLM-powered reflection...")
        print("  Analyzing patterns with Claude AI...")

        memories = await manager.trigger_reflection(agent.id)
        print(f"\n✓ Created {len(memories)} intelligent memories")

        for i, memory in enumerate(memories, 1):
            print(f"\n  Memory {i}: {memory.title}")
            print(f"    Type: {memory.memory_type}")
            print(f"    Category: {memory.category}")
            print(f"    Method: {memory.derivation_method}")
            print(f"    Confidence: {memory.confidence:.2f}")
            print(f"    Content preview: {memory.content[:200]}...")

        # Step 5: Test semantic search
        print("\n[5] Testing semantic memory retrieval...")

        search_contexts = [
            "How to optimize routes in bad weather?",
            "What should I check before assigning crew members?",
            "Best practices for emergency situations",
        ]

        for context in search_contexts:
            print(f"\n  Query: '{context}'")
            relevant_memories = await manager.retrieve_relevant_memories(
                agent_id=agent.id,
                context=context,
                limit=2,
                score_threshold=0.3,
            )

            if relevant_memories:
                for memory in relevant_memories:
                    print(f"    → {memory.title}")
                    print(f"      Relevance: Semantic match")
                    print(f"      Usage: {memory.usage_count} times")
            else:
                print("    → No highly relevant memories found")

        # Step 6: Get comprehensive insights
        print("\n[6] Agent learning insights...")
        insights = await manager.get_agent_insights(agent.id)

        stats = insights["statistics"]
        print(f"  Total experiences: {stats['total_tasks']}")
        print(f"  Success rate: {stats['success_rate']:.1%}")
        print(f"  Avg performance: {stats['average_performance']:.2f}")
        print(f"  Evolution cycles: {stats['evolution_cycles']}")
        print(f"  Total memories: {stats['memory_count']}")

        if insights["agent"]["skills_learned"]:
            print(f"\n  Skills learned:")
            for skill in insights["agent"]["skills_learned"]:
                print(f"    • {skill}")

        print("\n" + "=" * 80)
        print("Advanced SEAL Example Completed!")
        print("=" * 80)

        print("\nKey Features Demonstrated:")
        print("1. ✓ Vector embeddings for semantic understanding")
        print("2. ✓ LLM-powered intelligent reflection")
        print("3. ✓ Context-aware memory retrieval")
        print("4. ✓ Rich experience tracking with reasoning")
        print("5. ✓ Automatic skill identification")
        print("6. ✓ Pattern recognition and insight extraction")

        print("\nThe agent now has deep semantic understanding of its experiences!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
