"""Fleet management API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/fleets", tags=["fleets"])


class FleetCreate(BaseModel):
    """Fleet creation schema."""

    name: str
    description: str | None = None
    tenant_id: uuid.UUID
    vessel_type: str | None = None


class FleetResponse(BaseModel):
    """Fleet response schema."""

    id: uuid.UUID
    name: str
    description: str | None = None
    tenant_id: uuid.UUID
    vessel_type: str | None = None
    vessel_count: int
    created_at: str
    active: bool


# In-memory storage for demonstration (replace with database in production)
_fleets: dict[uuid.UUID, FleetResponse] = {}


@router.post("/", response_model=FleetResponse, status_code=status.HTTP_201_CREATED)
async def create_fleet(fleet_data: FleetCreate) -> FleetResponse:
    """
    Create a new fleet.

    Args:
        fleet_data: Fleet creation data

    Returns:
        Created fleet
    """
    fleet_id = uuid.uuid4()
    fleet = FleetResponse(
        id=fleet_id,
        name=fleet_data.name,
        description=fleet_data.description,
        tenant_id=fleet_data.tenant_id,
        vessel_type=fleet_data.vessel_type,
        vessel_count=0,
        created_at=datetime.now(timezone.utc).isoformat(),
        active=True,
    )

    _fleets[fleet_id] = fleet
    return fleet


@router.get("/", response_model=List[FleetResponse])
async def list_fleets(
    tenant_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> List[FleetResponse]:
    """
    List all fleets.

    Optionally filter by tenant ID.

    Args:
        tenant_id: Optional tenant ID filter
        limit: Maximum number of results
        offset: Offset for pagination

    Returns:
        List of fleets
    """
    fleets = list(_fleets.values())

    if tenant_id:
        fleets = [f for f in fleets if f.tenant_id == tenant_id]

    return fleets[offset : offset + limit]


@router.get("/{fleet_id}", response_model=FleetResponse)
async def get_fleet(fleet_id: uuid.UUID) -> FleetResponse:
    """
    Get fleet by ID.

    Args:
        fleet_id: Fleet ID

    Returns:
        Fleet data

    Raises:
        HTTPException: If fleet not found
    """
    if fleet_id not in _fleets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fleet not found",
        )

    return _fleets[fleet_id]


@router.delete("/{fleet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fleet(fleet_id: uuid.UUID) -> None:
    """
    Delete a fleet.

    Args:
        fleet_id: Fleet ID

    Raises:
        HTTPException: If fleet not found
    """
    if fleet_id not in _fleets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fleet not found",
        )

    del _fleets[fleet_id]
