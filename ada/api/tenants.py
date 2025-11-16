"""Tenant management API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/tenants", tags=["tenants"])


class TenantCreate(BaseModel):
    """Tenant creation schema."""

    name: str
    description: str | None = None
    organization: str | None = None


class TenantResponse(BaseModel):
    """Tenant response schema."""

    id: uuid.UUID
    name: str
    description: str | None = None
    organization: str | None = None
    created_at: str
    active: bool


# In-memory storage for demonstration (replace with database in production)
_tenants: dict[uuid.UUID, TenantResponse] = {}


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant_data: TenantCreate) -> TenantResponse:
    """
    Create a new tenant.

    Args:
        tenant_data: Tenant creation data

    Returns:
        Created tenant
    """
    tenant_id = uuid.uuid4()
    tenant = TenantResponse(
        id=tenant_id,
        name=tenant_data.name,
        description=tenant_data.description,
        organization=tenant_data.organization,
        created_at=datetime.now(timezone.utc).isoformat(),
        active=True,
    )

    _tenants[tenant_id] = tenant
    return tenant


@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    limit: int = 100,
    offset: int = 0,
) -> List[TenantResponse]:
    """
    List all tenants.

    Args:
        limit: Maximum number of results
        offset: Offset for pagination

    Returns:
        List of tenants
    """
    tenants = list(_tenants.values())
    return tenants[offset : offset + limit]


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: uuid.UUID) -> TenantResponse:
    """
    Get tenant by ID.

    Args:
        tenant_id: Tenant ID

    Returns:
        Tenant data

    Raises:
        HTTPException: If tenant not found
    """
    if tenant_id not in _tenants:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    return _tenants[tenant_id]


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: uuid.UUID) -> None:
    """
    Delete a tenant.

    Args:
        tenant_id: Tenant ID

    Raises:
        HTTPException: If tenant not found
    """
    if tenant_id not in _tenants:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    del _tenants[tenant_id]
