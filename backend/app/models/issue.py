import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class IssueCategory(str, enum.Enum):
    pothole = "pothole"
    garbage = "garbage"
    water_leakage = "water_leakage"
    streetlight = "streetlight"
    road_damage = "road_damage"
    wall_damage = "wall_damage"
    illegal_dumping = "illegal_dumping"
    tree_fall = "tree_fall"
    construction_hazard = "construction_hazard"
    drainage = "drainage"
    other = "other"


class IssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatus(str, enum.Enum):
    reported = "reported"
    ai_verified = "ai_verified"
    community_verified = "community_verified"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    rejected = "rejected"
    flagged = "flagged"


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Reporter
    reporter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)

    # Content
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    enhanced_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    category: Mapped[IssueCategory] = mapped_column(Enum(IssueCategory), default=IssueCategory.other)
    severity: Mapped[IssueSeverity] = mapped_column(Enum(IssueSeverity), default=IssueSeverity.medium)
    status: Mapped[IssueStatus] = mapped_column(Enum(IssueStatus), default=IssueStatus.reported)
    priority_score: Mapped[int] = mapped_column(Integer, default=0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Location
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Media
    image_urls: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    voice_note_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Resolution media
    resolution_image_urls: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Before/After AI Verification
    before_after_verified: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    before_after_result: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    before_after_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI Data
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Department assignment
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"), nullable=True)
    assigned_to_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Duplicate detection
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("issues.id"), nullable=True)
    community_support_count: Mapped[int] = mapped_column(Integer, default=0)

    # Tracking
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)

    # QR code
    qr_code_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    reporter: Mapped[Optional["User"]] = relationship("User", back_populates="issues", foreign_keys=[reporter_id])
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="issues")
    verifications: Mapped[List["CommunityVerification"]] = relationship("CommunityVerification", back_populates="issue")
    comments: Mapped[List["IssueComment"]] = relationship("IssueComment", back_populates="issue")
    status_history: Mapped[List["IssueStatusHistory"]] = relationship("IssueStatusHistory", back_populates="issue")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="issue")


class IssueComment(Base):
    __tablename__ = "issue_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id"))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="comments")


class IssueStatusHistory(Base):
    __tablename__ = "issue_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id: Mapped[str] = mapped_column(String(36), ForeignKey("issues.id"))
    old_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50))
    changed_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="status_history")
