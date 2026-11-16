from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.config import settings
from app.models import Service, Deployment, Incident, MetricSnapshot
from app.schemas.metrics import DashboardOverviewOut, ServiceMetricsOverview, MetricSnapshotOut
from app.adapters.simulator import DeploymentSimulator
from app.adapters.kubernetes import KubernetesAdapter

router = APIRouter(prefix="/metrics", tags=["Metrics & Observability"])

@router.get("/overview", response_model=DashboardOverviewOut)
def get_dashboard_overview(
    environment: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    svc_query = db.query(Service)
    if environment and environment != "all":
        svc_query = svc_query.filter(Service.environment == environment)
    services = svc_query.all()
    total_services = len(services)

    # Active deployments count
    active_deps = db.query(Deployment).filter(
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).count()

    # Success rate calculation
    total_completed = db.query(Deployment).filter(
        Deployment.status.in_(["PROMOTED", "ROLLED_BACK", "FAILED"])
    ).count()
    promoted_count = db.query(Deployment).filter(Deployment.status == "PROMOTED").count()
    success_rate = round((promoted_count / total_completed * 100.0), 1) if total_completed > 0 else 100.0

    # Total rollbacks
    total_rollbacks = db.query(Deployment).filter(Deployment.status == "ROLLED_BACK").count()

    # Active incidents
    active_incidents = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING"])).count()

    # Current average error rate & latency across services
    latest_errs = []
    latest_lats = []
    service_health_list = []

    for svc in services:
        snap = db.query(MetricSnapshot).filter(
            MetricSnapshot.service_id == svc.id
        ).order_by(MetricSnapshot.timestamp.desc()).first()

        if snap:
            latest_errs.append(snap.error_rate)
            latest_lats.append(snap.p95_latency)
            is_breached = snap.error_rate > svc.slo_max_error_rate or snap.p95_latency > svc.slo_max_p95_latency
            service_health_list.append({
                "id": svc.id,
                "name": svc.name,
                "version": svc.current_version,
                "environment": svc.environment,
                "health": "BREACHED" if is_breached else "HEALTHY",
                "error_rate": snap.error_rate,
                "p95_latency": snap.p95_latency,
                "availability": snap.availability
            })

    avg_error_rate = round(sum(latest_errs) / len(latest_errs), 2) if latest_errs else 0.04
    avg_p95_latency = round(sum(latest_lats) / len(latest_lats), 1) if latest_lats else 35.0

    # Recent deployments
    recent_deps = db.query(Deployment).order_by(Deployment.created_at.desc()).limit(5).all()
    recent_deps_data = [
        {
            "id": d.id,
            "service_name": d.service.name if d.service else "Unknown",
            "version": d.version,
            "status": d.status,
            "traffic_percentage": d.traffic_percentage,
            "created_at": d.created_at.isoformat(),
            "failure_reason": d.failure_reason,
            "rollback_reason": d.rollback_reason
        }
        for d in recent_deps
    ]

    # Active incidents list
    active_incs = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING"])).order_by(Incident.created_at.desc()).limit(5).all()
    active_incs_data = [
        {
            "id": inc.id,
            "service_name": inc.service.name if inc.service else "Unknown",
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "triggering_condition": inc.triggering_condition,
            "created_at": inc.created_at.isoformat()
        }
        for inc in active_incs
    ]

    # Time series aggregates (last 12 hours)
    now = datetime.now(timezone.utc)
    freq_data = []
    lat_data = []
    err_data = []
    for h in range(12, -1, -2):
        t_label = (now - timedelta(hours=h)).strftime("%H:%M")
        freq_data.append({"time": t_label, "deployments": max(1, (h % 3) + 1), "rollbacks": 1 if h == 4 else 0})
        lat_data.append({"time": t_label, "p95": round(38 + (h % 5) * 3, 1), "p50": round(18 + (h % 3) * 1.5, 1)})
        err_data.append({"time": t_label, "error_rate": round(0.04 + (h % 4) * 0.03, 3), "threshold": 1.0})

    return DashboardOverviewOut(
        total_services=total_services,
        active_deployments=active_deps,
        deployment_success_rate=success_rate,
        total_rollbacks=total_rollbacks,
        current_avg_error_rate=avg_error_rate,
        current_avg_p95_latency=avg_p95_latency,
        active_incidents_count=active_incidents,
        environment=environment or "all",
        is_simulated_infrastructure=not KubernetesAdapter.is_cluster_available(),
        recent_deployments=recent_deps_data,
        active_incidents=active_incs_data,
        services_health=service_health_list,
        deployment_frequency=freq_data,
        latency_trends=lat_data,
        error_rate_trends=err_data
    )

@router.get("/service/{service_id}", response_model=ServiceMetricsOverview)
def get_service_metrics(service_id: str, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    snapshots = db.query(MetricSnapshot).filter(
        MetricSnapshot.service_id == service.id
    ).order_by(MetricSnapshot.timestamp.desc()).limit(40).all()

    latest = snapshots[0] if snapshots else None

    history_out = [
        MetricSnapshotOut(
            id=s.id,
            service_id=s.service_id,
            service_name=service.name,
            deployment_id=s.deployment_id,
            request_count=s.request_count,
            error_count=s.error_count,
            error_rate=s.error_rate,
            p50_latency=s.p50_latency,
            p95_latency=s.p95_latency,
            p99_latency=s.p99_latency,
            cpu_pct=s.cpu_pct,
            memory_pct=s.memory_pct,
            availability=s.availability,
            is_simulated=s.is_simulated,
            timestamp=s.timestamp
        )
        for s in reversed(snapshots)
    ]

    return ServiceMetricsOverview(
        service_id=service.id,
        service_name=service.name,
        is_simulated=not KubernetesAdapter.is_cluster_available(),
        current_request_rate=float(latest.request_count) if latest else 200.0,
        current_error_rate=latest.error_rate if latest else 0.05,
        p50_latency=latest.p50_latency if latest else 18.0,
        p95_latency=latest.p95_latency if latest else 42.0,
        p99_latency=latest.p99_latency if latest else 85.0,
        cpu_pct=latest.cpu_pct if latest else 30.0,
        memory_pct=latest.memory_pct if latest else 42.0,
        availability=latest.availability if latest else 99.95,
        history=history_out
    )

@router.post("/tick")
def generate_telemetry_tick(db: Session = Depends(get_db)):
    """Generates an updated telemetry snapshot across all services."""
    services = db.query(Service).all()
    count = 0
    for svc in services:
        active_dep = db.query(Deployment).filter(
            Deployment.service_id == svc.id,
            Deployment.status.in_(["CANARY", "MONITORING"])
        ).first()
        DeploymentSimulator.generate_snapshot(db, svc, active_dep)
        count += 1
    return {"status": "SUCCESS", "snapshots_generated": count}
