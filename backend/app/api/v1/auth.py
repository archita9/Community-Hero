from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    verify_firebase_token, init_firebase
)
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegisterRequest, UserLoginRequest, FirebaseAuthRequest,
    TokenResponse, UserResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.citizen,
    )
    db.add(user)
    await db.flush()
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/firebase", response_model=TokenResponse)
async def firebase_auth(data: FirebaseAuthRequest, db: AsyncSession = Depends(get_db)):
    firebase_payload = await verify_firebase_token(data.firebase_token)
    if not firebase_payload:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    uid = firebase_payload.get("uid")
    email = firebase_payload.get("email")
    name = firebase_payload.get("name") or data.full_name
    avatar = firebase_payload.get("picture")

    # Find or create user
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()

    if not user:
        # Check by email
        if email:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

        if not user:
            user = User(
                firebase_uid=uid,
                email=email,
                full_name=name,
                avatar_url=avatar,
                role=UserRole.citizen,
            )
            db.add(user)
            await db.flush()
        else:
            user.firebase_uid = uid
            user.avatar_url = avatar or user.avatar_url

    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/anonymous", response_model=TokenResponse)
async def anonymous_login(db: AsyncSession = Depends(get_db)):
    import uuid
    anon_name = f"Hero_{uuid.uuid4().hex[:6].upper()}"
    user = User(full_name=anon_name, role=UserRole.citizen, is_anonymous=True)
    db.add(user)
    await db.flush()
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
