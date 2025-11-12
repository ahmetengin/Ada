"""User profile API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from ada.config import Settings, get_settings
from ada.database.session import get_db
from ada.schemas.user_profile import (
    AvatarUpdate,
    UnitPreferencesUpdate,
    UserActivityLog,
    UserLoginRequest,
    UserLoginResponse,
    UserPreferences,
    UserProfileCreate,
    UserProfileResponse,
    UserProfileUpdate,
)
from ada.services.user_profile_service import UserProfileService
from ada.utils.auth import JWTManager

router = APIRouter(prefix="/users", tags=["users"])

security = HTTPBearer()


def get_jwt_manager(settings: Annotated[Settings, Depends(get_settings)]) -> JWTManager:
    """Get JWT manager dependency."""
    return JWTManager(
        secret_key=settings.secret_key,
        algorithm=settings.algorithm,
        access_token_expire_minutes=settings.access_token_expire_minutes,
    )


async def get_current_user_from_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    jwt_manager: Annotated[JWTManager, Depends(get_jwt_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Get current user from JWT token.

    Returns:
        Token payload with user_id, tenant_id, email, role
    """
    token = credentials.credentials
    payload = jwt_manager.verify_user_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


@router.post("/", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    user_data: UserProfileCreate,
    tenant_id: uuid.UUID,
    fleet_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Create a new user profile.

    This endpoint creates a user profile with customizable settings including:
    - Personal information (name, role, group)
    - Avatar customization (face, hair color, skin tone, shirt color)
    - Unit preferences (distance, speed, depth, temperature, pressure)
    - Personal security code

    Args:
        user_data: User profile data
        tenant_id: Tenant ID
        fleet_id: Optional fleet ID
        db: Database session

    Returns:
        Created user profile

    Raises:
        HTTPException: If user with email already exists
    """
    service = UserProfileService(db)

    try:
        user = await service.create_user(
            tenant_id=tenant_id,
            user_data=user_data,
            fleet_id=fleet_id,
        )

        # Ensure preferences are properly formatted
        if user.preferences:
            user.preferences = UserPreferences(**user.preferences)
        else:
            user.preferences = UserPreferences()

        return UserProfileResponse.model_validate(user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=UserLoginResponse)
async def login(
    login_data: UserLoginRequest,
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    jwt_manager: JWTManager = Depends(get_jwt_manager),
) -> UserLoginResponse:
    """
    Authenticate user and return access token.

    Args:
        login_data: Login credentials (email and personal code)
        tenant_id: Tenant ID
        db: Database session
        jwt_manager: JWT manager

    Returns:
        Access token and user profile

    Raises:
        HTTPException: If authentication fails
    """
    service = UserProfileService(db)

    user = await service.authenticate_user(
        tenant_id=tenant_id,
        email=login_data.email,
        personal_code=login_data.personal_code,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or personal code",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token
    access_token = jwt_manager.create_user_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        email=user.email,
        role=user.role,
    )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserLoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfileResponse.model_validate(user),
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Get current user's profile.

    Requires authentication token.

    Returns:
        Current user profile
    """
    service = UserProfileService(db)

    user = await service.get_user_by_id(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserProfileResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Get user profile by ID.

    Requires authentication token. Only users from the same tenant can view profiles.

    Args:
        user_id: User ID to retrieve

    Returns:
        User profile
    """
    service = UserProfileService(db)

    user = await service.get_user_by_id(
        user_id=user_id,
        tenant_id=uuid.UUID(current_user["tenant_id"]),
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserProfileResponse.model_validate(user)


@router.patch("/me", response_model=UserProfileResponse)
async def update_current_user_profile(
    update_data: UserProfileUpdate,
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Update current user's profile.

    Requires authentication token.

    Args:
        update_data: Profile update data

    Returns:
        Updated user profile
    """
    service = UserProfileService(db)

    user = await service.update_user_profile(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        update_data=update_data,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserProfileResponse.model_validate(user)


@router.patch("/me/avatar", response_model=UserProfileResponse)
async def update_avatar(
    avatar_update: AvatarUpdate,
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Update current user's avatar settings.

    This endpoint allows customization of:
    - Face type
    - Hair color
    - Skin tone
    - Shirt color

    Requires authentication token.

    Args:
        avatar_update: Avatar customization data

    Returns:
        Updated user profile
    """
    service = UserProfileService(db)

    user = await service.update_avatar(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        avatar_update=avatar_update,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserProfileResponse.model_validate(user)


@router.patch("/me/units", response_model=UserProfileResponse)
async def update_unit_preferences(
    unit_update: UnitPreferencesUpdate,
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """
    Update current user's unit preferences.

    This endpoint allows customization of measurement units for:
    - Distance (meters, feet, nautical miles, etc.)
    - Speed (knots, kph, mph, m/s)
    - Depth (meters, feet, fathoms)
    - Temperature (Celsius, Fahrenheit, Kelvin)
    - Pressure (mbar, hPa, inHg, PSI)

    Requires authentication token.

    Args:
        unit_update: Unit preferences data

    Returns:
        Updated user profile
    """
    service = UserProfileService(db)

    user = await service.update_unit_preferences(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        unit_update=unit_update,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Ensure preferences are properly formatted
    if user.preferences:
        user.preferences = UserPreferences(**user.preferences)
    else:
        user.preferences = UserPreferences()

    return UserProfileResponse.model_validate(user)


@router.get("/", response_model=list[UserProfileResponse])
async def list_users(
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    fleet_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[UserProfileResponse]:
    """
    List all users in the tenant.

    Optionally filter by fleet ID.

    Requires authentication token.

    Args:
        fleet_id: Optional fleet ID filter
        limit: Maximum number of results (default: 100)
        offset: Offset for pagination (default: 0)

    Returns:
        List of user profiles
    """
    service = UserProfileService(db)

    users = await service.list_users(
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        fleet_id=fleet_id,
        limit=limit,
        offset=offset,
    )

    # Format preferences for each user
    result = []
    for user in users:
        if user.preferences:
            user.preferences = UserPreferences(**user.preferences)
        else:
            user.preferences = UserPreferences()
        result.append(UserProfileResponse.model_validate(user))

    return result


@router.get("/me/activity", response_model=list[UserActivityLog])
async def get_my_activity_logs(
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[UserActivityLog]:
    """
    Get current user's activity logs.

    Returns login/logout events, profile changes, and watch logs.

    Requires authentication token.

    Args:
        limit: Maximum number of results (default: 50)
        offset: Offset for pagination (default: 0)

    Returns:
        List of activity logs
    """
    service = UserProfileService(db)

    logs = await service.get_user_activity_logs(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        limit=limit,
        offset=offset,
    )

    return [UserActivityLog.model_validate(log) for log in logs]


@router.post("/me/activity", response_model=UserActivityLog, status_code=status.HTTP_201_CREATED)
async def log_user_event(
    event_type: str,
    description: str,
    current_user: Annotated[dict, Depends(get_current_user_from_token)],
    metadata: dict | None = None,
    location: dict | None = None,
    db: AsyncSession = Depends(get_db),
) -> UserActivityLog:
    """
    Log a custom user event.

    Allows logging of custom events like watch_start, watch_end, or any other
    vessel-related activities.

    Requires authentication token.

    Args:
        event_type: Type of event (e.g., watch_start, watch_end, event)
        description: Human-readable description
        metadata: Optional additional metadata
        location: Optional location data (lat, lon, vessel_id)

    Returns:
        Created activity log
    """
    service = UserProfileService(db)

    log = await service.log_user_event(
        user_id=uuid.UUID(current_user["sub"]),
        tenant_id=uuid.UUID(current_user["tenant_id"]),
        event_type=event_type,
        description=description,
        metadata=metadata,
        location=location,
    )

    return UserActivityLog.model_validate(log)
