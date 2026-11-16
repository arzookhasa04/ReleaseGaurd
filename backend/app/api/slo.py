from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models import Service, MetricSnapshot
from app.schemas.slo import SLOSummaryOut
from app.engines.slo_engine import SLOEngine

router = APIRouter(prefix="/slo", tags=["SLOs & Reliability"])

@router.get("", response_model=List[SLOSummaryOut])
def list_all_slos(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    summaries = []
    for svc in services:
        snapshots = db.query(MetricSnapshot).filter(
            MetricSnapshot.service_id == svc.id
        ).order_by(MetricSnapshot.timestamp.desc()).limit(30).all()

        summary = SLOEngine.evaluate_service_slo(svc, snapshots)
        summaries.append(summary)
    return summaries

@router.get("/{service_id}", response_model=SLOSummaryOut)
def get_service_slo(service_id: str, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    snapshots = db.query(MetricSnapshot).filter(
        MetricSnapshot.service_id == service.id
    ).order_by(MetricSnapshot.timestamp.desc()).limit(50).all()

    return SLOEngine.evaluate_service_slo(service, snapshots)
