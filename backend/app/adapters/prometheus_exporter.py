from prometheus_client import Gauge, Counter, generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy.orm import Session
from app.models import Service, Deployment, Incident, MetricSnapshot

# Gauges and Counters
ACTIVE_DEPLOYMENTS = Gauge("releaseguard_active_deployments", "Number of currently active deployments")
SERVICE_AVAILABILITY = Gauge("releaseguard_service_availability_percent", "Current availability percent", ["service"])
SERVICE_ERROR_RATE = Gauge("releaseguard_service_error_rate_percent", "Current error rate percent", ["service"])
SERVICE_P95_LATENCY = Gauge("releaseguard_service_p95_latency_ms", "P95 latency in milliseconds", ["service"])
SERVICE_CPU = Gauge("releaseguard_service_cpu_utilization_percent", "CPU utilization percent", ["service"])
SERVICE_MEMORY = Gauge("releaseguard_service_memory_utilization_percent", "Memory utilization percent", ["service"])
ACTIVE_INCIDENTS = Gauge("releaseguard_active_incidents_total", "Number of open incidents")
TOTAL_ROLLBACKS = Counter("releaseguard_rollbacks_total", "Total automated and manual rollbacks executed")

def update_prometheus_metrics(db: Session):
    try:
        # Active deployments
        active_deps = db.query(Deployment).filter(
            Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
        ).count()
        ACTIVE_DEPLOYMENTS.set(active_deps)

        # Active incidents
        active_inc = db.query(Incident).filter(Incident.status.in_(["OPEN", "INVESTIGATING"])).count()
        ACTIVE_INCIDENTS.set(active_inc)

        # Service metrics
        services = db.query(Service).all()
        for svc in services:
            latest_snap = db.query(MetricSnapshot).filter(
                MetricSnapshot.service_id == svc.id
            ).order_by(MetricSnapshot.timestamp.desc()).first()

            if latest_snap:
                SERVICE_AVAILABILITY.labels(service=svc.name).set(latest_snap.availability)
                SERVICE_ERROR_RATE.labels(service=svc.name).set(latest_snap.error_rate)
                SERVICE_P95_LATENCY.labels(service=svc.name).set(latest_snap.p95_latency)
                SERVICE_CPU.labels(service=svc.name).set(latest_snap.cpu_pct)
                SERVICE_MEMORY.labels(service=svc.name).set(latest_snap.memory_pct)
    except Exception:
        pass

def get_prometheus_metrics_output(db: Session) -> bytes:
    update_prometheus_metrics(db)
    return generate_latest()
