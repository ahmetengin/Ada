"""
Example usage of the User Profile Customization API.

This script demonstrates the Wayfinder-style user profile management system.
"""
import asyncio
import httpx


BASE_URL = "http://localhost:8000/api/v1"
TENANT_ID = "00000000-0000-0000-0000-000000000001"  # Replace with your tenant ID


async def main():
    """Demonstrate user profile customization workflow."""
    async with httpx.AsyncClient() as client:
        print("=" * 80)
        print("User Profile Customization Example")
        print("Wayfinder-style profile management for Ada")
        print("=" * 80)
        print()

        # Step 1: Create a new user profile
        print("1. Creating a new user profile for 'Tom' (Mechanic, Engineering)...")
        try:
            response = await client.post(
                f"{BASE_URL}/users",
                params={"tenant_id": TENANT_ID},
                json={
                    "email": "tom.anderson@vessel.com",
                    "first_name": "Tom",
                    "last_name": "Anderson",
                    "role": "Mechanic",
                    "group": "Engineering",
                    "personal_code": "1234",
                    "phone": "+1234567890",
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
            )
            response.raise_for_status()
            user = response.json()
            print(f"   ✓ User created successfully!")
            print(f"   - ID: {user['id']}")
            print(f"   - Name: {user['first_name']} {user['last_name']}")
            print(f"   - Role: {user['role']}")
            print(f"   - Group: {user['group']}")
            print()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                print(f"   ✗ User already exists, continuing with login...")
            else:
                raise
            print()

        # Step 2: Login with personal code
        print("2. Logging in with email and personal code...")
        response = await client.post(
            f"{BASE_URL}/users/login",
            params={"tenant_id": TENANT_ID},
            json={
                "email": "tom.anderson@vessel.com",
                "personal_code": "1234"
            }
        )
        response.raise_for_status()
        auth_data = response.json()
        token = auth_data["access_token"]
        user = auth_data["user"]

        print(f"   ✓ Login successful!")
        print(f"   - Token: {token[:20]}...")
        print(f"   - User: {user['first_name']} {user['last_name']}")
        print()

        headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Get current user profile
        print("3. Fetching current user profile...")
        response = await client.get(f"{BASE_URL}/users/me", headers=headers)
        response.raise_for_status()
        profile = response.json()

        print(f"   ✓ Profile retrieved!")
        print(f"   - Email: {profile['email']}")
        print(f"   - Role: {profile['role']}")
        print(f"   - Group: {profile['group']}")
        print(f"   - Avatar: {profile['preferences']['avatar']}")
        print(f"   - Units: {profile['preferences']['units']}")
        print()

        # Step 4: Update avatar (make Tom look different)
        print("4. Updating avatar (changing hair color and skin tone)...")
        response = await client.patch(
            f"{BASE_URL}/users/me/avatar",
            headers=headers,
            json={
                "hair_color": "blonde",
                "skin_tone": "light",
                "shirt_color": "red"
            }
        )
        response.raise_for_status()
        updated_profile = response.json()

        print(f"   ✓ Avatar updated!")
        print(f"   - New avatar: {updated_profile['preferences']['avatar']}")
        print()

        # Step 5: Update unit preferences (convert to imperial units)
        print("5. Updating unit preferences (converting to imperial units)...")
        response = await client.patch(
            f"{BASE_URL}/users/me/units",
            headers=headers,
            json={
                "distance": "feet",
                "speed": "mph",
                "depth": "feet",
                "temperature": "fahrenheit",
                "pressure": "psi"
            }
        )
        response.raise_for_status()
        updated_profile = response.json()

        print(f"   ✓ Unit preferences updated!")
        print(f"   - New units: {updated_profile['preferences']['units']}")
        print()

        # Step 6: Log a watch start event
        print("6. Logging a watch start event...")
        response = await client.post(
            f"{BASE_URL}/users/me/activity",
            headers=headers,
            params={
                "event_type": "watch_start",
                "description": "Started evening watch shift"
            },
            json={
                "metadata": {
                    "watch_type": "evening",
                    "expected_duration_minutes": 240
                },
                "location": {
                    "lat": 41.0082,
                    "lon": 28.9784,
                    "vessel_name": "SV Indioko"
                }
            }
        )
        response.raise_for_status()
        activity_log = response.json()

        print(f"   ✓ Watch event logged!")
        print(f"   - Event: {activity_log['activity_type']}")
        print(f"   - Description: {activity_log['description']}")
        print(f"   - Timestamp: {activity_log['timestamp']}")
        print()

        # Step 7: Get activity logs
        print("7. Retrieving activity logs...")
        response = await client.get(
            f"{BASE_URL}/users/me/activity",
            headers=headers,
            params={"limit": 10}
        )
        response.raise_for_status()
        logs = response.json()

        print(f"   ✓ Retrieved {len(logs)} activity log entries:")
        for log in logs[:5]:  # Show first 5
            print(f"   - [{log['timestamp']}] {log['activity_type']}: {log['description']}")
        print()

        # Step 8: List all users in the tenant
        print("8. Listing all users in the tenant...")
        response = await client.get(f"{BASE_URL}/users", headers=headers)
        response.raise_for_status()
        users = response.json()

        print(f"   ✓ Found {len(users)} users:")
        for user in users[:5]:  # Show first 5
            print(f"   - {user['first_name']} {user['last_name']} ({user['role']}) - {user['email']}")
        print()

        print("=" * 80)
        print("Example completed successfully!")
        print("=" * 80)
        print()
        print("Key Features Demonstrated:")
        print("  ✓ User profile creation with role and group")
        print("  ✓ Secure authentication with personal code")
        print("  ✓ Avatar customization (face, hair, skin, shirt)")
        print("  ✓ Unit preference customization")
        print("  ✓ Activity logging (watch events)")
        print("  ✓ Activity log retrieval")
        print("  ✓ User listing")
        print()


if __name__ == "__main__":
    asyncio.run(main())
