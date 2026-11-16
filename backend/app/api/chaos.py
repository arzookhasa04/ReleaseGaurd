from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models import ChaosExperiment, Service, AuditLog
from app.schemas.chaos import ChaosExperimentCreate, ChaosExperimentOut
from app.adapters.simulator import DeploymentSimulator

router = APIRouter(prefix="/chaos", tags=["Chaos Lab"])

def enrich_chaos_out(exp: ChaosExperiment) -> ChaosExperimentOut:
    return ChaosExperimentOut(
        id=exp.id,
        service_id=exp.service_id,
        service_name=exp.service.name if exp.service else "Unknown",
        experiment_type=exp.experiment_type,
        severity=exp.severity,
        latency_ms=exp.latency_ms,
        error_rate_pct=exp.error_rate_pct,
        cpu_load_pct=exp.cpu_load_pct,
        duration_seconds=exp.duration_seconds,
        is_active=exp.is_active,
        started_at=exp.started_at,
        stopped_at=exp.stopped_at,
        notes=exp.notes
    )

@router.get("/experiments", response_model=List[ChaosExperimentOut])
def list_experiments(
    service_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(ChaosExperiment)
    if service_id:
        query = query.filter(ChaosExperiment.service_id == service_id)
    if active_only:
        query = query.filter(ChaosExperiment.is_active == True)

    experiments = query.order_by(ChaosExperiment.started_at.desc()).all()
    return [enrich_chaos_out(e) for e in experiments]

@router.post("/experiments", response_model=ChaosExperimentOut, status_code=201)
def start_experiment(exp_in: ChaosExperimentCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == exp_in.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    # Stop any currently active experiment on this service
    db.query(ChaosExperiment).filter(
        ChaosExperiment.service_id == service.id,
        ChaosExperiment.is_active == True
    ).update({"is_active": False, "stopped_at": datetime.now(timezone.utc)})

    exp = ChaosExperiment(
        service_id=service.id,
        experiment_type=exp_in.experiment_type,
        severity=exp_in.severity,
        latency_ms=exp_in.latency_ms or int(exp_in.severity * 10),
        error_rate_pct=exp_in.error_rate_pct or (exp_in.severity * 0.15),
        cpu_load_pct=exp_in.cpu_load_pct or (exp_in.severity * 0.7),
        duration_seconds=exp_in.duration_seconds,
        is_active=True,
        started_at=datetime.now(timezone.utc),
        notes=exp_in.notes or f"Chaos experiment {exp_in.experiment_type} launched at {exp_in.severity}% severity."
    )
    db.add(exp)
    db.flush()

    audit = AuditLog(
        action="CHAOS_EXPERIMENT_STARTED",
        actor="chaos-engineer",
        target_type="CHAOS",
        target_id=exp.id,
        details=f"Injected {exp.experiment_type} on {service.name} (severity: {exp.severity}%)",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    db.refresh(exp)

    # Immediately tick simulator to capture the degraded metric signature
    DeploymentSimulator.generate_snapshot(db, service)

    return enrich_chaos_out(exp)

@router.post("/experiments/{experiment_id}/stop", response_model=ChaosExperimentOut)
def stop_experiment(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(ChaosExperiment).filter(ChaosExperiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Chaos experiment not found.")

    exp.is_active = False
    exp.stopped_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action="CHAOS_EXPERIMENT_STOPPED",
        actor="chaos-engineer",
        target_type="CHAOS",
        target_id=exp.id,
        details=f"Halted chaos experiment {exp.experiment_type} on service {exp.service.name if exp.service else exp.service_id}",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    db.refresh(exp)

    # Tick simulator to restore baseline
    if exp.service:
        DeploymentSimulator.generate_snapshot(db, exp.service)

    return enrich_chaos_out(exp)
