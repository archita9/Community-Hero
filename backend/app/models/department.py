import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), unique=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    head_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Categories this department handles (JSON array of IssueCategory values)
    handles_categories: Mapped[Optional[List]] = mapped_column(JSON, default=list)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    members: Mapped[List["User"]] = relationship("User", back_populates="department")
    issues: Mapped[List["Issue"]] = relationship("Issue", back_populates="department")


class VerificationVote(str, enum.Enum):
    confirm = "confirm"
    reject = "reject"


class CommunityVerification(Base):
    __tablename__ = "community_verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id"))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    vote: Mapped[VerificationVote] = mapped_column(Enum(VerificationVote))
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="verifications")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="verifications")


class NotificationType(str, enum.Enum):
    issue_accepted = "issue_accepted"
    issue_assigned = "issue_assigned"
    issue_resolved = "issue_resolved"
    issue_closed = "issue_closed"
    nearby_issue = "nearby_issue"
    verification_request = "verification_request"
    reward_earned = "reward_earned"
    comment_added = "comment_added"
    status_changed = "status_changed"
    before_after_flagged = "before_after_flagged"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    issue_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("issues.id"), nullable=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    title: Mapped[str] = mapped_column(String(300))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")
    issue: Mapped[Optional["Issue"]] = relationship("Issue", back_populates="notifications")
