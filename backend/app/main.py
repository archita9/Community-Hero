"""
Community Hero FastAPI Main Application.
"""
from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.security import init_firebase
from app.ai.router import get_all_department_defaults
from app.api.v1 import auth, issues, users, analytics, departments, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Initialize DB tables
    await init_db()

    # Initialize Firebase
    init_firebase()

    # Seed default departments
    await seed_departments()

    # Create uploads directory
    Path("./uploads").mkdir(exist_ok=True)

    yield
    # Shutdown: nothing special needed


async def seed_departments():
    """Seed default department records and default admin/officer if they don't exist."""
    from app.core.database import AsyncSessionLocal
    from app.models.department import Department
    from app.models.user import User, UserRole
    from app.core.security import hash_password
    from sqlalchemy import select

    defaults = get_all_department_defaults()
    async with AsyncSessionLocal() as db:
        # Seed departments
        for dept_data in defaults:
            result = await db.execute(
                select(Department).where(Department.code == dept_data["code"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                dept = Department(
                    name=dept_data["name"],
                    code=dept_data["code"],
                    description=dept_data["description"],
                    icon=dept_data["icon"],
                    color=dept_data["color"],
                    handles_categories=dept_data["handles_categories"],
                )
                db.add(dept)
        
        # Seed default government officer for testing
        try:
            result = await db.execute(
                select(User).where(User.email == "officer@civiclens.gov")
            )
            existing_officer = result.scalar_one_or_none()
            if not existing_officer:
                # Use bcrypt directly to avoid passlib version conflicts
                import bcrypt as _bcrypt
                raw_pw = b"password123"
                hashed = _bcrypt.hashpw(raw_pw, _bcrypt.gensalt()).decode("utf-8")
                officer = User(
                    email="officer@civiclens.gov",
                    hashed_password=hashed,
                    full_name="Officer Sector-4",
                    role=UserRole.government,
                    is_anonymous=False
                )
                db.add(officer)
        except Exception as seed_err:
            print(f"WARNING: Could not seed officer account: {seed_err}")

        await db.commit()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered civic platform — Community Hero API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for local uploads
uploads_dir = Path("./uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API Routers
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(issues.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(departments.router, prefix=API_PREFIX)
app.include_router(notifications.router)  # WebSocket (no prefix)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "env": settings.APP_ENV}
