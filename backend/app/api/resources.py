from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models import Resource, ResourceAllocation
from app.schemas import ResourceCreateRequest, ResourceResponse

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=list[ResourceResponse])
def list_resources():
    db = SessionLocal()
    try:
        return db.query(Resource).all()
    finally:
        db.close()


@router.post("", response_model=ResourceResponse)
def create_resource(payload: ResourceCreateRequest):
    db = SessionLocal()
    try:
        resource = Resource(
            name=payload.name,
            resource_type=payload.resource_type,
            quantity=payload.quantity,
            capacity=payload.capacity,
            availability=payload.availability,
            location=payload.location,
            status=payload.status,
        )
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource
    finally:
        db.close()


@router.get("/recommendations")
def get_recommendations():
    db = SessionLocal()
    try:
        leftover = db.query(Resource).filter(Resource.status == "available").all()
        return [{"id": r.id, "name": r.name, "resource_type": r.resource_type, "quantity": r.quantity, "location": r.location} for r in leftover]
    finally:
        db.close()
