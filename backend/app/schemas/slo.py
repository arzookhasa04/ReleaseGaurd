from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SLOMetricEvaluation(BaseModel):
    name: str # e.g. "Availability", "Error Rate", "P95 Latency", "CPU Utilization", "Memory Utilization"
    target: float
    current_value: Optional[float]
    unit: str
    status: str # "PASS", "WARN", "FAIL", "UNKNOWN"
    description: str

class SLOSummaryOut(BaseModel):
    service_id: str
    service_name: str
    overall_status: str # HEALTHY, DEGRADED, BREACHED, UNKNOWN
    availability_target: float
    current_availability: Optional[float]
    error_budget_total_pct: float
    error_budget_consumed_pct: float
    error_budget_remaining_pct: float
    error_budget_status: str # HEALTHY, WARNING, EXHAUSTED, UNKNOWN
    evaluations: List[SLOMetricEvaluation]
    timestamp: datetime
    data_points_analyzed: int
    is_telemetry_sufficient: bool
