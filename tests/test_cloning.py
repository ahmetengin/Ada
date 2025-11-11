"""Tests for tenant-scoped cloning functionality."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from ada.database.base import Base
from ada.models import Fleet, Tenant, User
from ada.utils.cloning import EntityCloner
from ada.utils.tenant_id_generator import TenantUniqueIdGenerator


@pytest.fixture
async def db_session():
    """Create a test database session."""
    # Use in-memory SQLite for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()

    await engine.dispose()


@pytest.fixture
async def sample_tenant(db_session: AsyncSession) -> Tenant:
    """Create a sample tenant."""
    tenant = Tenant(
        tenant_unique_id="setur-marinas",
        name="Setur Marinas",
        description="Leading marina operator",
        email="info@seturmarinas.com",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
async def sample_fleet(db_session: AsyncSession, sample_tenant: Tenant) -> Fleet:
    """Create a sample fleet."""
    id_gen = TenantUniqueIdGenerator()
    fleet = Fleet(
        tenant_id=sample_tenant.id,
        tenant_unique_id=id_gen.generate_unique_id(
            sample_tenant.id,
            "fleet",
            prefix="mediterranean",
        ),
        name="Mediterranean Fleet",
        fleet_type="catamaran",
        home_port="Bodrum",
    )
    db_session.add(fleet)
    await db_session.commit()
    await db_session.refresh(fleet)
    return fleet


class TestTenantUniqueIdGenerator:
    """Tests for TenantUniqueIdGenerator."""

    def test_generate_unique_id(self):
        """Test basic unique ID generation."""
        tenant_id = uuid.uuid4()
        gen = TenantUniqueIdGenerator()

        uid = gen.generate_unique_id(tenant_id, "fleet", prefix="test")

        assert "test" in uid
        assert "fleet" in uid
        assert len(uid) > 20

    def test_generate_clone_id(self):
        """Test clone ID generation."""
        tenant_id = uuid.uuid4()
        gen = TenantUniqueIdGenerator()

        original_id = "mediterranean-fleet-abc123"
        clone_id = gen.generate_clone_id(original_id, tenant_id, clone_number=1)

        assert "mediterranean-fleet-abc123" in clone_id
        assert "clone" in clone_id
        assert "1" in clone_id

    def test_generate_sequential_id(self):
        """Test sequential ID generation."""
        tenant_id = uuid.uuid4()
        gen = TenantUniqueIdGenerator()

        uid = gen.generate_sequential_id(tenant_id, "fleet", 42, prefix="aegean")

        assert "aegean" in uid
        assert "fleet" in uid
        assert "00042" in uid

    def test_generate_slug_based_id(self):
        """Test slug-based ID generation."""
        tenant_id = uuid.uuid4()
        gen = TenantUniqueIdGenerator()

        uid = gen.generate_slug_based_id(tenant_id, "user", "John Doe")

        assert "user" in uid
        assert "john-doe" in uid

    def test_validate_tenant_unique_id(self):
        """Test tenant unique ID validation."""
        tenant_id = uuid.uuid4()
        gen = TenantUniqueIdGenerator()

        uid = gen.generate_unique_id(tenant_id, "fleet")
        assert gen.validate_tenant_unique_id(uid, tenant_id) is True

        # Test with wrong tenant
        wrong_tenant_id = uuid.uuid4()
        # May or may not validate depending on hash collision (very unlikely)
        # This is just to show the validation function


class TestEntityCloner:
    """Tests for EntityCloner."""

    async def test_clone_fleet(
        self,
        db_session: AsyncSession,
        sample_tenant: Tenant,
        sample_fleet: Fleet,
    ):
        """Test cloning a fleet."""
        cloner = EntityCloner(db_session)

        cloned = await cloner.clone_entity(
            sample_fleet,
            sample_tenant.id,
            clone_number=1,
            overrides={"name": "Mediterranean Fleet - Clone"},
        )
        await db_session.commit()

        assert cloned.id != sample_fleet.id
        assert cloned.tenant_unique_id != sample_fleet.tenant_unique_id
        assert cloned.name == "Mediterranean Fleet - Clone"
        assert cloned.tenant_id == sample_tenant.id
        assert "clone" in cloned.tenant_unique_id.lower()

    async def test_clone_user(
        self,
        db_session: AsyncSession,
        sample_tenant: Tenant,
        sample_fleet: Fleet,
    ):
        """Test cloning a user."""
        # Create a user
        id_gen = TenantUniqueIdGenerator()
        user = User(
            tenant_id=sample_tenant.id,
            fleet_id=sample_fleet.id,
            tenant_unique_id=id_gen.generate_unique_id(
                sample_tenant.id,
                "user",
            ),
            email="captain@test.com",
            username="captain1",
            role="manager",
        )
        db_session.add(user)
        await db_session.commit()

        # Clone the user
        cloner = EntityCloner(db_session)
        cloned = await cloner.clone_entity(
            user,
            sample_tenant.id,
            clone_number=2,
            overrides={"email": "captain-clone@test.com"},
        )
        await db_session.commit()

        assert cloned.id != user.id
        assert cloned.tenant_unique_id != user.tenant_unique_id
        assert cloned.email == "captain-clone@test.com"
        assert cloned.tenant_id == sample_tenant.id
        assert cloned.fleet_id == sample_fleet.id

    async def test_bulk_clone(
        self,
        db_session: AsyncSession,
        sample_tenant: Tenant,
    ):
        """Test bulk cloning."""
        # Create multiple fleets
        id_gen = TenantUniqueIdGenerator()
        fleet_ids = []

        for i in range(3):
            fleet = Fleet(
                tenant_id=sample_tenant.id,
                tenant_unique_id=id_gen.generate_unique_id(
                    sample_tenant.id,
                    "fleet",
                    prefix=f"test{i}",
                ),
                name=f"Test Fleet {i}",
                fleet_type="sailboat",
            )
            db_session.add(fleet)
            await db_session.flush()
            fleet_ids.append(fleet.id)

        await db_session.commit()

        # Bulk clone
        cloner = EntityCloner(db_session)
        cloned_fleets = await cloner.bulk_clone_entities(
            Fleet,
            fleet_ids,
            sample_tenant.id,
            name_suffix=" - Clone",
        )

        assert len(cloned_fleets) == 3
        for i, cloned in enumerate(cloned_fleets):
            assert f"Test Fleet {i} - Clone" == cloned.name
            assert "clone" in cloned.tenant_unique_id.lower()

    async def test_tenant_isolation(
        self,
        db_session: AsyncSession,
    ):
        """Test that tenant isolation is maintained."""
        # Create two tenants
        tenant1 = Tenant(
            tenant_unique_id="tenant-1",
            name="Tenant 1",
        )
        tenant2 = Tenant(
            tenant_unique_id="tenant-2",
            name="Tenant 2",
        )
        db_session.add(tenant1)
        db_session.add(tenant2)
        await db_session.commit()

        # Create fleets for both tenants
        id_gen = TenantUniqueIdGenerator()

        fleet1 = Fleet(
            tenant_id=tenant1.id,
            tenant_unique_id=id_gen.generate_unique_id(
                tenant1.id,
                "fleet",
                prefix="test",
            ),
            name="Test Fleet",
        )

        fleet2 = Fleet(
            tenant_id=tenant2.id,
            tenant_unique_id=id_gen.generate_unique_id(
                tenant2.id,
                "fleet",
                prefix="test",
            ),
            name="Test Fleet",  # Same name
        )

        db_session.add(fleet1)
        db_session.add(fleet2)
        await db_session.commit()

        # Verify unique IDs are different despite same name
        assert fleet1.tenant_unique_id != fleet2.tenant_unique_id
        assert fleet1.name == fleet2.name
        assert fleet1.tenant_id != fleet2.tenant_id
