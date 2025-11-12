# User Profile Customization

This document describes the user profile customization feature in Ada, inspired by the Wayfinder system for maritime applications.

## Overview

The user profile customization system allows crew members, guests, and other users to:

1. **Create personalized profiles** with custom settings that persist across sessions
2. **Customize their avatar** appearance (face type, hair color, skin tone, shirt color)
3. **Set unit preferences** for measurements (distance, speed, depth, temperature, pressure)
4. **Secure their profile** with a personal security code (password)
5. **Track activity logs** for login/logout events and watch logs

## Key Features

### 1. User Profile Management

Each user profile includes:

- **Personal Information**: Name, email, role, group (e.g., Helm, Bridge, Engineering)
- **Authentication**: Personal security code (hashed password)
- **Customizable Settings**: Avatar and unit preferences stored in JSON
- **Multi-tenant Support**: Isolated per tenant with optional fleet assignment
- **Activity Tracking**: Automatic logging of user actions and events

### 2. Avatar Customization

Users can customize their avatar appearance with:

- **Face Type**: 6 different face options (face_1 through face_6)
- **Hair Color**: black, brown, blonde, red, gray, white
- **Skin Tone**: light, medium, tan, dark
- **Shirt Color**: white, black, blue, red, green, yellow, gray

### 3. Unit Preferences

Users can set their preferred units for:

- **Distance**: meters, feet, nautical miles, kilometers, miles
- **Speed**: knots, kph, mph, m/s
- **Depth**: meters, feet, fathoms
- **Temperature**: Celsius, Fahrenheit, Kelvin
- **Pressure**: mbar, hPa, inHg, PSI

These preferences are automatically applied whenever the user logs in, ensuring instruments display in their preferred units.

### 4. Activity Logging

The system automatically logs:

- **User Creation**: When a profile is created
- **Login/Logout**: Authentication events
- **Profile Updates**: Changes to user information
- **Avatar Updates**: Changes to avatar customization
- **Unit Preference Updates**: Changes to measurement units
- **Custom Events**: Watch start/end, vessel events, etc.

Each log entry includes:
- Timestamp
- Activity type
- Description
- Optional metadata
- Optional location data (lat, lon, vessel_id)

## API Endpoints

### Authentication

#### Create User Profile
```http
POST /api/v1/users
Content-Type: application/json

{
  "email": "tom@example.com",
  "first_name": "Tom",
  "last_name": "Anderson",
  "role": "Mechanic",
  "group": "Engineering",
  "personal_code": "1234",
  "preferences": {
    "avatar": {
      "face_type": "face_3",
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

Query Parameters:
- tenant_id (required): Tenant UUID
- fleet_id (optional): Fleet UUID
```

#### Login
```http
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "tom@example.com",
  "personal_code": "1234"
}

Query Parameters:
- tenant_id (required): Tenant UUID

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "tom@example.com",
    "first_name": "Tom",
    "role": "Mechanic",
    "group": "Engineering",
    "preferences": { ... }
  }
}
```

### Profile Management

All profile management endpoints require authentication via Bearer token in the Authorization header.

#### Get Current User Profile
```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

#### Get User Profile by ID
```http
GET /api/v1/users/{user_id}
Authorization: Bearer <access_token>
```

#### Update Current User Profile
```http
PATCH /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "Thomas",
  "phone": "+1234567890"
}
```

#### Update Avatar
```http
PATCH /api/v1/users/me/avatar
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "face_type": "face_4",
  "hair_color": "blonde",
  "skin_tone": "tan",
  "shirt_color": "red"
}
```

#### Update Unit Preferences
```http
PATCH /api/v1/users/me/units
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "distance": "meters",
  "speed": "kph",
  "temperature": "fahrenheit"
}
```

#### List Users
```http
GET /api/v1/users
Authorization: Bearer <access_token>

Query Parameters:
- fleet_id (optional): Filter by fleet UUID
- limit (optional): Maximum results (default: 100)
- offset (optional): Pagination offset (default: 0)
```

### Activity Logs

#### Get My Activity Logs
```http
GET /api/v1/users/me/activity
Authorization: Bearer <access_token>

Query Parameters:
- limit (optional): Maximum results (default: 50)
- offset (optional): Pagination offset (default: 0)
```

#### Log Custom Event
```http
POST /api/v1/users/me/activity
Authorization: Bearer <access_token>
Content-Type: application/json

Query Parameters:
- event_type: Type of event (e.g., watch_start, watch_end)
- description: Event description

Body (optional):
{
  "metadata": {
    "vessel_id": "uuid",
    "watch_duration": 240
  },
  "location": {
    "lat": 41.0082,
    "lon": 28.9784,
    "vessel_id": "uuid"
  }
}
```

## Database Schema

### Users Table Updates

New fields added to the `users` table:

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN group VARCHAR(50);
```

