"""Node cloning API endpoints."""

import uuid
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/cloning", tags=["cloning"])


class CloneRequest(BaseModel):
    """Clone request schema."""

    source_node_id: str
    target_environment: str
    clone_config: dict | None = None


class CloneResponse(BaseModel):
    """Clone response schema."""

    id: uuid.UUID
    source_node_id: str
    target_node_id: str
    target_environment: str
    status: str  # pending, in_progress, completed, failed
    created_at: str
    completed_at: str | None = None
    error: str | None = None


# In-memory storage for demonstration (replace with database in production)
_clone_operations: dict[uuid.UUID, CloneResponse] = {}


@router.post("/", response_model=CloneResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_clone(clone_request: CloneRequest) -> CloneResponse:
    """
    Create a clone of an existing node.

    This initiates an asynchronous cloning operation.

    Args:
        clone_request: Clone operation request

    Returns:
        Clone operation status
    """
    operation_id = uuid.uuid4()
    target_node_id = f"{clone_request.source_node_id}-clone-{operation_id.hex[:8]}"

    clone_op = CloneResponse(
        id=operation_id,
        source_node_id=clone_request.source_node_id,
        target_node_id=target_node_id,
        target_environment=clone_request.target_environment,
        status="pending",
        created_at=str(uuid.uuid1().time),
    )

    _clone_operations[operation_id] = clone_op

    # In production, this would trigger an actual cloning operation
    # For now, we just return the pending operation

    return clone_op


@router.get("/", response_model=List[CloneResponse])
async def list_clone_operations(
    status_filter: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> List[CloneResponse]:
    """
    List all clone operations.

    Optionally filter by status.

    Args:
        status_filter: Optional status filter (pending, in_progress, completed, failed)
        limit: Maximum number of results
        offset: Offset for pagination

    Returns:
        List of clone operations
    """
    operations = list(_clone_operations.values())

    if status_filter:
        operations = [op for op in operations if op.status == status_filter]

    return operations[offset : offset + limit]


@router.get("/{operation_id}", response_model=CloneResponse)
async def get_clone_operation(operation_id: uuid.UUID) -> CloneResponse:
    """
    Get clone operation status by ID.

    Args:
        operation_id: Clone operation ID

    Returns:
        Clone operation data

    Raises:
        HTTPException: If operation not found
    """
    if operation_id not in _clone_operations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clone operation not found",
        )

    return _clone_operations[operation_id]


@router.delete("/{operation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_clone_operation(operation_id: uuid.UUID) -> None:
    """
    Cancel a pending clone operation.

    Args:
        operation_id: Clone operation ID

    Raises:
        HTTPException: If operation not found or cannot be cancelled
    """
    if operation_id not in _clone_operations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clone operation not found",
        )

    operation = _clone_operations[operation_id]
    if operation.status not in ["pending", "in_progress"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel operation in status: {operation.status}",
        )

    del _clone_operations[operation_id]
