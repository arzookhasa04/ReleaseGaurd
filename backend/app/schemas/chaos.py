from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChaosExperimentCreate(BaseModel):
    service_id: str
    experiment_type: str = Field(..., pattern="^(HTTP_500|LATENCY_SPIKE|CPU_SPIKE|MEMORY_PRESSURE|OUTAGE|TRAFFIC_BURST)$")
    severity: float = Field(default=50.0, ge=1.0, le=100.0)
    latency_ms: Optional[int] = Field(default=0, ge=0, le=10000)
    error_rate_pct: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)
    cpu_load_pct: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)
    duration_seconds: int = Field(default=120, ge=10, le=3600)
    notes: Optional[str] = None

class ChaosExperimentOut(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    experiment_type: str
    severity: float
    latency_ms: Optional[int] = 0
    error_rate_pct: Optional[float] = 0.0
    cpu_load_pct: Optional[float] = 0.0
    duration_seconds: int
    is_active: bool
    started_at: datetime
    stopped_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
