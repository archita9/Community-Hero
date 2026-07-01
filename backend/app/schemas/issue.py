from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class IssueCategoryEnum(str, Enum):
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


class IssueSeverityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatusEnum(str, Enum):
    reported = "reported"
    ai_verified = "ai_verified"
    community_verified = "community_verified"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    rejected = "rejected"
    flagged = "flagged"


class IssueCreateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    is_anonymous: bool = False


class IssueResponse(BaseModel):
    id: str
    issue_number: str
    title: str
    description: str
    enhanced_description: Optional[str]
    category: str
    severity: str
    status: str
    priority_score: int
    confidence_score: float
    latitude: float
    longitude: float
    address: Optional[str]
    ward: Optional[str]
    city: Optional[str]
    image_urls: Optional[List[str]]
    video_url: Optional[str]
    voice_note_url: Optional[str]
    resolution_image_urls: Optional[List[str]]
    resolution_notes: Optional[str]
    before_after_verified: Optional[bool]
    before_after_result: Optional[str]
    before_after_analysis: Optional[str]
    ai_analysis: Optional[Any]
    department_id: Optional[str]
    is_anonymous: bool
    is_duplicate: bool
    community_support_count: int
    view_count: int
    qr_code_url: Optional[str]
    reporter_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


class IssueListResponse(BaseModel):
    items: List[IssueResponse]
    total: int
    page: int
    per_page: int
    pages: int


class IssueStatusUpdateRequest(BaseModel):
    status: IssueStatusEnum
    notes: Optional[str] = None


class VerificationRequest(BaseModel):
    vote: str = Field(..., pattern="^(confirm|reject)$")
    comment: Optional[str] = None


class CommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    is_anonymous: bool = False
