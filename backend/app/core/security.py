import json
import os
from datetime import datetime, timedelta
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Initialize Firebase Admin SDK
_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return

    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
        elif os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        else:
            print("WARNING: Firebase credentials not found. Firebase auth disabled.")
            return

        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    except Exception as e:
        print(f"WARNING: Firebase init failed: {e}. Falling back to JWT-only auth.")


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly (bypasses passlib version issues)."""
    try:
        import bcrypt as _bcrypt
        hashed = _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt())
        return hashed.decode("utf-8")
    except Exception:
        return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash - supports both raw bcrypt and passlib hashes."""
    try:
        import bcrypt as _bcrypt
        return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def verify_firebase_token(token: str) -> Optional[dict]:
    """Verify a Firebase ID token and return its claims."""
    if not _firebase_initialized:
        return None
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception:
        return None


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Get current user from JWT or Firebase token. Returns None for anonymous."""
    if not credentials:
        return None

    token = credentials.credentials

    # Try our own JWT first
    payload = decode_access_token(token)
    if payload:
        return {"uid": payload.get("sub"), "email": payload.get("email"), "role": payload.get("role", "citizen"), "source": "jwt"}

    # Try Firebase
    firebase_payload = await verify_firebase_token(token)
    if firebase_payload:
        return {
            "uid": firebase_payload.get("uid"),
            "email": firebase_payload.get("email"),
            "role": "citizen",
            "source": "firebase",
        }

    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Get current user, raise 401 if not authenticated."""
    user = await get_current_user_optional(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_role(required_role: str):
    """Factory for role-based access control."""

    async def _check_role(user: dict = Depends(get_current_user)):
        role_hierarchy = {"citizen": 0, "moderator": 1, "government": 2, "admin": 3}
        user_level = role_hierarchy.get(user.get("role", "citizen"), 0)
        required_level = role_hierarchy.get(required_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_role}",
            )
        return user

    return _check_role
