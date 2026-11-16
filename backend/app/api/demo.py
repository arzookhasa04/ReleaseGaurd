from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.models import Service, Deployment, DeploymentEvent, MetricSnapshot, AuditLog
from app.schemas.deployment import DeploymentOut
from app.api.deployments import enrich_deployment_out
from app.engines.state_machine import DeploymentStateMachine, DeploymentState
from app.engines.rollback_engine import RollbackEngine
from app.adapters.simulator import DeploymentSimulator
from app.adapters.kubernetes import KubernetesAdapter
from app.services.demo_seeder import seed_demo_data

router = APIRouter(prefix="/demo", tags=["Demo Scenarios"])

@router.get("/status")
def get_demo_status():
    return {
        "cluster_info": KubernetesAdapter.get_cluster_status(),
        "available_scenarios": [
            {
                "id": "scenario-1",
                "name": "DEMO 1: Successful Canary Deployment",
                "description": "Deploys a healthy release (e.g. policy-api v3.2.0), passes automated quality tests, scales canary traffic (10% -> 50% -> 100%), and verifies SLO compliance.",
                "expected_outcome": "PROMOTED with 100% traffic"
            },
            {
                "id": "scenario-2",
                "name": "DEMO 2: High Error Rate Violation & Auto-Rollback",
                "description": "Deploys a faulty release (claims-api v2.4.1-err). The canary produces 8.5% HTTP 500 errors. ReleaseGuard detects the SLO violation, halts traffic, and automatically rolls back to the previous healthy version.",
                "expected_outcome": "ROLLED_BACK to baseline, Incident created with AI RCA"
            },
            {
                "id": "scenario-3",
                "name": "DEMO 3: Latency Degradation & Deployment Pause",
                "description": "Deploys an unoptimized release (payment-service v1.8.5-lat) that spikes P95 latency to 750ms. ReleaseGuard safety gate intercepts the SLO breach and automatically pauses the rollout to prevent SLA penalty.",
                "expected_outcome": "PAUSED with diagnostic alerts"
            }
        ]
    }

@router.post("/reset")
def reset_demo_data_endpoint(db: Session = Depends(get_db)):
    """Resets the demo environment to its pristine starting state."""
    seed_demo_data(db, force=True)
    return {"status": "SUCCESS", "message": "Demo data reset successfully."}

@router.post("/scenario-1", response_model=DeploymentOut)
def run_scenario_1(db: Session = Depends(get_db)):
    """DEMO 1: Successful Canary Deployment on policy-api"""
    service = db.query(Service).filter(Service.name == "policy-api").first()
    if not service:
        seed_demo_data(db, force=False)
        service = db.query(Service).filter(Service.name == "policy-api").first()

    # Clear active deployments on this service
    db.query(Deployment).filter(
        Deployment.service_id == service.id,
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).update({"status": "FAILED", "failure_reason": "Superceded by Demo Scenario 1"})
    db.commit()

    target_version = "v3.2.0"
    dep = Deployment(
        service_id=service.id,
        version=target_version,
        previous_healthy_version=service.current_version,
        status=DeploymentState.PENDING,
        traffic_percentage=0,
        strategy="CANARY",
        auto_rollback_enabled=True,
        is_simulated=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    # Lifecycle execution
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.BUILDING,
        f"[DEMO 1] Building container image policy-api:{target_version}..."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.TESTING,
        "[DEMO 1] Pre-deployment automated tests passed: 482 unit, 126 integration tests."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.READY,
        "[DEMO 1] Binary signed and staged in container registry."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.CANARY,
        "[DEMO 1] Routing initial 10% canary traffic. Evaluating SLO compliance...",
        traffic_percentage=10
    )
    
    # Generate healthy metric snapshot
    snap1 = MetricSnapshot(
        service_id=service.id,
        deployment_id=dep.id,
        request_count=350,
        error_count=0,
        error_rate=0.02,
        p50_latency=15.0,
        p95_latency=32.0,
        p99_latency=68.0,
        cpu_pct=26.0,
        memory_pct=36.0,
        availability=99.98,
        is_simulated=True,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(snap1)
    db.commit()

    # Progress to 50%
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.MONITORING,
        "[DEMO 1] Canary stage 1 verified healthy. Increasing traffic to 50%...",
        traffic_percentage=50
    )

    # Final Promotion to 100%
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.PROMOTED,
        f"[DEMO 1] All SLO checks satisfied. Release {target_version} successfully promoted to 100% production traffic!",
        level="SUCCESS",
        traffic_percentage=100
    )

    db.refresh(dep)
    return enrich_deployment_out(dep)

