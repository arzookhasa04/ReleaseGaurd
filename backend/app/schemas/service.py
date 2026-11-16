from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

class ServiceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    repo_url: Optional[str] = None
    current_version: str = Field(default="v1.0.0", max_length=50)
    environment: str = Field(default="production", pattern="^(development|staging|production)$")
    health_check_endpoint: str = Field(default="/healthz")
    deployment_strategy: str = Field(default="CANARY", pattern="^(CANARY|BLUE_GREEN|ROLLING)$")
    slo_target_availability: float = Field(default=99.9, ge=90.0, le=100.0)
    slo_max_error_rate: float = Field(default=1.0, ge=0.0, le=100.0)
    slo_max_p95_latency: float = Field(default=500.0, ge=1.0, le=10000.0)
    slo_max_cpu_pct: float = Field(default=80.0, ge=1.0, le=100.0)
    slo_max_memory_pct: float = Field(default=80.0, ge=1.0, le=100.0)
    owner: str = Field(default="Platform Engineering", max_length=100)

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    description: Optional[str] = None
    repo_url: Optional[str] = None
    current_version: Optional[str] = None
    environment: Optional[str] = Field(None, pattern="^(development|staging|production)$")
    health_check_endpoint: Optional[str] = None
    deployment_strategy: Optional[str] = Field(None, pattern="^(CANARY|BLUE_GREEN|ROLLING)$")
    slo_target_availability: Optional[float] = Field(None, ge=90.0, le=100.0)
    slo_max_error_rate: Optional[float] = Field(None, ge=0.0, le=100.0)
    slo_max_p95_latency: Optional[float] = Field(None, ge=1.0, le=10000.0)
    slo_max_cpu_pct: Optional[float] = Field(None, ge=1.0, le=100.0)
    slo_max_memory_pct: Optional[float] = Field(None, ge=1.0, le=100.0)
    owner: Optional[str] = None

class ServiceOut(ServiceBase):
    id: str
    created_at: datetime
    updated_at: datetime
    active_deployments_count: int = 0
    active_incidents_count: int = 0
    health_status: str = "HEALTHY" # HEALTHY, DEGRADED, BREACHED, UNKNOWN

    class Config:
        from_attributes = True
