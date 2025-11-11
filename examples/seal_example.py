"""
SEAL (Self-Evolving Agent Loop) Example.

This example demonstrates how to use the SEAL system in Ada for agent learning.
"""

import asyncio
import uuid
from datetime import datetime

from ada.database.session import get_db
from ada.models import Tenant, Fleet
from ada.services.seal_manager import SEALManager


async def main():
    """Run SEAL example."""
    print("=" * 80)
    print("SEAL (Self-Evolving Agent Loop) Example")
    print("=" * 80)

    async with get_db() as session:
        manager = SEALManager(session)

        # Step 1: Create a tenant
        print("\n[1] Creating tenant...")
        tenant = Tenant(
            tenant_unique_id="demo-marina",
            name="Demo Marina",
            email="demo@marina.com",
        )
        session.add(tenant)
        await session.commit()
        await session.refresh(tenant)
        print(f"✓ Created tenant: {tenant.name} (ID: {tenant.id})")

        # Step 2: Create a fleet (optional)
        print("\n[2] Creating fleet...")
        from ada.utils.tenant_id_generator import TenantUniqueIdGenerator

        id_gen = TenantUniqueIdGenerator()
        fleet = Fleet(
            tenant_id=tenant.id,
            tenant_unique_id=id_gen.generate_unique_id(
                tenant.id, "fleet", prefix="demo"
            ),
            name="Demo Fleet",
            fleet_type="catamaran",
        )
        session.add(fleet)
        await session.commit()
        await session.refresh(fleet)
        print(f"✓ Created fleet: {fleet.name} (ID: {fleet.id})")

        # Step 3: Create a SEAL agent
        print("\n[3] Creating SEAL agent...")
        agent = await manager.create_agent(
            tenant_id=tenant.id,
            fleet_id=fleet.id,
            name="Maritime Assistant",
            agent_type="specialist",
            description="AI agent specialized in maritime operations and fleet management",
            capabilities=[
                "route_planning",
                "weather_analysis",
                "resource_optimization",
                "customer_service",
            ],
            specializations=["sailing", "navigation", "fleet_coordination"],
            system_prompt="You are a maritime AI assistant helping with fleet operations.",
            seal_enabled=True,
            max_iterations=5,
            learning_rate=0.1,
            reflection_frequency=3,  # Reflect every 3 experiences
        )
        print(f"✓ Created agent: {agent.name} (ID: {agent.id})")
        print(f"  Type: {agent.agent_type}")
        print(f"  SEAL enabled: {agent.seal_enabled}")
        print(f"  Reflection frequency: {agent.reflection_frequency}")

        # Step 4: Record successful experiences
        print("\n[4] Recording successful experiences...")

        experiences_data = [
            {
                "experience_type": "task_execution",
                "task_name": "route_planning",
                "action_taken": "Calculated optimal route from Athens to Mykonos considering weather",
                "reasoning": "Analyzed wind patterns and sea conditions to minimize travel time",
                "outcome": "Route completed 20% faster than average",
                "success": True,
                "performance_score": 0.9,
            },
            {
                "experience_type": "task_execution",
                "task_name": "weather_analysis",
                "action_taken": "Provided detailed weather forecast for next 48 hours",
                "reasoning": "Aggregated data from multiple weather services",
                "outcome": "Accurate forecast helped avoid storm",
                "success": True,
                "performance_score": 0.95,
            },
            {
                "experience_type": "decision",
                "task_name": "resource_optimization",
                "action_taken": "Recommended fuel-efficient speed for current conditions",
                "reasoning": "Balanced speed with fuel consumption based on weather",
                "outcome": "Reduced fuel consumption by 15%",
                "success": True,
                "performance_score": 0.85,
            },
        ]

        for i, exp_data in enumerate(experiences_data, 1):
            exp = await manager.record_experience(
                agent_id=agent.id,
                tenant_id=tenant.id,
                **exp_data,
            )
            print(f"  [{i}] ✓ {exp.task_name}: {exp.outcome}")

        # This triggers automatic reflection after 3 experiences
        print("\n[5] Automatic reflection triggered...")
        print("  SEAL analyzes experiences and creates memories...")

        # Step 6: Record some errors for learning
        print("\n[6] Recording error experiences...")

        error_experiences = [
            {
                "experience_type": "error",
                "task_name": "route_planning",
                "action_taken": "Attempted to plan route without checking vessel capacity",
                "reasoning": "Assumed standard capacity",
                "outcome": "Route was rejected due to passenger capacity mismatch",
                "success": False,
                "performance_score": 0.3,
                "error_occurred": True,
                "error_type": "ValidationError",
                "error_message": "Vessel capacity insufficient for planned route",
                "lessons_learned": [
                    "Always verify vessel capacity before route planning",
                    "Check passenger count against vessel specifications",
                ],
            },
            {
                "experience_type": "task_execution",
                "task_name": "customer_service",
                "action_taken": "Provided booking information",
                "reasoning": "Retrieved data from booking system",
                "outcome": "Successfully answered customer query",
                "success": True,
                "performance_score": 0.8,
            },
        ]

        for i, exp_data in enumerate(error_experiences, 1):
            exp = await manager.record_experience(
                agent_id=agent.id,
                tenant_id=tenant.id,
                **exp_data,
            )
            status = "✗" if exp.error_occurred else "✓"
            print(f"  [{i}] {status} {exp.task_name}: {exp.outcome}")

        # Step 7: Manually trigger reflection
        print("\n[7] Manually triggering reflection...")
        memories = await manager.trigger_reflection(agent.id)
        print(f"  ✓ Created {len(memories)} new memories")

        for i, memory in enumerate(memories, 1):
            print(f"\n  Memory {i}: {memory.title}")
            print(f"    Type: {memory.memory_type}")
            print(f"    Category: {memory.category}")
            print(f"    Confidence: {memory.confidence:.2f}")
            print(f"    Content preview: {memory.content[:150]}...")

        # Step 8: Run evolution cycle
        print("\n[8] Running evolution cycle...")
        results = await manager.evolve_agent(agent.id, iterations=2)

        print(f"  ✓ Evolution completed")
        print(f"    Cycles: {results['cycles_completed']}")
        print(f"    Memories created: {results['memories_created']}")
        print(f"    Total experiences: {results['total_experiences']}")
        print(f"    Success rate: {results['success_rate']:.2%}")
        print(f"    Avg performance: {results['average_performance']:.2f}")

        # Step 9: Get agent insights
        print("\n[9] Getting agent insights...")
        insights = await manager.get_agent_insights(agent.id)

        stats = insights["statistics"]
        print(f"  Agent: {insights['agent']['name']}")
        print(f"  Total tasks: {stats['total_tasks']}")
        print(f"  Successful: {stats['successful_tasks']}")
        print(f"  Failed: {stats['failed_tasks']}")
        print(f"  Success rate: {stats['success_rate']:.2%}")
        print(f"  Evolution cycles: {stats['evolution_cycles']}")

        print(f"\n  Top {len(insights['top_memories'])} memories:")
        for i, mem in enumerate(insights["top_memories"], 1):
            print(f"    {i}. {mem['title']} (importance: {mem['importance_score']:.2f})")

        # Step 10: Retrieve and use memories
        print("\n[10] Retrieving relevant memories...")
        memories = await manager.retrieve_relevant_memories(
            agent_id=agent.id,
            context="route planning",
            limit=3,
        )

        print(f"  Retrieved {len(memories)} relevant memories")
        for i, memory in enumerate(memories, 1):
            print(f"    {i}. {memory.title}")
            print(f"       Used {memory.usage_count} times")
            print(f"       Effectiveness: {memory.calculate_effectiveness():.2%}")

        # Step 11: Provide feedback on memory usage
        print("\n[11] Providing feedback on memory usage...")
        if memories:
            memory = memories[0]
            # Simulate successful application
            updated_memory = await manager.update_memory_feedback(
                memory_id=memory.id,
                success=True,
            )
            print(f"  ✓ Updated memory: {updated_memory.title}")
            print(f"    Success count: {updated_memory.success_count}")
            print(f"    Effectiveness: {updated_memory.calculate_effectiveness():.2%}")
            print(f"    Updated importance: {updated_memory.importance_score:.2f}")

        print("\n" + "=" * 80)
        print("SEAL Example Completed!")
        print("=" * 80)
        print("\nKey takeaways:")
        print("1. SEAL agents automatically learn from experiences")
        print("2. Reflection is triggered periodically or manually")
        print("3. Memories are created from patterns in experiences")
        print("4. Memories improve agent performance over time")
        print("5. The system tracks effectiveness and adapts")
        print("\nThe agent is now smarter and will continue to evolve!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
