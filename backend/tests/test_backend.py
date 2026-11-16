import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.main import app
from app.models import Service, Deployment, DeploymentEvent, MetricSnapshot, ChaosExperiment, Incident
from app.engines.state_machine import DeploymentStateMachine, DeploymentState, InvalidStateTransitionError
from app.engines.slo_engine import SLOEngine
from app.engines.rollback_engine import RollbackEngine

# In-memory SQLite with StaticPool so all connections share the same memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    with TestClient(app) as c:
        yield c

# 1. State Machine Tests
def test_valid_deployment_lifecycle(db_session):
    svc = Service(name="test-api", current_version="v1.0.0", owner="SRE")
    db_session.add(svc)
    db_session.commit()

    dep = Deployment(
        service_id=svc.id,
        version="v1.1.0",
        previous_healthy_version="v1.0.0",
        status=DeploymentState.PENDING,
        traffic_percentage=0
    )
    db_session.add(dep)
    db_session.commit()

    # PENDING -> BUILDING
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.BUILDING, "Building container")
    assert dep.status == DeploymentState.BUILDING

    # BUILDING -> TESTING
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.TESTING, "Running tests")
    assert dep.status == DeploymentState.TESTING

    # TESTING -> READY
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.READY, "Artifact staged")
    assert dep.status == DeploymentState.READY

    # READY -> CANARY
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.CANARY, "Canary 10%", traffic_percentage=10)
    assert dep.status == DeploymentState.CANARY
    assert dep.traffic_percentage == 10

    # CANARY -> MONITORING
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.MONITORING, "Monitoring 50%", traffic_percentage=50)
    assert dep.status == DeploymentState.MONITORING

    # MONITORING -> PROMOTED
    DeploymentStateMachine.transition(db_session, dep, DeploymentState.PROMOTED, "Promoting release", traffic_percentage=100)
    assert dep.status == DeploymentState.PROMOTED
    assert dep.traffic_percentage == 100
    assert svc.current_version == "v1.1.0" # Verified version promotion

def test_invalid_state_transition(db_session):
    svc = Service(name="test-api-2", current_version="v1.0.0", owner="SRE")
    db_session.add(svc)
    db_session.commit()

    dep = Deployment(
        service_id=svc.id,
        version="v1.1.0",
        status=DeploymentState.PENDING
    )
    db_session.add(dep)
    db_session.commit()

    # Invalid: PENDING cannot directly jump to PROMOTED
    with pytest.raises(InvalidStateTransitionError):
        DeploymentStateMachine.transition(db_session, dep, DeploymentState.PROMOTED, "Illegal jump")

# 2. SLO Engine Mathematical Correctness Tests
def test_slo_error_budget_calculation(db_session):
    svc = Service(
        name="slo-test-svc",
        slo_target_availability=99.9, # Error budget allowed = 0.1%
        slo_max_error_rate=1.0,
        slo_max_p95_latency=500.0,
        owner="SRE"
    )
    db_session.add(svc)
    db_session.commit()

    # Test UNKNOWN state when snapshots are empty
    empty_summary = SLOEngine.evaluate_service_slo(svc, [])
    assert empty_summary.overall_status == "UNKNOWN"
    assert empty_summary.is_telemetry_sufficient is False

    # Simulate healthy snapshot with 0.05% error rate (half of budget consumed)
    snap = MetricSnapshot(
        service_id=svc.id,
        request_count=10000,
        error_count=5,
        error_rate=0.05,
        p50_latency=20.0,
        p95_latency=50.0,
        p99_latency=100.0,
        cpu_pct=30.0,
        memory_pct=40.0,
        availability=99.95,
        timestamp=datetime.now(timezone.utc)
    )
    db_session.add(snap)
    db_session.commit()

    summary = SLOEngine.evaluate_service_slo(svc, [snap])
    assert summary.overall_status == "HEALTHY"
    assert summary.error_budget_total_pct == 0.1
    # Consumed budget should be ~50%
    assert 45.0 <= summary.error_budget_consumed_pct <= 55.0
    assert 45.0 <= summary.error_budget_remaining_pct <= 55.0
    assert summary.error_budget_status == "HEALTHY"

def test_slo_violation_detection(db_session):
    svc = Service(
        name="slo-test-svc-2",
        slo_target_availability=99.9,
        slo_max_error_rate=1.0,
        slo_max_p95_latency=300.0,
        owner="SRE"
    )
    db_session.add(svc)
    db_session.commit()

    # High error rate snapshot
    bad_snap = MetricSnapshot(
        service_id=svc.id,
        request_count=1000,
        error_count=60,
        error_rate=6.0,
        p50_latency=20.0,
        p95_latency=250.0,
        p99_latency=400.0,
        cpu_pct=30.0,
        memory_pct=40.0,
        availability=94.0,
        timestamp=datetime.now(timezone.utc)
    )

    is_safe, reason = SLOEngine.is_deployment_safe(svc, bad_snap)
    assert is_safe is False
    assert "HTTP Error Rate" in reason

