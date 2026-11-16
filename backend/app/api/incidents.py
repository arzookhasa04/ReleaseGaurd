from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.models import Incident, Service, Deployment, AuditLog
from app.schemas.incident import IncidentOut, IncidentUpdate

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def enrich_incident_out(inc: Incident) -> IncidentOut:
    return IncidentOut(
        id=inc.id,
        service_id=inc.service_id,
        service_name=inc.service.name if inc.service else "Unknown",
        deployment_id=inc.deployment_id,
        deployment_version=inc.deployment.version if inc.deployment else None,
        title=inc.title,
        severity=inc.severity,
        status=inc.status,
        triggering_condition=inc.triggering_condition,
        observed_metrics=inc.observed_metrics,
        ai_summary=inc.ai_summary,
        ai_root_cause=inc.ai_root_cause,
        ai_supporting_evidence=inc.ai_supporting_evidence,
        ai_impact_assessment=inc.ai_impact_assessment,
        ai_suggested_remediation=inc.ai_suggested_remediation,
        ai_prevention=inc.ai_prevention,
        ai_confidence=inc.ai_confidence,
        acknowledged_by=inc.acknowledged_by,
        resolved_by=inc.resolved_by,
        created_at=inc.created_at,
        resolved_at=inc.resolved_at
    )

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    service_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status and status != "all":
        query = query.filter(Incident.status == status)
    if severity and severity != "all":
        query = query.filter(Incident.severity == severity)
    if service_id:
        query = query.filter(Incident.service_id == service_id)

    incidents = query.order_by(Incident.created_at.desc()).all()
    return [enrich_incident_out(i) for i in incidents]

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return enrich_incident_out(incident)

@router.put("/{incident_id}", response_model=IncidentOut)
def update_incident(incident_id: str, inc_update: IncidentUpdate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if inc_update.status:
        incident.status = inc_update.status
        if inc_update.status == "RESOLVED":
            incident.resolved_at = datetime.now(timezone.utc)
            if inc_update.resolved_by:
                incident.resolved_by = inc_update.resolved_by
            else:
                incident.resolved_by = "on-call-sre"
        elif inc_update.status == "INVESTIGATING":
            if inc_update.acknowledged_by:
                incident.acknowledged_by = inc_update.acknowledged_by
            else:
                incident.acknowledged_by = "on-call-sre"

    audit = AuditLog(
        action=f"INCIDENT_STATUS_{incident.status}",
        actor=inc_update.resolved_by or inc_update.acknowledged_by or "operator",
        target_type="INCIDENT",
        target_id=incident.id,
        details=f"Updated status to {incident.status}. Notes: {inc_update.notes}",
        outcome="SUCCESS",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)

    db.commit()
    db.refresh(incident)
    return enrich_incident_out(incident)
