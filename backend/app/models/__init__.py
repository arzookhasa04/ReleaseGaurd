from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    repo_url = Column(String(255), nullable=True)
    current_version = Column(String(50), nullable=False, default="v1.0.0")
    environment = Column(String(50), nullable=False, default="production")
    health_check_endpoint = Column(String(255), nullable=False, default="/healthz")
    deployment_strategy = Column(String(50), nullable=False, default="CANARY")
    
    # SLO Configs
    slo_target_availability = Column(Float, nullable=False, default=99.9) # target 99.9%
    slo_max_error_rate = Column(Float, nullable=False, default=1.0)       # 1.0%
    slo_max_p95_latency = Column(Float, nullable=False, default=500.0)   # 500ms
    slo_max_cpu_pct = Column(Float, nullable=False, default=80.0)        # 80%
    slo_max_memory_pct = Column(Float, nullable=False, default=80.0)     # 80%
    
    owner = Column(String(100), nullable=False, default="Platform Engineering")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    deployments = relationship("Deployment", back_populates="service", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="service", cascade="all, delete-orphan")
    chaos_experiments = relationship("ChaosExperiment", back_populates="service", cascade="all, delete-orphan")
    metric_snapshots = relationship("MetricSnapshot", back_populates="service", cascade="all, delete-orphan")

class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    previous_healthy_version = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="PENDING", index=True) 
    # Stages: PENDING, BUILDING, TESTING, READY, CANARY, MONITORING, PROMOTED, PAUSED, ROLLBACK, ROLLED_BACK, FAILED
    
    traffic_percentage = Column(Integer, nullable=False, default=0)
    strategy = Column(String(50), nullable=False, default="CANARY")
    observation_duration_sec = Column(Integer, nullable=False, default=30)
    auto_rollback_enabled = Column(Boolean, nullable=False, default=True)
    
    failure_reason = Column(Text, nullable=True)
    rollback_reason = Column(Text, nullable=True)
    is_simulated = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    service = relationship("Service", back_populates="deployments")
    events = relationship("DeploymentEvent", back_populates="deployment", cascade="all, delete-orphan", order_by="DeploymentEvent.timestamp")
    incidents = relationship("Incident", back_populates="deployment")
    metric_snapshots = relationship("MetricSnapshot", back_populates="deployment")

class DeploymentEvent(Base):
    __tablename__ = "deployment_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    deployment_id = Column(String(36), ForeignKey("deployments.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String(20), nullable=False, default="INFO") # INFO, WARNING, ERROR, SUCCESS
    metric_payload = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)

    deployment = relationship("Deployment", back_populates="events")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    deployment_id = Column(String(36), ForeignKey("deployments.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False, default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), nullable=False, default="OPEN", index=True) # OPEN, INVESTIGATING, MITIGATED, RESOLVED
    
    triggering_condition = Column(Text, nullable=False)
    observed_metrics = Column(Text, nullable=True) # JSON snapshot of violating metrics
    
    # AI Root-cause & Remediation
    ai_summary = Column(Text, nullable=True)
    ai_root_cause = Column(Text, nullable=True)
    ai_supporting_evidence = Column(Text, nullable=True)
    ai_impact_assessment = Column(Text, nullable=True)
    ai_suggested_remediation = Column(Text, nullable=True)
    ai_prevention = Column(Text, nullable=True)
    ai_confidence = Column(Float, nullable=True, default=0.92)
    
    acknowledged_by = Column(String(100), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    resolved_at = Column(DateTime, nullable=True)

    service = relationship("Service", back_populates="incidents")
    deployment = relationship("Deployment", back_populates="incidents")

class ChaosExperiment(Base):
    __tablename__ = "chaos_experiments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # HTTP_500, LATENCY_SPIKE, CPU_SPIKE, MEMORY_PRESSURE, OUTAGE, TRAFFIC_BURST
    experiment_type = Column(String(50), nullable=False)
    severity = Column(Float, nullable=False, default=50.0) # 1 - 100
    latency_ms = Column(Integer, nullable=True, default=0)
    error_rate_pct = Column(Float, nullable=True, default=0.0)
    cpu_load_pct = Column(Float, nullable=True, default=0.0)
    duration_seconds = Column(Integer, nullable=False, default=120)
    
    is_active = Column(Boolean, nullable=False, default=True)
    started_at = Column(DateTime, default=utc_now)
    stopped_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    service = relationship("Service", back_populates="chaos_experiments")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    action = Column(String(100), nullable=False, index=True)
    actor = Column(String(100), nullable=False, default="sre-platform-agent")
    target_type = Column(String(50), nullable=False) # SERVICE, DEPLOYMENT, SLO, CHAOS, INCIDENT
    target_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    outcome = Column(String(20), nullable=False, default="SUCCESS") # SUCCESS, FAILURE
    timestamp = Column(DateTime, default=utc_now, index=True)

class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    service_id = Column(String(36), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    deployment_id = Column(String(36), ForeignKey("deployments.id", ondelete="SET NULL"), nullable=True, index=True)
    
    request_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    error_rate = Column(Float, nullable=False, default=0.0)
    p50_latency = Column(Float, nullable=False, default=20.0)
    p95_latency = Column(Float, nullable=False, default=45.0)
    p99_latency = Column(Float, nullable=False, default=80.0)
    cpu_pct = Column(Float, nullable=False, default=25.0)
    memory_pct = Column(Float, nullable=False, default=40.0)
    availability = Column(Float, nullable=False, default=100.0)
    
    is_simulated = Column(Boolean, nullable=False, default=True)
    timestamp = Column(DateTime, default=utc_now, index=True)

    service = relationship("Service", back_populates="metric_snapshots")
    deployment = relationship("Deployment", back_populates="metric_snapshots")
