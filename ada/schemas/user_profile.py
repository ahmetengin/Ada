"""
User profile schemas for profile customization and management.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AvatarFaceType(str, Enum):
    """Avatar face types."""
    FACE_1 = "face_1"
    FACE_2 = "face_2"
    FACE_3 = "face_3"
    FACE_4 = "face_4"
    FACE_5 = "face_5"
    FACE_6 = "face_6"


class HairColor(str, Enum):
    """Hair color options."""
    BLACK = "black"
    BROWN = "brown"
    BLONDE = "blonde"
    RED = "red"
    GRAY = "gray"
    WHITE = "white"


class SkinTone(str, Enum):
    """Skin tone options."""
    LIGHT = "light"
    MEDIUM = "medium"
    TAN = "tan"
    DARK = "dark"


class ShirtColor(str, Enum):
    """Shirt color options."""
    WHITE = "white"
    BLACK = "black"
    BLUE = "blue"
    RED = "red"
    GREEN = "green"
    YELLOW = "yellow"
    GRAY = "gray"


class DistanceUnit(str, Enum):
    """Distance unit preferences."""
    METERS = "meters"
    FEET = "feet"
    NAUTICAL_MILES = "nautical_miles"
    KILOMETERS = "kilometers"
    MILES = "miles"


class SpeedUnit(str, Enum):
    """Speed unit preferences."""
    KNOTS = "knots"
    KPH = "kph"
    MPH = "mph"
    MS = "ms"


class TemperatureUnit(str, Enum):
    """Temperature unit preferences."""
    CELSIUS = "celsius"
    FAHRENHEIT = "fahrenheit"
    KELVIN = "kelvin"


class DepthUnit(str, Enum):
    """Depth unit preferences."""
    METERS = "meters"
    FEET = "feet"
    FATHOMS = "fathoms"


class PressureUnit(str, Enum):
    """Pressure unit preferences."""
    MBAR = "mbar"
    HPA = "hpa"
    INHG = "inhg"
    PSI = "psi"


class AvatarSettings(BaseModel):
    """Avatar customization settings."""
    face_type: AvatarFaceType = Field(default=AvatarFaceType.FACE_1, description="Avatar face type")
    hair_color: HairColor = Field(default=HairColor.BROWN, description="Hair color")
    skin_tone: SkinTone = Field(default=SkinTone.MEDIUM, description="Skin tone")
    shirt_color: ShirtColor = Field(default=ShirtColor.BLUE, description="Shirt color")


class UnitPreferences(BaseModel):
    """User unit preferences for measurements."""
    distance: DistanceUnit = Field(default=DistanceUnit.NAUTICAL_MILES, description="Distance unit")
    speed: SpeedUnit = Field(default=SpeedUnit.KNOTS, description="Speed unit")
    depth: DepthUnit = Field(default=DepthUnit.METERS, description="Depth unit")
    temperature: TemperatureUnit = Field(default=TemperatureUnit.CELSIUS, description="Temperature unit")
    pressure: PressureUnit = Field(default=PressureUnit.MBAR, description="Pressure unit")


class UserPreferences(BaseModel):
    """Complete user preferences stored in User.preferences JSON field."""
    avatar: AvatarSettings = Field(default_factory=AvatarSettings, description="Avatar customization")
    units: UnitPreferences = Field(default_factory=UnitPreferences, description="Unit preferences")

    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "avatar": {
                    "face_type": "face_1",
                    "hair_color": "brown",
                    "skin_tone": "tan",
                    "shirt_color": "blue"
                },
                "units": {
                    "distance": "nautical_miles",
                    "speed": "knots",
                    "depth": "meters",
                    "temperature": "celsius",
                    "pressure": "mbar"
                }
            }
        }


class UserProfileCreate(BaseModel):
    """Schema for creating a new user profile."""
    email: str = Field(..., description="User email address")
    username: Optional[str] = Field(None, description="Optional username")
    first_name: str = Field(..., description="First name")
    last_name: Optional[str] = Field(None, description="Last name")
    role: str = Field(..., description="User role (e.g., Captain, Mechanic, Engineer)")
    group: Optional[str] = Field(None, description="User group (e.g., Helm, Bridge, Engineering)")
    personal_code: str = Field(..., min_length=4, max_length=10, description="Personal security code (4-10 characters)")
    phone: Optional[str] = Field(None, description="Phone number")
    preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences, description="User preferences")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v.lower()


class UserProfileUpdate(BaseModel):
    """Schema for updating a user profile."""
    username: Optional[str] = Field(None, description="Username")
    first_name: Optional[str] = Field(None, description="First name")
    last_name: Optional[str] = Field(None, description="Last name")
    role: Optional[str] = Field(None, description="User role")
    group: Optional[str] = Field(None, description="User group")
    phone: Optional[str] = Field(None, description="Phone number")
    preferences: Optional[UserPreferences] = Field(None, description="User preferences")
    is_active: Optional[bool] = Field(None, description="Active status")


class AvatarUpdate(BaseModel):
    """Schema for updating only avatar settings."""
    face_type: Optional[AvatarFaceType] = None
    hair_color: Optional[HairColor] = None
    skin_tone: Optional[SkinTone] = None
    shirt_color: Optional[ShirtColor] = None


class UnitPreferencesUpdate(BaseModel):
    """Schema for updating only unit preferences."""
    distance: Optional[DistanceUnit] = None
    speed: Optional[SpeedUnit] = None
    depth: Optional[DepthUnit] = None
    temperature: Optional[TemperatureUnit] = None
    pressure: Optional[PressureUnit] = None


class UserProfileResponse(BaseModel):
    """Schema for user profile response."""
    id: UUID
    tenant_id: UUID
    fleet_id: Optional[UUID]
    email: str
    username: Optional[str]
    first_name: str
    last_name: Optional[str]
    role: str
    group: Optional[str] = None
    phone: Optional[str]
    is_active: bool
    is_verified: bool
    preferences: UserPreferences
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class UserLoginRequest(BaseModel):
    """Schema for user login."""
    email: str = Field(..., description="User email")
    personal_code: str = Field(..., description="Personal security code")


class UserLoginResponse(BaseModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class UserActivityLog(BaseModel):
    """Schema for user activity log entry."""
    id: UUID
    user_id: UUID
    tenant_id: UUID
    activity_type: str  # login, logout, watch_start, watch_end, event
    description: str
    metadata: Optional[dict] = None
    location: Optional[dict] = None  # lat, lon, vessel_id
    timestamp: datetime

    class Config:
        """Pydantic configuration."""
        from_attributes = True
