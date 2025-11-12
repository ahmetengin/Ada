"""User profile service for managing user profiles and authentication."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ada.models.user import User
from ada.models.user_activity import UserActivityLog
from ada.schemas.user_profile import (
    AvatarUpdate,
    UnitPreferencesUpdate,
    UserPreferences,
    UserProfileCreate,
    UserProfileUpdate,
)
from ada.utils.auth import PasswordHasher


class UserProfileService:
    """Service for managing user profiles."""

    def __init__(self, session: AsyncSession):
        """
        Initialize user profile service.

        Args:
            session: Database session
        """
        self.session = session
        self.password_hasher = PasswordHasher()

    async def create_user(
        self,
        tenant_id: uuid.UUID,
        user_data: UserProfileCreate,
        fleet_id: uuid.UUID | None = None,
    ) -> User:
        """
        Create a new user profile.

        Args:
            tenant_id: Tenant ID
            user_data: User profile data
            fleet_id: Optional fleet ID

        Returns:
            Created user

        Raises:
            ValueError: If email already exists for tenant
        """
        # Check if email already exists for this tenant
        existing_user = await self._get_user_by_email(tenant_id, user_data.email)
        if existing_user:
            raise ValueError(f"User with email {user_data.email} already exists")

        # Hash the personal code (password)
        password_hash = self.password_hasher.hash_password(user_data.personal_code)

        # Prepare preferences
        preferences_dict = None
        if user_data.preferences:
            preferences_dict = user_data.preferences.model_dump()

        # Create user
        user = User(
            tenant_id=tenant_id,
            fleet_id=fleet_id,
            email=user_data.email,
            username=user_data.username,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password_hash=password_hash,
            role=user_data.role,
            group=user_data.group,
            phone=user_data.phone,
            preferences=preferences_dict,
            is_active=True,
            is_verified=False,
        )

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        # Log user creation
        await self._log_activity(
            user_id=user.id,
            tenant_id=tenant_id,
            activity_type="user_created",
            description=f"User profile created for {user.full_name}",
        )

        return user

    async def get_user_by_id(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> User | None:
        """
        Get user by ID (tenant-scoped).

        Args:
            user_id: User ID
            tenant_id: Tenant ID

        Returns:
            User or None if not found
        """
        result = await self.session.execute(
            select(User).where(
                User.id == user_id,
                User.tenant_id == tenant_id,
            )
        )
        return result.scalar_one_or_none()

    async def _get_user_by_email(
        self,
        tenant_id: uuid.UUID,
        email: str,
    ) -> User | None:
        """
        Get user by email (tenant-scoped).

        Args:
            tenant_id: Tenant ID
            email: User email

        Returns:
            User or None if not found
        """
        result = await self.session.execute(
            select(User).where(
                User.tenant_id == tenant_id,
                User.email == email,
            )
        )
        return result.scalar_one_or_none()

    async def authenticate_user(
        self,
        tenant_id: uuid.UUID,
        email: str,
        personal_code: str,
    ) -> User | None:
        """
        Authenticate user with email and personal code.

        Args:
            tenant_id: Tenant ID
            email: User email
            personal_code: User personal code (password)

        Returns:
            User if authenticated, None otherwise
        """
        user = await self._get_user_by_email(tenant_id, email)

        if not user or not user.password_hash:
            return None

        if not user.is_active:
            return None

        if not self.password_hasher.verify_password(personal_code, user.password_hash):
            return None

        # Log successful login
        await self._log_activity(
            user_id=user.id,
            tenant_id=tenant_id,
            activity_type="login",
            description=f"User {user.full_name} logged in",
        )

        return user

    async def update_user_profile(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        update_data: UserProfileUpdate,
    ) -> User | None:
        """
        Update user profile.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            update_data: Update data

        Returns:
            Updated user or None if not found
        """
        user = await self.get_user_by_id(user_id, tenant_id)
        if not user:
            return None

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)

        # Handle preferences separately
        if "preferences" in update_dict and update_dict["preferences"]:
            preferences = update_dict.pop("preferences")
            user.preferences = preferences.model_dump()

        # Update other fields
        for field, value in update_dict.items():
            if hasattr(user, field):
                setattr(user, field, value)

        await self.session.commit()
        await self.session.refresh(user)

        # Log profile update
        await self._log_activity(
            user_id=user.id,
            tenant_id=tenant_id,
            activity_type="profile_updated",
            description=f"User {user.full_name} updated their profile",
        )

        return user

    async def update_avatar(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        avatar_update: AvatarUpdate,
    ) -> User | None:
        """
        Update user avatar settings.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            avatar_update: Avatar update data

        Returns:
            Updated user or None if not found
        """
        user = await self.get_user_by_id(user_id, tenant_id)
        if not user:
            return None

        # Get current preferences or create new
        preferences = UserPreferences(**user.preferences) if user.preferences else UserPreferences()

        # Update avatar settings
        avatar_dict = avatar_update.model_dump(exclude_unset=True)
        for field, value in avatar_dict.items():
            if hasattr(preferences.avatar, field):
                setattr(preferences.avatar, field, value)

        # Save updated preferences
        user.preferences = preferences.model_dump()

        await self.session.commit()
        await self.session.refresh(user)

        # Log avatar update
        await self._log_activity(
            user_id=user.id,
            tenant_id=tenant_id,
            activity_type="avatar_updated",
            description=f"User {user.full_name} updated their avatar",
        )

        return user

    async def update_unit_preferences(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        unit_update: UnitPreferencesUpdate,
    ) -> User | None:
        """
        Update user unit preferences.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            unit_update: Unit preferences update data

        Returns:
            Updated user or None if not found
        """
        user = await self.get_user_by_id(user_id, tenant_id)
        if not user:
            return None

        # Get current preferences or create new
        preferences = UserPreferences(**user.preferences) if user.preferences else UserPreferences()

        # Update unit preferences
        unit_dict = unit_update.model_dump(exclude_unset=True)
        for field, value in unit_dict.items():
            if hasattr(preferences.units, field):
                setattr(preferences.units, field, value)

        # Save updated preferences
        user.preferences = preferences.model_dump()

        await self.session.commit()
        await self.session.refresh(user)

        # Log unit preferences update
        await self._log_activity(
            user_id=user.id,
            tenant_id=tenant_id,
            activity_type="units_updated",
            description=f"User {user.full_name} updated their unit preferences",
        )

        return user

    async def list_users(
        self,
        tenant_id: uuid.UUID,
        fleet_id: uuid.UUID | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[User]:
        """
        List users for a tenant, optionally filtered by fleet.

        Args:
            tenant_id: Tenant ID
            fleet_id: Optional fleet ID filter
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of users
        """
        query = select(User).where(User.tenant_id == tenant_id)

        if fleet_id:
            query = query.where(User.fleet_id == fleet_id)

        query = query.limit(limit).offset(offset)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def _log_activity(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        activity_type: str,
        description: str,
        metadata: dict[str, Any] | None = None,
        location: dict[str, Any] | None = None,
    ) -> UserActivityLog:
        """
        Log user activity.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            activity_type: Type of activity
            description: Activity description
            metadata: Optional metadata
            location: Optional location data

        Returns:
            Created activity log
        """
        log = UserActivityLog(
            user_id=user_id,
            tenant_id=tenant_id,
            activity_type=activity_type,
            description=description,
            metadata=metadata,
            location=location,
        )

        self.session.add(log)
        await self.session.commit()
        await self.session.refresh(log)

        return log

    async def get_user_activity_logs(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[UserActivityLog]:
        """
        Get activity logs for a user.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of activity logs
        """
        result = await self.session.execute(
            select(UserActivityLog)
            .where(
                UserActivityLog.user_id == user_id,
                UserActivityLog.tenant_id == tenant_id,
            )
            .order_by(UserActivityLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def log_user_event(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        event_type: str,
        description: str,
        metadata: dict[str, Any] | None = None,
        location: dict[str, Any] | None = None,
    ) -> UserActivityLog:
        """
        Log a custom user event.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            event_type: Type of event
            description: Event description
            metadata: Optional metadata
            location: Optional location data

        Returns:
            Created activity log
        """
        return await self._log_activity(
            user_id=user_id,
            tenant_id=tenant_id,
            activity_type=event_type,
            description=description,
            metadata=metadata,
            location=location,
        )
