import asyncio
from typing import Dict, Set
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Deployment, DeploymentEvent, Service, AuditLog

class DeploymentState:
    PENDING = "PENDING"
    BUILDING = "BUILDING"
    TESTING = "TESTING"
    READY = "READY"
    CANARY = "CANARY"
    MONITORING = "MONITORING"
    PROMOTED = "PROMOTED"
    PAUSED = "PAUSED"
    ROLLBACK = "ROLLBACK"
    ROLLED_BACK = "ROLLED_BACK"
    FAILED = "FAILED"

VALID_TRANSITIONS: Dict[str, Set[str]] = {
    DeploymentState.PENDING: {DeploymentState.BUILDING, DeploymentState.FAILED},
    DeploymentState.BUILDING: {DeploymentState.TESTING, DeploymentState.FAILED},
    DeploymentState.TESTING: {DeploymentState.READY, DeploymentState.FAILED},
    DeploymentState.READY: {DeploymentState.CANARY, DeploymentState.FAILED},
    DeploymentState.CANARY: {
        DeploymentState.MONITORING,
        DeploymentState.PAUSED,
        DeploymentState.ROLLBACK,
        DeploymentState.FAILED,
    },
    DeploymentState.MONITORING: {
        DeploymentState.CANARY,     # Advance to next canary stage
        DeploymentState.PROMOTED,   # Reached 100% and verified
        DeploymentState.PAUSED,
        DeploymentState.ROLLBACK,
        DeploymentState.FAILED,
    },
    DeploymentState.PAUSED: {
        DeploymentState.CANARY,     # Resume canary
        DeploymentState.MONITORING,
        DeploymentState.ROLLBACK,
    },
    DeploymentState.ROLLBACK: {
        DeploymentState.ROLLED_BACK,
        DeploymentState.FAILED,     # Failed rollback verification
    },
    DeploymentState.PROMOTED: set(),    # Terminal
    DeploymentState.ROLLED_BACK: set(), # Terminal
    DeploymentState.FAILED: set(),      # Terminal
}

class InvalidStateTransitionError(Exception):
    def __init__(self, current_state: str, target_state: str):
        super().__init__(f"Invalid transition from state '{current_state}' to '{target_state}'.")
        self.current_state = current_state
        self.target_state = target_state

# Concurrency locks registry
_locks: Dict[str, asyncio.Lock] = {}

def get_deployment_lock(deployment_id: str) -> asyncio.Lock:
    if deployment_id not in _locks:
        _locks[deployment_id] = asyncio.Lock()
    return _locks[deployment_id]

class DeploymentStateMachine:
    """
    State machine governing strict deployment lifecycles and concurrency.
    """

    @staticmethod
    def can_transition(current_state: str, target_state: str) -> bool:
        return target_state in VALID_TRANSITIONS.get(current_state, set())

    @staticmethod
    def transition(
        db: Session,
        deployment: Deployment,
        target_state: str,
        message: str,
        level: str = "INFO",
        traffic_percentage: int = None,
        failure_reason: str = None,
        rollback_reason: str = None,
        actor: str = "system-orchestrator"
    ) -> Deployment:
        current_state = deployment.status

        if not DeploymentStateMachine.can_transition(current_state, target_state):
            raise InvalidStateTransitionError(current_state, target_state)

        # Apply state updates
        deployment.status = target_state
        deployment.updated_at = datetime.now(timezone.utc)

        if traffic_percentage is not None:
            deployment.traffic_percentage = traffic_percentage

        if failure_reason:
            deployment.failure_reason = failure_reason
        if rollback_reason:
            deployment.rollback_reason = rollback_reason

        if target_state in (DeploymentState.PROMOTED, DeploymentState.ROLLED_BACK, DeploymentState.FAILED):
            deployment.completed_at = datetime.now(timezone.utc)

        # If promoted, update the service's current_version
        if target_state == DeploymentState.PROMOTED:
            service = db.query(Service).filter(Service.id == deployment.service_id).first()
            if service:
                deployment.previous_healthy_version = service.current_version
                service.current_version = deployment.version
                service.updated_at = datetime.now(timezone.utc)

        # Record deployment event in timeline
        event = DeploymentEvent(
            deployment_id=deployment.id,
            stage=target_state,
            message=message,
            level=level,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(event)

        # Record immutable audit log
        audit = AuditLog(
            action=f"DEPLOYMENT_STATE_CHANGE_{target_state}",
            actor=actor,
            target_type="DEPLOYMENT",
            target_id=deployment.id,
            details=f"Transitioned from {current_state} to {target_state}. Reason/Note: {message}",
            outcome="SUCCESS",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(deployment)
        return deployment
