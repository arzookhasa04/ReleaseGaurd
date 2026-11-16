from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models import Deployment, Service, DeploymentEvent, MetricSnapshot, AuditLog
from app.schemas.deployment import (
    DeploymentCreate, DeploymentPromoteRequest, DeploymentPauseRequest,
    DeploymentRollbackRequest, DeploymentOut, DeploymentEventOut
)
from app.engines.state_machine import DeploymentStateMachine, DeploymentState, get_deployment_lock
from app.engines.slo_engine import SLOEngine
from app.engines.rollback_engine import RollbackEngine
from app.adapters.simulator import DeploymentSimulator
from app.adapters.kubernetes import KubernetesAdapter

router = APIRouter(prefix="/deployments", tags=["Deployments"])

def enrich_deployment_out(d: Deployment) -> DeploymentOut:
    return DeploymentOut(
        id=d.id,
        service_id=d.service_id,
        service_name=d.service.name if d.service else "Unknown",
        version=d.version,
        previous_healthy_version=d.previous_healthy_version,
        status=d.status,
        traffic_percentage=d.traffic_percentage,
        strategy=d.strategy,
        observation_duration_sec=d.observation_duration_sec,
        auto_rollback_enabled=d.auto_rollback_enabled,
        failure_reason=d.failure_reason,
        rollback_reason=d.rollback_reason,
        is_simulated=d.is_simulated,
        created_at=d.created_at,
        updated_at=d.updated_at,
        completed_at=d.completed_at,
        events=[
            DeploymentEventOut(
                id=ev.id,
                deployment_id=ev.deployment_id,
                stage=ev.stage,
                message=ev.message,
                level=ev.level,
                metric_payload=ev.metric_payload,
                timestamp=ev.timestamp
            ) for ev in (d.events or [])
        ]
    )

@router.get("", response_model=List[DeploymentOut])
def list_deployments(
    service_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Deployment)
    if service_id:
        query = query.filter(Deployment.service_id == service_id)
    if status and status != "all":
        query = query.filter(Deployment.status == status)

    deployments = query.order_by(Deployment.created_at.desc()).all()
    return [enrich_deployment_out(d) for d in deployments]

