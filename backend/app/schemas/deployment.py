from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DeploymentEventOut(BaseModel):
    id: str
    deployment_id: str
    stage: str
    message: str
    level: str
    metric_payload: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class DeploymentCreate(BaseModel):
    service_id: str
    version: str = Field(..., min_length=2, max_length=50)
    strategy: str = Field(default="CANARY", pattern="^(CANARY|BLUE_GREEN|ROLLING)$")
    initial_traffic_percentage: int = Field(default=5, ge=0, le=100)
    auto_rollback_enabled: bool = True
    observation_duration_sec: int = Field(default=30, ge=5, le=3600)

class DeploymentPromoteRequest(BaseModel):
    target_traffic_percentage: Optional[int] = Field(None, ge=1, le=100)
    force: bool = False

class DeploymentPauseRequest(BaseModel):
    reason: Optional[str] = "Operator requested manual pause"

class DeploymentRollbackRequest(BaseModel):
    reason: Optional[str] = "Operator initiated manual rollback"

class DeploymentOut(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    version: str
    previous_healthy_version: Optional[str] = None
    status: str
    traffic_percentage: int
    strategy: str
    observation_duration_sec: int
    auto_rollback_enabled: bool
    failure_reason: Optional[str] = None
    rollback_reason: Optional[str] = None
    is_simulated: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    events: List[DeploymentEventOut] = []

    class Config:
        from_attributes = True
