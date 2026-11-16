from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import Service, Deployment, DeploymentEvent, MetricSnapshot, AuditLog, Incident, ChaosExperiment
from app.engines.state_machine import DeploymentState

def seed_demo_data(db: Session, force: bool = False):
    """
    Seeds production-inspired sample services, deployments, metrics, and audit logs.
    Identifies all sample entities clearly as demo/simulated.
    """
    existing_services_count = db.query(Service).count()
    if existing_services_count > 0 and not force:
        return

    if force:
        # Clear existing records
        db.query(DeploymentEvent).delete()
        db.query(MetricSnapshot).delete()
        db.query(Incident).delete()
        db.query(ChaosExperiment).delete()
        db.query(Deployment).delete()
        db.query(AuditLog).delete()
        db.query(Service).delete()
        db.commit()

    now = datetime.now(timezone.utc)

    # 1. Register 4 Realistic Core Microservices
    services_data = [
        {
            "name": "claims-api",
            "description": "[SIMULATED DEMO SERVICE] Insurance claims intake, adjudication engine, and claims assessment pipeline.",
            "repo_url": "https://github.com/company-org/claims-api",
            "current_version": "v2.4.0",
            "environment": "production",
            "health_check_endpoint": "/healthz",
            "deployment_strategy": "CANARY",
            "slo_target_availability": 99.9,
            "slo_max_error_rate": 1.0,
            "slo_max_p95_latency": 450.0,
            "slo_max_cpu_pct": 80.0,
            "slo_max_memory_pct": 85.0,
            "owner": "Claims Platform SRE"
        },
        {
            "name": "policy-api",
            "description": "[SIMULATED DEMO SERVICE] Core policy lifecycle, underwriting calculation, quotation, and endorsements.",
            "repo_url": "https://github.com/company-org/policy-api",
            "current_version": "v3.1.2",
            "environment": "production",
            "health_check_endpoint": "/healthz",
            "deployment_strategy": "CANARY",
            "slo_target_availability": 99.95,
            "slo_max_error_rate": 0.5,
            "slo_max_p95_latency": 300.0,
            "slo_max_cpu_pct": 75.0,
            "slo_max_memory_pct": 80.0,
            "owner": "Core Underwriting Team"
        },
        {
            "name": "payment-service",
            "description": "[SIMULATED DEMO SERVICE] Payment gateway aggregation, recurring premiums, reconciliation, and refund processor.",
            "repo_url": "https://github.com/company-org/payment-service",
            "current_version": "v1.8.4",
            "environment": "production",
            "health_check_endpoint": "/actuator/health",
            "deployment_strategy": "CANARY",
            "slo_target_availability": 99.99,
            "slo_max_error_rate": 0.2,
            "slo_max_p95_latency": 350.0,
            "slo_max_cpu_pct": 70.0,
            "slo_max_memory_pct": 75.0,
            "owner": "FinTech Integrations"
        },
        {
            "name": "notification-service",
            "description": "[SIMULATED DEMO SERVICE] Multi-channel alerting, transactional email, SMS, and push notification router.",
            "repo_url": "https://github.com/company-org/notification-service",
            "current_version": "v1.4.1",
            "environment": "production",
            "health_check_endpoint": "/health",
            "deployment_strategy": "ROLLING",
            "slo_target_availability": 99.5,
            "slo_max_error_rate": 1.5,
            "slo_max_p95_latency": 600.0,
            "slo_max_cpu_pct": 85.0,
            "slo_max_memory_pct": 85.0,
            "owner": "Customer Engagement"
        }
    ]

    services_map = {}
    for data in services_data:
        svc = Service(**data, created_at=now - timedelta(days=30), updated_at=now - timedelta(days=1))
        db.add(svc)
        db.flush()
        services_map[svc.name] = svc

    # 2. Historical Successful and Rollback Deployments
    # A successful deployment on policy-api
    d1 = Deployment(
        service_id=services_map["policy-api"].id,
        version="v3.1.2",
        previous_healthy_version="v3.1.1",
        status=DeploymentState.PROMOTED,
        traffic_percentage=100,
        strategy="CANARY",
        is_simulated=True,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2, hours=-1),
        completed_at=now - timedelta(days=2, hours=-1)
    )
    db.add(d1)
    db.flush()

    events_d1 = [
        ("PENDING", "Deployment registered via CI/CD pipeline", "INFO", now - timedelta(days=2)),
        ("BUILDING", "Container image built: policy-api:v3.1.2", "INFO", now - timedelta(days=2, minutes=-5)),
        ("TESTING", "Automated contract & integration tests passed (482 tests)", "SUCCESS", now - timedelta(days=2, minutes=-12)),
        ("READY", "Artifact verified and ready for canary rollout", "INFO", now - timedelta(days=2, minutes=-15)),
        ("CANARY", "Routing 10% canary traffic to v3.1.2", "INFO", now - timedelta(days=2, minutes=-20)),
        ("MONITORING", "SLO verification passed (error rate: 0.02%, P95: 32ms)", "SUCCESS", now - timedelta(days=2, minutes=-35)),
        ("CANARY", "Routing 50% canary traffic to v3.1.2", "INFO", now - timedelta(days=2, minutes=-40)),
        ("MONITORING", "SLO verification passed (error rate: 0.02%, P95: 34ms)", "SUCCESS", now - timedelta(days=2, minutes=-50)),
        ("PROMOTED", "Release v3.1.2 successfully promoted to 100% production traffic", "SUCCESS", now - timedelta(days=2, hours=-1))
    ]
    for stage, msg, lvl, ts in events_d1:
        db.add(DeploymentEvent(deployment_id=d1.id, stage=stage, message=msg, level=lvl, timestamp=ts))

    # A historical automated rollback on claims-api
    d2 = Deployment(
        service_id=services_map["claims-api"].id,
        version="v2.3.9-faulty",
        previous_healthy_version="v2.3.8",
        status=DeploymentState.ROLLED_BACK,
        traffic_percentage=0,
        strategy="CANARY",
        rollback_reason="SLO Violation: HTTP Error Rate 7.42% exceeded threshold 1.00%",
        is_simulated=True,
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(days=5, hours=-1),
        completed_at=now - timedelta(days=5, hours=-1)
    )
    db.add(d2)
    db.flush()

    events_d2 = [
        ("PENDING", "Deployment registered", "INFO", now - timedelta(days=5)),
        ("BUILDING", "Container image compiled", "INFO", now - timedelta(days=5, minutes=-4)),
        ("TESTING", "Unit tests passed", "INFO", now - timedelta(days=5, minutes=-8)),
        ("READY", "Deployment staged", "INFO", now - timedelta(days=5, minutes=-10)),
        ("CANARY", "Routing 10% canary traffic", "INFO", now - timedelta(days=5, minutes=-15)),
        ("MONITORING", "Telemetry anomaly detected: Error rate rose from 0.05% to 7.42%", "WARNING", now - timedelta(days=5, minutes=-25)),
        ("ROLLBACK", "Automated recovery initiated. Draining canary traffic to 0%", "WARNING", now - timedelta(days=5, minutes=-27)),
        ("ROLLED_BACK", "Verified baseline v2.3.8 health. Automated rollback completed.", "SUCCESS", now - timedelta(days=5, hours=-1))
    ]
    for stage, msg, lvl, ts in events_d2:
        db.add(DeploymentEvent(deployment_id=d2.id, stage=stage, message=msg, level=lvl, timestamp=ts))

    # Historical Incident corresponding to d2
    inc = Incident(
        service_id=services_map["claims-api"].id,
        deployment_id=d2.id,
        title="Automated Rollback: claims-api (v2.3.9-faulty)",
        severity="HIGH",
        status="RESOLVED",
        triggering_condition="SLO Violation: HTTP Error Rate 7.42% exceeded threshold 1.00%",
        observed_metrics='{"error_rate": 7.42, "p95_latency": 145.2, "availability": 92.58, "traffic_percentage": 10}',
        ai_summary="Release v2.3.9-faulty introduced an unhandled NullPointerException during claim status validation.",
        ai_root_cause="Database migration missing column 'claim_tier_id' in read replica connection pool.",
        ai_supporting_evidence="HTTP 500 error spike to 7.42% immediately following 10% canary traffic cutover.",
        ai_impact_assessment="Blast radius successfully constrained to 10% canary slice for 4.2 minutes.",
        ai_suggested_remediation="1. Verify database schema migration was executed across all read replicas.\n2. Re-run integration tests with active connection pooling.",
        ai_prevention="Enforce mandatory schema migration health checks before starting canary pods.",
        ai_confidence=0.96,
        acknowledged_by="alex.sre@company.internal",
        resolved_by="sarah.dev@company.internal",
        created_at=now - timedelta(days=5, minutes=-27),
        resolved_at=now - timedelta(days=5, hours=-2)
    )
    db.add(inc)

    # 3. Generate Historical Metric Snapshots (last 24 hours in 30-min intervals)
    for svc_name, svc in services_map.items():
        base_err = 0.05 if svc_name != "notification-service" else 0.12
        base_lat = 40.0 if svc_name != "notification-service" else 55.0
        for i in range(24, 0, -1):
            ts = now - timedelta(hours=i)
            # Normal smooth baseline with minimal variation
            err = max(0.01, round(base_err + ((i % 5) * 0.01), 3))
            p95 = round(base_lat + ((i % 4) * 2.5), 1)
            db.add(MetricSnapshot(
                service_id=svc.id,
                request_count=1800 + (i * 20),
                error_count=int((err / 100.0) * 2000),
                error_rate=err,
                p50_latency=round(p95 * 0.45, 1),
                p95_latency=p95,
                p99_latency=round(p95 * 1.8, 1),
                cpu_pct=round(28.0 + (i % 6) * 1.5, 1),
                memory_pct=round(42.0 + (i % 4) * 1.0, 1),
                availability=round(100.0 - err, 3),
                is_simulated=True,
                timestamp=ts
            ))

    # 4. Audit Logs
    audit_entries = [
        ("SERVICE_REGISTERED", "sre-lead", "SERVICE", services_map["claims-api"].id, "Registered service claims-api with 99.9% availability target", "SUCCESS", now - timedelta(days=30)),
        ("SERVICE_REGISTERED", "sre-lead", "SERVICE", services_map["policy-api"].id, "Registered service policy-api with 99.95% availability target", "SUCCESS", now - timedelta(days=30)),
        ("DEPLOYMENT_CREATED", "github-actions-bot", "DEPLOYMENT", d1.id, "Triggered canary deployment for policy-api:v3.1.2", "SUCCESS", now - timedelta(days=2)),
        ("DEPLOYMENT_PROMOTED", "automated-recovery-engine", "DEPLOYMENT", d1.id, "Promoted policy-api:v3.1.2 to 100% traffic following healthy SLO evaluation", "SUCCESS", now - timedelta(days=2, hours=-1)),
        ("SLO_VIOLATION_TRIGGERED", "automated-recovery-engine", "DEPLOYMENT", d2.id, "Automated rollback triggered due to 7.42% error rate spike", "SUCCESS", now - timedelta(days=5, minutes=-27)),
    ]
    for action, actor, target_type, target_id, details, outcome, ts in audit_entries:
        db.add(AuditLog(
            action=action,
            actor=actor,
            target_type=target_type,
            target_id=target_id,
            details=details,
            outcome=outcome,
            timestamp=ts
        ))

    db.commit()