The existing `preferences` JSONB column stores:
```json
{
  "avatar": {
    "face_type": "face_1",
    "hair_color": "brown",
    "skin_tone": "medium",
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
```

### New Table: user_activity_logs

```sql
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_unique_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_user_activity_logs_tenant_id ON user_activity_logs(tenant_id);
CREATE INDEX ix_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX ix_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX ix_user_activity_tenant_user ON user_activity_logs(tenant_id, user_id);
CREATE INDEX ix_user_activity_tenant_type ON user_activity_logs(tenant_id, activity_type);
CREATE INDEX ix_user_activity_user_created ON user_activity_logs(user_id, created_at);
```

## Usage Example

### Creating a User Profile (Wayfinder-style)

```python
import httpx

# 1. Create a new user profile
response = httpx.post(
    "http://localhost:8000/api/v1/users",
    params={"tenant_id": "tenant-uuid-here"},
    json={
        "email": "tom@vessel.com",
        "first_name": "Tom",
        "last_name": "Anderson",
        "role": "Mechanic",
        "group": "Engineering",
        "personal_code": "1234",
        "preferences": {
            "avatar": {
                "face_type": "face_3",
                "hair_color": "brown",
                "skin_tone": "tan",
                "shirt_color": "blue"
            },
            "units": {
                "distance": "meters",
                "speed": "knots",
                "depth": "meters",
                "temperature": "celsius",
                "pressure": "mbar"
            }
        }
    }
)

user = response.json()
print(f"Created user: {user['id']}")

# 2. Login with the personal code
response = httpx.post(
    "http://localhost:8000/api/v1/users/login",
    params={"tenant_id": "tenant-uuid-here"},
    json={
        "email": "tom@vessel.com",
        "personal_code": "1234"
    }
)

auth_data = response.json()
token = auth_data["access_token"]
print(f"Logged in, token: {token}")

# 3. Update avatar settings
response = httpx.patch(
    "http://localhost:8000/api/v1/users/me/avatar",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "hair_color": "blonde",
        "skin_tone": "light"
    }
)

updated_user = response.json()
print(f"Updated avatar: {updated_user['preferences']['avatar']}")

# 4. Update unit preferences
response = httpx.patch(
    "http://localhost:8000/api/v1/users/me/units",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "distance": "feet",
        "temperature": "fahrenheit"
    }
)

updated_user = response.json()
print(f"Updated units: {updated_user['preferences']['units']}")

# 5. Log a watch event
response = httpx.post(
    "http://localhost:8000/api/v1/users/me/activity",
    headers={"Authorization": f"Bearer {token}"},
    params={
        "event_type": "watch_start",
        "description": "Started evening watch"
    },
    json={
        "metadata": {"watch_type": "evening"},
        "location": {
            "lat": 41.0082,
            "lon": 28.9784
        }
    }
)

log = response.json()
print(f"Logged event: {log['activity_type']}")

# 6. Get activity logs
response = httpx.get(
    "http://localhost:8000/api/v1/users/me/activity",
    headers={"Authorization": f"Bearer {token}"}
)

logs = response.json()
print(f"Activity log entries: {len(logs)}")
for log in logs:
    print(f"  - {log['created_at']}: {log['description']}")
```

## Security Considerations

1. **Password Hashing**: Personal codes are hashed using bcrypt before storage
2. **JWT Authentication**: All profile operations require a valid JWT token
3. **Tenant Isolation**: Users can only access profiles within their tenant
4. **Token Expiration**: Access tokens expire after 30 minutes (configurable)
5. **HTTPS Required**: Always use HTTPS in production to protect tokens

## Configuration

Environment variables for authentication:

```env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Migration

To apply the database migration:

```bash
# Run the migration
alembic upgrade head

# To rollback
alembic downgrade -1
```

## Testing

See `tests/test_user_profile.py` for comprehensive test examples.

## Integration with Wayfinder Concepts

This implementation follows the Wayfinder system's approach:

1. ✅ **User Profile Creation**: Simple profile creation with name, role, and group
2. ✅ **Personal Security Code**: PIN-based authentication for profile access
3. ✅ **Avatar Customization**: Visual customization with face, hair, skin, shirt
4. ✅ **Unit Preferences**: Customizable measurement units (feet vs. meters, etc.)
5. ✅ **Automatic Logging**: Login events and activity tracking
6. ✅ **Persistent Settings**: Preferences saved and applied across sessions
7. ✅ **Multi-user Support**: Support for multiple crew members with individual settings

## Future Enhancements

Potential improvements:

- [ ] Avatar image generation based on customization settings
- [ ] Watch scheduling and automatic watch start/end events
- [ ] User roles and permissions system
- [ ] Profile picture upload support
- [ ] Two-factor authentication
- [ ] Session management and concurrent login handling
- [ ] User groups and team management
- [ ] Notification preferences
- [ ] Language preferences
- [ ] Time zone settings
