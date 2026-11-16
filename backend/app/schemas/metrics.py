from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MetricSnapshotOut(BaseModel):
    id: str
    service_id: str
    service_name: Optional[str] = None
    deployment_id: Optional[str] = None
    request_count: int
    error_count: int
    error_rate: float
    p50_latency: float
    p95_latency: float
    p99_latency: float
    cpu_pct: float
    memory_pct: float
    availability: float
    is_simulated: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class ServiceMetricsOverview(BaseModel):
    service_id: str
    service_name: str
    is_simulated: bool
    current_request_rate: float
    current_error_rate: float
    p50_latency: float
    p95_latency: float
    p99_latency: float
    cpu_pct: float
    memory_pct: float
    availability: float
    history: List[MetricSnapshotOut] = []

class DashboardOverviewOut(BaseModel):
    total_services: int
    active_deployments: int
    deployment_success_rate: float
    total_rollbacks: int
    current_avg_error_rate: float
    current_avg_p95_latency: float
    active_incidents_count: int
    environment: str
    is_simulated_infrastructure: bool
    recent_deployments: List[dict] = []
    active_incidents: List[dict] = []
    services_health: List[dict] = []
    deployment_frequency: List[dict] = []
    latency_trends: List[dict] = []
    error_rate_trends: List[dict] = []
