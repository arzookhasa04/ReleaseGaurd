from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class IncidentCreate(BaseModel):
    service_id: str
    deployment_id: Optional[str] = None
    title: str
    severity: str = Field(default="HIGH", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    triggering_condition: str
    observed_metrics: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_root_cause: Optional[str] = None
    ai_supporting_evidence: Optional[str] = None
    ai_impact_assessment: Optional[str] = None
    ai_suggested_remediation: Optional[str] = None
    ai_prevention: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(OPEN|INVESTIGATING|MITIGATED|RESOLVED)$")
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None

class IncidentOut(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    deployment_id: Optional[str] = None
    deployment_version: Optional[str] = None
    title: str
    severity: str
    status: str
    triggering_condition: str
    observed_metrics: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_root_cause: Optional[str] = None
    ai_supporting_evidence: Optional[str] = None
    ai_impact_assessment: Optional[str] = None
    ai_suggested_remediation: Optional[str] = None
    ai_prevention: Optional[str] = None
    ai_confidence: Optional[float] = 0.92
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