@router.post("/scenario-2", response_model=DeploymentOut)
async def run_scenario_2(db: Session = Depends(get_db)):
    """DEMO 2: High Error Rate Deployment with Automated Rollback on claims-api"""
    service = db.query(Service).filter(Service.name == "claims-api").first()
    if not service:
        seed_demo_data(db, force=False)
        service = db.query(Service).filter(Service.name == "claims-api").first()

    db.query(Deployment).filter(
        Deployment.service_id == service.id,
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).update({"status": "FAILED", "failure_reason": "Superceded by Demo Scenario 2"})
    db.commit()

    target_version = "v2.4.1-err"
    baseline_version = service.current_version
    dep = Deployment(
        service_id=service.id,
        version=target_version,
        previous_healthy_version=baseline_version,
        status=DeploymentState.PENDING,
        traffic_percentage=0,
        strategy="CANARY",
        auto_rollback_enabled=True,
        is_simulated=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    # Lifecycle execution
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.BUILDING,
        f"[DEMO 2] Building faulty release candidate claims-api:{target_version}..."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.TESTING,
        "[DEMO 2] Automated pipeline tests passed in synthetic test sandbox."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.READY,
        "[DEMO 2] Deployment prepared for canary observation."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.CANARY,
        "[DEMO 2] Routing 10% canary traffic. Active monitoring started.",
        traffic_percentage=10
    )

    # Injected high error snapshot
    snap = MetricSnapshot(
        service_id=service.id,
        deployment_id=dep.id,
        request_count=280,
        error_count=24,
        error_rate=8.57,
        p50_latency=42.0,
        p95_latency=120.0,
        p99_latency=280.0,
        cpu_pct=45.0,
        memory_pct=52.0,
        availability=91.43,
        is_simulated=True,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(snap)
    db.commit()

    # Trigger Automated Rollback!
    await RollbackEngine.execute_rollback(
        db=db,
        deployment=dep,
        triggering_reason=f"SLO Breach: HTTP Error Rate 8.57% exceeded maximum threshold of {service.slo_max_error_rate:.2f}%",
        observed_metrics={
            "error_rate": 8.57,
            "p95_latency": 120.0,
            "cpu_pct": 45.0,
            "memory_pct": 52.0,
            "availability": 91.43,
            "traffic_percentage": 10
        },
        is_automatic=True,
        actor="automated-recovery-engine"
    )

    db.refresh(dep)
    return enrich_deployment_out(dep)

@router.post("/scenario-3", response_model=DeploymentOut)
def run_scenario_3(db: Session = Depends(get_db)):
    """DEMO 3: Latency Degradation Intercepted with Deployment Pause on payment-service"""
    service = db.query(Service).filter(Service.name == "payment-service").first()
    if not service:
        seed_demo_data(db, force=False)
        service = db.query(Service).filter(Service.name == "payment-service").first()

    db.query(Deployment).filter(
        Deployment.service_id == service.id,
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).update({"status": "FAILED", "failure_reason": "Superceded by Demo Scenario 3"})
    db.commit()

    target_version = "v1.8.5-lat"
    dep = Deployment(
        service_id=service.id,
        version=target_version,
        previous_healthy_version=service.current_version,
        status=DeploymentState.PENDING,
        traffic_percentage=0,
        strategy="CANARY",
        auto_rollback_enabled=False, # Demonstrates PAUSE path
        is_simulated=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    DeploymentStateMachine.transition(
        db, dep, DeploymentState.BUILDING,
        f"[DEMO 3] Building payment-service:{target_version}..."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.TESTING,
        "[DEMO 3] Pipeline integration tests passed."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.READY,
        "[DEMO 3] Staged for deployment."
    )
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.CANARY,
        "[DEMO 3] Routing 5% canary slice.",
        traffic_percentage=5
    )

    # Injected severe latency
    snap = MetricSnapshot(
        service_id=service.id,
        deployment_id=dep.id,
        request_count=190,
        error_count=1,
        error_rate=0.52,
        p50_latency=210.0,
        p95_latency=780.0,
        p99_latency=1450.0,
        cpu_pct=68.0,
        memory_pct=60.0,
        availability=99.48,
        is_simulated=True,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(snap)
    db.commit()

    # Intercept with PAUSE
    DeploymentStateMachine.transition(
        db, dep, DeploymentState.PAUSED,
        f"[DEMO 3] SLO Threshold Intercept: P95 Latency spiked to 780.0ms (SLO limit: {service.slo_max_p95_latency}ms). Canary paused pending engineer review.",
        level="WARNING",
        actor="automated-safety-gate"
    )

    db.refresh(dep)
    return enrich_deployment_out(dep)
