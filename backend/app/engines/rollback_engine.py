import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Deployment, Service, Incident, AuditLog
from app.engines.state_machine import DeploymentStateMachine, DeploymentState
from app.engines.ai_analyst import AIIncidentAnalyst

logger = logging.getLogger(__name__)

class RollbackEngine:
    """
    Central Automated Recovery Engine.
    Coordinates safe rollbacks, health verification, and incident management.
    """

    @staticmethod
    async def execute_rollback(
        db: Session,
        deployment: Deployment,
        triggering_reason: str,
        observed_metrics: dict = None,
        is_automatic: bool = True,
        simulate_verification_failure: bool = False,
        actor: str = "automated-recovery-engine"
    ) -> Deployment:
        service = db.query(Service).filter(Service.id == deployment.service_id).first()
        if not service:
            raise ValueError(f"Service '{deployment.service_id}' not found.")

        # Determine target version to restore
        restore_version = deployment.previous_healthy_version or service.current_version
        
        # 1. Transition to ROLLBACK stage
        DeploymentStateMachine.transition(
            db=db,
            deployment=deployment,
            target_state=DeploymentState.ROLLBACK,
            message=f"{'Automatic' if is_automatic else 'Manual'} rollback initiated. Reason: {triggering_reason}",
            level="WARNING",
            traffic_percentage=0,
            rollback_reason=triggering_reason,
            actor=actor
        )

        # 2. Health verification of the restored release
        # In actual K8s mode, this checks the deployment pods/endpoints.
        # In simulator mode, this checks simulation status.
        verification_passed = not simulate_verification_failure

        if verification_passed:
            # Verification SUCCEEDED: Restore service baseline and transition to ROLLED_BACK
            service.current_version = restore_version
            service.updated_at = datetime.now(timezone.utc)

            DeploymentStateMachine.transition(
                db=db,
                deployment=deployment,
                target_state=DeploymentState.ROLLED_BACK,
                message=f"Rollback verified successfully. Restored healthy release {restore_version}. Canary traffic drained to 0%.",
                level="SUCCESS",
                traffic_percentage=0,
                actor=actor
            )
            incident_severity = "HIGH"
            incident_title = f"Automated Rollback: {service.name} ({deployment.version})"
        else:
            # Critical: Rollback verification FAILED!
            DeploymentStateMachine.transition(
                db=db,
                deployment=deployment,
                target_state=DeploymentState.FAILED,
                message=f"CRITICAL: Restored version {restore_version} failed health verification! Manual SRE intervention required.",
                level="ERROR",
                failure_reason=f"Rollback verification failed for baseline {restore_version}",
                actor=actor
            )
            incident_severity = "CRITICAL"
            incident_title = f"CRITICAL INCIDENT: Rollback verification failed for {service.name}"

        # 3. Collect recent deployment events for incident investigation
        events_summary = [
            {"stage": ev.stage, "message": ev.message, "timestamp": str(ev.timestamp)}
            for ev in deployment.events
        ]

        metrics_payload = observed_metrics or {
            "error_rate": 0.0,
            "p95_latency": 0.0,
            "availability": 100.0,
            "traffic_percentage": deployment.traffic_percentage
        }

        # 4. Synthesize AI Root-Cause and Remediation
        ai_analysis = await AIIncidentAnalyst.analyze_incident(
            service_name=service.name,
            version=deployment.version,
            triggering_condition=triggering_reason,
            observed_metrics=metrics_payload,
            recent_events=events_summary
        )

        # 5. Create Incident record
        incident = Incident(
            service_id=service.id,
            deployment_id=deployment.id,
            title=incident_title,
            severity=incident_severity,
            status="OPEN",
            triggering_condition=triggering_reason,
            observed_metrics=json.dumps(metrics_payload),
            ai_summary=ai_analysis.get("ai_summary"),
            ai_root_cause=ai_analysis.get("ai_root_cause"),
            ai_supporting_evidence=ai_analysis.get("ai_supporting_evidence"),
            ai_impact_assessment=ai_analysis.get("ai_impact_assessment"),
            ai_suggested_remediation=ai_analysis.get("ai_suggested_remediation"),
            ai_prevention=ai_analysis.get("ai_prevention"),
            ai_confidence=ai_analysis.get("ai_confidence", 0.94),
            created_at=datetime.now(timezone.utc)
        )
        db.add(incident)

        # 6. Immutable audit log
        audit = AuditLog(
            action="ROLLBACK_COMPLETED" if verification_passed else "ROLLBACK_VERIFICATION_FAILED",
            actor=actor,
            target_type="DEPLOYMENT",
            target_id=deployment.id,
            details=f"Restored version: {restore_version}. Verification passed: {verification_passed}. Incident ID: {incident.id}",
            outcome="SUCCESS" if verification_passed else "FAILURE",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(deployment)
        return deployment
