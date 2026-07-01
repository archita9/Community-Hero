from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.department import Department
from app.models.issue import Issue

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/")
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.is_active == True))
    depts = result.scalars().all()
    return [
        {
            "id": d.id, "name": d.name, "code": d.code,
            "description": d.description, "icon": d.icon, "color": d.color,
            "handles_categories": d.handles_categories,
        }
        for d in depts
    ]


@router.get("/{dept_id}/stats")
async def department_stats(dept_id: str, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    total = (await db.execute(select(func.count(Issue.id)).where(Issue.department_id == dept_id))).scalar() or 0
    resolved = (await db.execute(
        select(func.count(Issue.id)).where(Issue.department_id == dept_id, Issue.status.in_(["resolved", "closed"]))
    )).scalar() or 0
    pending = total - resolved

    return {
        "department": {"id": dept.id, "name": dept.name, "code": dept.code},
        "total": total, "resolved": resolved, "pending": pending,
        "resolution_rate": round(resolved / total * 100, 1) if total else 0,
    }
