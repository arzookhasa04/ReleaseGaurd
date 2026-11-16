from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models import AuditLog
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if search:
        query = query.filter(
            (AuditLog.details.ilike(f"%{search}%")) |
            (AuditLog.actor.ilike(f"%{search}%")) |
            (AuditLog.target_id.ilike(f"%{search}%"))
        )

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
