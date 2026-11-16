from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models import Service, Deployment, Incident, MetricSnapshot, AuditLog
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceOut
from app.engines.slo_engine import SLOEngine

router = APIRouter(prefix="/services", tags=["Services"])

def enrich_service_out(service: Service, db: Session) -> ServiceOut:
    active_deps = db.query(Deployment).filter(
        Deployment.service_id == service.id,
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).count()

    active_incidents = db.query(Incident).filter(
        Incident.service_id == service.id,
        Incident.status.in_(["OPEN", "INVESTIGATING"])
    ).count()

    # Calculate recent health status based on SLO
    recent_snapshots = db.query(MetricSnapshot).filter(
        MetricSnapshot.service_id == service.id
    ).order_by(MetricSnapshot.timestamp.desc()).limit(10).all()

    slo_summary = SLOEngine.evaluate_service_slo(service, recent_snapshots)
    health = slo_summary.overall_status

    return ServiceOut(
        id=service.id,
        name=service.name,
        description=service.description,
        repo_url=service.repo_url,
        current_version=service.current_version,
        environment=service.environment,
        health_check_endpoint=service.health_check_endpoint,
        deployment_strategy=service.deployment_strategy,
        slo_target_availability=service.slo_target_availability,
        slo_max_error_rate=service.slo_max_error_rate,
        slo_max_p95_latency=service.slo_max_p95_latency,
        slo_max_cpu_pct=service.slo_max_cpu_pct,
        slo_max_memory_pct=service.slo_max_memory_pct,
        owner=service.owner,
        created_at=service.created_at,
        updated_at=service.updated_at,
        active_deployments_count=active_deps,
        active_incidents_count=active_incidents,
        health_status=health
    )

@router.get("", response_model=List[ServiceOut])
def list_services(
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Service)
    if environment and environment != "all":
        query = query.filter(Service.environment == environment)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))

    services = query.order_by(Service.name.asc()).all()
    return [enrich_service_out(s, db) for s in services]

@router.post("", response_model=ServiceOut, status_code=201)
def create_service(service_in: ServiceCreate, db: Session = Depends(get_db)):
    existing = db.query(Service).filter(Service.name == service_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Service with name '{service_in.name}' already exists.")

    service = Service(
        name=service_in.name,
        description=service_in.description,
        repo_url=service_in.repo_url,
        current_version=service_in.current_version,
        environment=service_in.environment,
        health_check_endpoint=service_in.health_check_endpoint,
        deployment_strategy=service_in.deployment_strategy,
        slo_target_availability=service_in.slo_target_availability,
        slo_max_error_rate=service_in.slo_max_error_rate,
        slo_max_p95_latency=service_in.slo_max_p95_latency,
        slo_max_cpu_pct=service_in.slo_max_cpu_pct,
        slo_max_memory_pct=service_in.slo_max_memory_pct,
        owner=service_in.owner,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    # Initial snapshot to avoid UNKNOWN telemetry
    snap = MetricSnapshot(
        service_id=service.id,
        request_count=100,
        error_count=0,
        error_rate=0.0,
        p50_latency=20.0,
        p95_latency=45.0,
        p99_latency=80.0,
        cpu_pct=25.0,
        memory_pct=35.0,
        availability=100.0,
        is_simulated=True,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(snap)

    audit = AuditLog(
        action="SERVICE_REGISTERED",
        actor="operator",
        target_type="SERVICE",
        target_id=service.id,
        details=f"Service {service.name} registered successfully.",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    return enrich_service_out(service, db)

@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: str, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")
    return enrich_service_out(service, db)

@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: str, service_in: ServiceUpdate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    update_data = service_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(service, field, val)
    service.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action="SERVICE_UPDATED",
        actor="operator",
        target_type="SERVICE",
        target_id=service.id,
        details=f"Updated service attributes: {list(update_data.keys())}",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)

    db.commit()
    db.refresh(service)
    return enrich_service_out(service, db)

@router.delete("/{service_id}")
def delete_service(service_id: str, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    service_name = service.name
    db.delete(service)
    
    audit = AuditLog(
        action="SERVICE_DELETED",
        actor="operator",
        target_type="SERVICE",
        target_id=service_id,
        details=f"Deleted service {service_name}",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    return {"message": f"Service '{service_name}' successfully removed."}
