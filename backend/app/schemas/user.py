from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class FirebaseAuthRequest(BaseModel):
    firebase_token: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    points: int = 0
    badge_tier: str = "bronze"
    reports_submitted: int = 0
    reports_verified: int = 0
    verifications_done: int = 0
    trust_score: Optional[float] = None
    ward: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        from pydantic import BaseModel
        data = {
            "id": str(obj.id),
            "email": obj.email,
            "full_name": obj.full_name,
            "avatar_url": obj.avatar_url,
            "role": obj.role.value if hasattr(obj.role, 'value') else str(obj.role),
            "points": obj.points or 0,
            "badge_tier": obj.badge_tier.value if hasattr(obj.badge_tier, 'value') else str(obj.badge_tier),
            "reports_submitted": obj.reports_submitted or 0,
            "reports_verified": obj.reports_verified or 0,
            "verifications_done": obj.verifications_done or 0,
            "trust_score": None,
            "ward": obj.ward,
            "city": obj.city,
            "created_at": obj.created_at,
        }
        return cls(**data)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    points: int
    badge_tier: str
    reports_submitted: int
    trust_score: Optional[float]