# 3. Automated Rollback & Recovery Tests
@pytest.mark.asyncio
async def test_automatic_rollback_workflow(db_session):
    svc = Service(
        name="rollback-svc",
        current_version="v1.0.0",
        slo_max_error_rate=1.0,
        owner="SRE"
    )
    db_session.add(svc)
    db_session.commit()

    dep = Deployment(
        service_id=svc.id,
        version="v1.1.0-bad",
        previous_healthy_version="v1.0.0",
        status=DeploymentState.CANARY,
        traffic_percentage=10,
        auto_rollback_enabled=True
    )
    db_session.add(dep)
    db_session.commit()

    # Execute rollback
    await RollbackEngine.execute_rollback(
        db=db_session,
        deployment=dep,
        triggering_reason="SLO Breach: HTTP Error Rate 7.2% exceeded 1.0%",
        observed_metrics={"error_rate": 7.2, "availability": 92.8, "traffic_percentage": 10},
        is_automatic=True
    )

    assert dep.status == DeploymentState.ROLLED_BACK
    assert dep.traffic_percentage == 0
    assert svc.current_version == "v1.0.0" # Restored healthy version

    # Verify incident was created
    inc = db_session.query(Incident).filter(Incident.deployment_id == dep.id).first()
    assert inc is not None
    assert inc.severity == "HIGH"
    assert "SLO Breach" in inc.triggering_condition
    assert inc.ai_root_cause is not None

# 4. Critical Rollback Verification Failure Test
@pytest.mark.asyncio
async def test_failed_rollback_verification(db_session):
    svc = Service(name="failing-recovery-svc", current_version="v1.0.0", owner="SRE")
    db_session.add(svc)
    db_session.commit()

    dep = Deployment(
        service_id=svc.id,
        version="v1.2.0",
        previous_healthy_version="v1.0.0",
        status=DeploymentState.CANARY,
        traffic_percentage=10
    )
    db_session.add(dep)
    db_session.commit()

    # Simulate rollback verification failure
    await RollbackEngine.execute_rollback(
        db=db_session,
        deployment=dep,
        triggering_reason="Severe failure",
        is_automatic=True,
        simulate_verification_failure=True
    )

    # Must transition to FAILED and open CRITICAL incident, rather than claiming successful recovery
    assert dep.status == DeploymentState.FAILED
    inc = db_session.query(Incident).filter(Incident.deployment_id == dep.id).first()
    assert inc is not None
    assert inc.severity == "CRITICAL"
    assert "Rollback verification failed" in inc.title

# 5. API Integration Tests
def test_api_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "infrastructure" in data

def test_api_service_lifecycle(client):
    # Create service
    payload = {
        "name": "integration-api",
        "description": "Integration test service",
        "current_version": "v1.0.0",
        "environment": "production",
        "health_check_endpoint": "/healthz",
        "deployment_strategy": "CANARY",
        "slo_target_availability": 99.9,
        "slo_max_error_rate": 1.0,
        "slo_max_p95_latency": 400.0,
        "owner": "Test Team"
    }
    res = client.post("/api/services", json=payload)
    assert res.status_code == 201
    svc_id = res.json()["id"]

    # Read service
    res_get = client.get(f"/api/services/{svc_id}")
    assert res_get.status_code == 200
    assert res_get.json()["name"] == "integration-api"

    # List services
    res_list = client.get("/api/services")
    assert res_list.status_code == 200
    assert any(s["id"] == svc_id for s in res_list.json())

def test_prometheus_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert b"releaseguard_active_deployments" in res.content

def test_chaos_experiment_lifecycle(client, db_session):
    svc = Service(name="chaos-svc", current_version="v1.0.0", owner="SRE")
    db_session.add(svc)
    db_session.commit()

    # Start experiment
    res_start = client.post("/api/chaos/experiments", json={
        "service_id": svc.id,
        "experiment_type": "HTTP_500",
        "severity": 60.0,
        "duration_seconds": 60
    })
    assert res_start.status_code == 201
    exp_id = res_start.json()["id"]
    assert res_start.json()["is_active"] is True

    # Stop experiment
    res_stop = client.post(f"/api/chaos/experiments/{exp_id}/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["is_active"] is False
