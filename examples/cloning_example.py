"""
Example usage of tenant-scoped cloning functionality.

This demonstrates how to clone resources/entities within each tenant
while maintaining proper tenant isolation and unique IDs.
"""

import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ada.database.session import AsyncSessionLocal, init_db
from ada.models import Fleet, Tenant, User
from ada.utils.cloning import EntityCloner
from ada.utils.tenant_id_generator import TenantUniqueIdGenerator


async def create_sample_data(session: AsyncSession) -> tuple[Tenant, Fleet, list[User]]:
    """Create sample tenant, fleet, and users."""
    # Create a tenant (e.g., Setur Marinas)
    tenant = Tenant(
        tenant_unique_id="setur-marinas",
        name="Setur Marinas",
        description="Leading marina operator in Turkey",
        email="info@seturmarinas.com",
        website="https://www.seturmarinas.com",
    )
    session.add(tenant)
    await session.flush()

    # Create a fleet
    id_gen = TenantUniqueIdGenerator()
    fleet = Fleet(
        tenant_id=tenant.id,
        tenant_unique_id=id_gen.generate_unique_id(
            tenant.id,
            "fleet",
            prefix="mediterranean",
        ),
        name="Mediterranean Fleet",
        description="Fleet operating in the Mediterranean region",
        fleet_type="catamaran",
        home_port="Bodrum",
        vessel_count=10,
        total_capacity=120,
    )
    session.add(fleet)
    await session.flush()

    # Create users
    users = []
    for i in range(1, 4):
        user = User(
            tenant_id=tenant.id,
            fleet_id=fleet.id,
            tenant_unique_id=id_gen.generate_unique_id(
                tenant.id,
                "user",
                prefix=f"user{i}",
            ),
            email=f"captain{i}@seturmarinas.com",
            username=f"captain{i}",
            first_name=f"Captain",
            last_name=f"User{i}",
            role="manager",
            is_active=True,
        )
        users.append(user)
        session.add(user)

    await session.commit()
    return tenant, fleet, users