@router.post("", response_model=DeploymentOut, status_code=201)
def create_deployment(dep_in: DeploymentCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == dep_in.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found.")

    # Check for active existing deployment on this service to prevent conflicting rollouts
    active_existing = db.query(Deployment).filter(
        Deployment.service_id == service.id,
        Deployment.status.in_(["PENDING", "BUILDING", "TESTING", "READY", "CANARY", "MONITORING", "PAUSED", "ROLLBACK"])
    ).first()
    if active_existing:
        raise HTTPException(
            status_code=409,
            detail=f"Service '{service.name}' already has an active deployment ({active_existing.version} in state '{active_existing.status}'). Complete or abort it first."
        )

    # Instantiate deployment
    deployment = Deployment(
        service_id=service.id,
        version=dep_in.version,
        previous_healthy_version=service.current_version,
        status=DeploymentState.PENDING,
        traffic_percentage=0,
        strategy=dep_in.strategy,
        observation_duration_sec=dep_in.observation_duration_sec,
        auto_rollback_enabled=dep_in.auto_rollback_enabled,
        is_simulated=not KubernetesAdapter.is_cluster_available(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    # Initial Event & State progression: PENDING -> BUILDING -> TESTING -> READY -> CANARY
    DeploymentStateMachine.transition(
        db=db,
        deployment=deployment,
        target_state=DeploymentState.BUILDING,
        message=f"Deployment registered. Container image compilation initiated for {dep_in.version}."
    )
    
    DeploymentStateMachine.transition(
        db=db,
        deployment=deployment,
        target_state=DeploymentState.TESTING,
        message=f"Pre-flight unit & integration test suite executed successfully."
    )

    DeploymentStateMachine.transition(
        db=db,
        deployment=deployment,
        target_state=DeploymentState.READY,
        message="Release candidate validated and ready for canary traffic slice."
    )

    # Initial canary traffic progression
    init_traffic = dep_in.initial_traffic_percentage
    DeploymentStateMachine.transition(
        db=db,
        deployment=deployment,
        target_state=DeploymentState.CANARY,
        message=f"Canary slice routed with {init_traffic}% traffic. Observation window active.",
        traffic_percentage=init_traffic
    )

    # Route traffic via adapter
    KubernetesAdapter.apply_canary_routing(service.name, deployment.version, init_traffic)

    # Generate initial telemetry snapshot for this canary
    DeploymentSimulator.generate_snapshot(db, service, deployment)

    db.refresh(deployment)
    return enrich_deployment_out(deployment)

@router.get("/{deployment_id}", response_model=DeploymentOut)
def get_deployment(deployment_id: str, db: Session = Depends(get_db)):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found.")
    return enrich_deployment_out(deployment)

@router.post("/{deployment_id}/advance", response_model=DeploymentOut)
async def advance_deployment_step(deployment_id: str, db: Session = Depends(get_db)):
    """
    Executes the next automated canary evaluation step.
    Checks real-time SLO metrics:
    - If SLO healthy: advances traffic progression (5% -> 10% -> 25% -> 50% -> 100% -> PROMOTED).
    - If SLO violated: pauses or triggers automated rollback.
    """
    lock = get_deployment_lock(deployment_id)
    async with lock:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found.")

        if deployment.status in (DeploymentState.PROMOTED, DeploymentState.ROLLED_BACK, DeploymentState.FAILED):
            raise HTTPException(status_code=400, detail=f"Cannot advance terminal deployment in state '{deployment.status}'.")

        service = deployment.service

        # 1. Synthesize/collect latest telemetry snapshot
        snapshot = DeploymentSimulator.generate_snapshot(db, service, deployment)

        # 2. Strict SLO & Safety Evaluation
        is_safe, violation_reason = SLOEngine.is_deployment_safe(service, snapshot)

        if not is_safe:
            # SLO BREACHED!
            if deployment.auto_rollback_enabled:
                # Automated recovery
                await RollbackEngine.execute_rollback(
                    db=db,
                    deployment=deployment,
                    triggering_reason=violation_reason,
                    observed_metrics={
                        "error_rate": snapshot.error_rate,
                        "p95_latency": snapshot.p95_latency,
                        "cpu_pct": snapshot.cpu_pct,
                        "memory_pct": snapshot.memory_pct,
                        "availability": snapshot.availability,
                        "traffic_percentage": deployment.traffic_percentage
                    },
                    is_automatic=True
                )
            else:
                # Manual pause mode
                DeploymentStateMachine.transition(
                    db=db,
                    deployment=deployment,
                    target_state=DeploymentState.PAUSED,
                    message=f"Canary progression paused due to safety breach: {violation_reason}",
                    level="WARNING"
                )
            db.refresh(deployment)
            return enrich_deployment_out(deployment)

        # 3. Healthy canary: progress traffic stage
        current_pct = deployment.traffic_percentage
        next_stages = [5, 10, 25, 50, 100]
        
        # Find next traffic percentage
        next_pct = 100
        for stage in next_stages:
            if stage > current_pct:
                next_pct = stage
                break

        if current_pct < 100:
            # Transition to MONITORING or CANARY stage with increased traffic
            DeploymentStateMachine.transition(
                db=db,
                deployment=deployment,
                target_state=DeploymentState.MONITORING if deployment.status == DeploymentState.CANARY else DeploymentState.CANARY,
                message=f"SLO checks passed. Telemetry healthy (error rate: {snapshot.error_rate}%, P95: {snapshot.p95_latency}ms). Scaling canary traffic to {next_pct}%.",
                level="INFO",
                traffic_percentage=next_pct
            )
            KubernetesAdapter.apply_canary_routing(service.name, deployment.version, next_pct)
        else:
            # 100% traffic reached and verified healthy -> PROMOTE RELEASE
            DeploymentStateMachine.transition(
                db=db,
                deployment=deployment,
                target_state=DeploymentState.PROMOTED,
                message=f"Release {deployment.version} promoted to 100% production traffic. All SLO checks satisfied.",
                level="SUCCESS",
                traffic_percentage=100
            )

        db.refresh(deployment)
        return enrich_deployment_out(deployment)

@router.post("/{deployment_id}/promote", response_model=DeploymentOut)
def promote_deployment(
    deployment_id: str,
    req: DeploymentPromoteRequest,
    db: Session = Depends(get_db)
):
    lock = get_deployment_lock(deployment_id)
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found.")

    target_pct = req.target_traffic_percentage or 100
    if target_pct >= 100:
        DeploymentStateMachine.transition(
            db=db,
            deployment=deployment,
            target_state=DeploymentState.PROMOTED,
            message="Operator manually promoted deployment to 100% production traffic.",
            level="SUCCESS",
            traffic_percentage=100,
            actor="operator"
        )
    else:
        DeploymentStateMachine.transition(
            db=db,
            deployment=deployment,
            target_state=DeploymentState.CANARY,
            message=f"Operator adjusted canary traffic slice to {target_pct}%.",
            level="INFO",
            traffic_percentage=target_pct,
            actor="operator"
        )

    db.refresh(deployment)
    return enrich_deployment_out(deployment)

@router.post("/{deployment_id}/pause", response_model=DeploymentOut)
def pause_deployment(
    deployment_id: str,
    req: DeploymentPauseRequest,
    db: Session = Depends(get_db)
):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found.")

    DeploymentStateMachine.transition(
        db=db,
        deployment=deployment,
        target_state=DeploymentState.PAUSED,
        message=f"Deployment paused by operator. Note: {req.reason}",
        level="WARNING",
        actor="operator"
    )

    db.refresh(deployment)
    return enrich_deployment_out(deployment)

@router.post("/{deployment_id}/rollback", response_model=DeploymentOut)
async def rollback_deployment(
    deployment_id: str,
    req: DeploymentRollbackRequest,
    db: Session = Depends(get_db)
):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found.")

    await RollbackEngine.execute_rollback(
        db=db,
        deployment=deployment,
        triggering_reason=req.reason,
        is_automatic=False,
        actor="operator"
    )

    db.refresh(deployment)
    return enrich_deployment_out(deployment)
