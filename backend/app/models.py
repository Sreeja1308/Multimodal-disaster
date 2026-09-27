from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(String(50), nullable=False, default="medium")
    status = Column(String(50), nullable=False, default="open")
    priority_score = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="manual")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    allocations = relationship("ResourceAllocation", back_populates="incident")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    resource_type = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    capacity = Column(Integer, nullable=False, default=0)
    availability = Column(Integer, nullable=False, default=1)
    location = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="available")
    is_assigned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    allocations = relationship("ResourceAllocation", back_populates="resource")


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    approved = Column(Boolean, default=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="allocations")
    resource = relationship("Resource", back_populates="allocations")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    severity = Column(String(50), default="medium")
    affected_locations = Column(String(255), default="")
    message = Column(Text, nullable=False)
    language = Column(String(20), default="en")
    status = Column(String(50), default="draft")
    simulated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmergencyReport(Base):
    __tablename__ = "emergency_reports"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    category = Column(String(100), default="unknown")
    urgency = Column(String(50), default="moderate")
    location = Column(String(255), default="unknown")
    status = Column(String(50), default="pending")
    duplicate_of = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