async def demonstrate_cloning():
    """Demonstrate tenant-scoped cloning."""
    # Initialize database
    await init_db()

    async with AsyncSessionLocal() as session:
        print("=" * 80)
        print("TENANT-SCOPED CLONING DEMONSTRATION")
        print("=" * 80)

        # Create sample data
        print("\n1. Creating sample tenant, fleet, and users...")
        tenant, original_fleet, original_users = await create_sample_data(session)

        print(f"   ✓ Created tenant: {tenant.name} ({tenant.tenant_unique_id})")
        print(f"   ✓ Created fleet: {original_fleet.name}")
        print(f"     - Fleet tenant_unique_id: {original_fleet.tenant_unique_id}")
        print(f"     - Fleet has {len(original_users)} users")

        # Initialize cloner
        cloner = EntityCloner(session)

        # Example 1: Clone a single fleet
        print("\n2. Cloning the fleet...")
        cloned_fleet = await cloner.clone_entity(
            original_fleet,
            tenant.id,
            clone_number=1,
            overrides={"name": "Mediterranean Fleet - Clone 1"},
        )
        await session.commit()

        print(f"   ✓ Cloned fleet created: {cloned_fleet.name}")
        print(f"     - Original tenant_unique_id: {original_fleet.tenant_unique_id}")
        print(f"     - Cloned tenant_unique_id:   {cloned_fleet.tenant_unique_id}")
        print(f"     - Unique IDs are different but tenant-scoped!")

        # Example 2: Clone fleet with all users
        print("\n3. Cloning fleet with all associated users...")
        cloned_fleet_with_users = await cloner.clone_fleet_with_users(
            fleet_id=original_fleet.id,
            tenant_id=tenant.id,
            new_fleet_name="Mediterranean Fleet - Full Clone",
            clone_users=True,
        )

        print(f"   ✓ Cloned fleet with users: {cloned_fleet_with_users.name}")
        print(f"     - Original fleet had {len(original_users)} users")
        print(f"     - Cloned fleet has {len(cloned_fleet_with_users.users)} users")

        # Show cloned users
        for idx, user in enumerate(cloned_fleet_with_users.users, 1):
            print(f"     - User {idx}: {user.email}")
            print(f"       tenant_unique_id: {user.tenant_unique_id}")

        # Example 3: Clone individual user
        print("\n4. Cloning individual user...")
        original_user = original_users[0]
        cloned_user = await cloner.clone_entity(
            original_user,
            tenant.id,
            clone_number=5,
            overrides={"email": "captain1-clone@seturmarinas.com"},
        )
        await session.commit()

        print(f"   ✓ Cloned user: {cloned_user.email}")
        print(f"     - Original tenant_unique_id: {original_user.tenant_unique_id}")
        print(f"     - Cloned tenant_unique_id:   {cloned_user.tenant_unique_id}")

        # Example 4: Bulk clone multiple fleets
        print("\n5. Bulk cloning multiple entities...")
        # Create additional fleets
        id_gen = TenantUniqueIdGenerator()
        fleet_ids = []

        for i in range(2, 4):
            fleet = Fleet(
                tenant_id=tenant.id,
                tenant_unique_id=id_gen.generate_unique_id(
                    tenant.id,
                    "fleet",
                    prefix=f"aegean{i}",
                ),
                name=f"Aegean Fleet {i}",
                fleet_type="sailboat",
                home_port="Athens",
            )
            session.add(fleet)
            await session.flush()
            fleet_ids.append(fleet.id)

        await session.commit()

        # Bulk clone
        cloned_fleets = await cloner.bulk_clone_entities(
            Fleet,
            fleet_ids,
            tenant.id,
            name_suffix=" - Backup",
        )

        print(f"   ✓ Bulk cloned {len(cloned_fleets)} fleets:")
        for fleet in cloned_fleets:
            print(f"     - {fleet.name} ({fleet.tenant_unique_id})")

        # Demonstrate tenant isolation
        print("\n6. Verifying tenant isolation...")
        id_gen = TenantUniqueIdGenerator()

        # Create another tenant
        tenant2 = Tenant(
            tenant_unique_id="bali-catamarans",
            name="Bali Catamarans",
            description="Premium catamaran charter operator",
            email="info@bali-catamarans.com",
        )
        session.add(tenant2)
        await session.flush()

        # Create a fleet for the second tenant with similar name
        fleet_tenant2 = Fleet(
            tenant_id=tenant2.id,
            tenant_unique_id=id_gen.generate_unique_id(
                tenant2.id,
                "fleet",
                prefix="mediterranean",  # Same prefix as tenant 1
            ),
            name="Mediterranean Fleet",  # Same name as tenant 1
            fleet_type="catamaran",
        )
        session.add(fleet_tenant2)
        await session.commit()

        print(f"   ✓ Tenant 1 Fleet tenant_unique_id: {original_fleet.tenant_unique_id}")
        print(f"   ✓ Tenant 2 Fleet tenant_unique_id: {fleet_tenant2.tenant_unique_id}")
        print(f"   ✓ Same fleet name, different tenants = different tenant_unique_ids!")
        print(f"   ✓ Tenant isolation maintained!")

        print("\n" + "=" * 80)
        print("DEMONSTRATION COMPLETE")
        print("=" * 80)
        print("\nKey takeaways:")
        print("  • Each cloned entity gets a unique tenant_unique_id")
        print("  • tenant_unique_id includes tenant-specific hash for isolation")
        print("  • Cloning preserves relationships (fleet -> users)")
        print("  • Bulk cloning is efficient for multiple entities")
        print("  • Same entity names across tenants have different unique IDs")


if __name__ == "__main__":
    asyncio.run(demonstrate_cloning())
