import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    citizen = "citizen"
    government = "government"
    moderator = "moderator"
    admin = "admin"


class BadgeTier(str, enum.Enum):
    bronze = "bronze"
    silver = "silver"
    gold = "gold"
    champion = "champion"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.citizen)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Gamification
    points: Mapped[int] = mapped_column(Integer, default=0)
    badge_tier: Mapped[BadgeTier] = mapped_column(Enum(BadgeTier), default=BadgeTier.bronze)
    reports_submitted: Mapped[int] = mapped_column(Integer, default=0)
    reports_verified: Mapped[int] = mapped_column(Integer, default=0)
    verifications_done: Mapped[int] = mapped_column(Integer, default=0)

    # Department (for government users)
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    issues: Mapped[List["Issue"]] = relationship("Issue", back_populates="reporter", foreign_keys="Issue.reporter_id")
    verifications: Mapped[List["CommunityVerification"]] = relationship("CommunityVerification", back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="members")

    def update_badge(self):
        if self.points >= 1000:
            self.badge_tier = BadgeTier.champion
        elif self.points >= 500:
            self.badge_tier = BadgeTier.gold
        elif self.points >= 100:
            self.badge_tier = BadgeTier.silver
        else:
            self.badge_tier = BadgeTier.bronze
