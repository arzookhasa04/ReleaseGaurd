import random
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Service, Deployment, ChaosExperiment, MetricSnapshot

class DeploymentSimulator:
    """
    Deterministic telemetry and traffic generator.
    Simulates real-world microservice workloads, baseline noise, and chaos faults.
    Clearly marks all generated telemetry as simulated.
    """

    BASELINES = {
        "claims-api": {"req_rate": 240, "err_rate": 0.05, "p50": 18, "p95": 42, "p99": 85, "cpu": 32, "mem": 45},
        "policy-api": {"req_rate": 420, "err_rate": 0.02, "p50": 14, "p95": 35, "p99": 70, "cpu": 28, "mem": 38},
        "payment-service": {"req_rate": 180, "err_rate": 0.04, "p50": 28, "p95": 65, "p99": 120, "cpu": 35, "mem": 52},
        "notification-service": {"req_rate": 310, "err_rate": 0.08, "p50": 12, "p95": 25, "p99": 55, "cpu": 20, "mem": 30},
    }

    @staticmethod
    def generate_snapshot(
        db: Session,
        service: Service,
        deployment: Optional[Deployment] = None,
        persist: bool = True
    ) -> MetricSnapshot:
        base = DeploymentSimulator.BASELINES.get(
            service.name,
            {"req_rate": 200, "err_rate": 0.05, "p50": 20, "p95": 45, "p99": 90, "cpu": 30, "mem": 40}
        )

        # Baseline with slight realistic jitter (+/- 5%)
        jitter = random.uniform(0.95, 1.05)
        req_count = int(base["req_rate"] * jitter * 10) # 10-second window
        error_rate = max(0.01, round(base["err_rate"] * random.uniform(0.8, 1.2), 3))
        p50 = round(base["p50"] * jitter, 1)
        p95 = round(base["p95"] * jitter, 1)
        p99 = round(base["p99"] * jitter, 1)
        cpu_pct = round(base["cpu"] * jitter, 1)
        mem_pct = round(base["mem"] * jitter, 1)
        active_exp_type = None

        # 1. Check for Active Chaos Experiments on this service
        active_experiment = db.query(ChaosExperiment).filter(
            ChaosExperiment.service_id == service.id,
            ChaosExperiment.is_active == True
        ).first()

        if active_experiment:
            active_exp_type = active_experiment.experiment_type
            severity = active_experiment.severity # 1 to 100

            if active_exp_type == "HTTP_500":
                # Severe spike in 500 error rate (e.g. 50% severity -> 7.5% error rate)
                error_rate = round(error_rate + (severity * 0.15), 2)
            elif active_exp_type == "LATENCY_SPIKE":
                # High latency injection
                injected_lat = active_experiment.latency_ms if active_experiment.latency_ms > 0 else (severity * 12.0)
                p50 += injected_lat * 0.4
                p95 += injected_lat
                p99 += injected_lat * 1.5
            elif active_exp_type == "CPU_SPIKE":
                cpu_pct = min(99.0, round(cpu_pct + (severity * 0.7), 1))
            elif active_exp_type == "MEMORY_PRESSURE":
                mem_pct = min(99.0, round(mem_pct + (severity * 0.65), 1))
            elif active_exp_type == "OUTAGE":
                error_rate = 100.0
                req_count = int(req_count * 0.1)
            elif active_exp_type == "TRAFFIC_BURST":
                req_count = int(req_count * (1 + (severity / 20.0)))
                p95 = round(p95 * 1.8, 1)
                cpu_pct = min(95.0, round(cpu_pct * 1.6, 1))

        # 2. Check if the deployment itself has an inherent fault scenario
        if deployment:
            # Fault injection flags in version name or deployment failure_reason
            if "-fault-err" in deployment.version or "demo-err" in deployment.version:
                error_rate = max(error_rate, 8.5)
            elif "-fault-lat" in deployment.version or "demo-lat" in deployment.version:
                p95 = max(p95, 750.0)
                p99 = max(p99, 1200.0)

        # Derived calculations
        error_count = int((error_rate / 100.0) * req_count)
        availability = max(0.0, min(100.0, round(100.0 - error_rate, 3)))

        snapshot = MetricSnapshot(
            service_id=service.id,
            deployment_id=deployment.id if deployment else None,
            request_count=req_count,
            error_count=error_count,
            error_rate=error_rate,
            p50_latency=p50,
            p95_latency=p95,
            p99_latency=p99,
            cpu_pct=cpu_pct,
            memory_pct=mem_pct,
            availability=availability,
            is_simulated=True,
            timestamp=datetime.now(timezone.utc)
        )

        if persist:
            db.add(snapshot)
            db.commit()
            db.refresh(snapshot)

        return snapshot
