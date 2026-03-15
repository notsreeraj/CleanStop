"""
SQLAlchemy ORM models for the stops, users, and reports tables.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Stop(Base):
    __tablename__ = "stops"

    stop_id = Column(Integer, primary_key=True, index=True)
    stop_code = Column(Text, nullable=True)
    stop_name = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

    reports = relationship("Report", back_populates="stop")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Text, primary_key=True, index=True)  # Clerk user ID
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False, unique=True)

    reports = relationship("Report", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    stop_id = Column(Integer, ForeignKey("stops.stop_id"), nullable=False, index=True)
    user_id = Column(Text, ForeignKey("users.user_id"), nullable=True, index=True)
    issue_type = Column(Text, nullable=False)  # graffiti, damage, debris, lighting, other
    description = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="open")  # open, in_progress, resolved, closed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stop = relationship("Stop", back_populates="reports")
    user = relationship("User", back_populates="reports")
