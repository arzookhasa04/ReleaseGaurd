import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.services.demo_seeder import seed_demo_data

def verify_all_scenarios():
    print("==================================================")
    print("VERIFYING RELEASEGUARD AI SYSTEM & DEMO SCENARIOS")
    print("==================================================")

    # 1. Initialize and Seed
    db = SessionLocal()
    seed_demo_data(db, force=True)
    db.close()
    print("[OK] Initial Demo Database Seeded Successfully.")

    with TestClient(app) as client:
        # 2. Check Health
        health_resp = client.get("/api/health")
        assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
        print(f"[OK] Health Check Passed: {health_resp.json()['status']} (Infrastructure: {health_resp.json()['infrastructure']['mode']})")

        # 3. Check Services List
        svc_resp = client.get("/api/services")
        assert svc_resp.status_code == 200
        services = svc_resp.json()
        assert len(services) >= 4
        print(f"[OK] Service Catalog Loaded: {len(services)} services registered.")
        for s in services:
            print(f"    - {s['name']} ({s['current_version']}) * Strategy: {s['deployment_strategy']} * SLO Target: {s['slo_target_availability']}%")

        # 4. Check SLO Summaries
        slo_resp = client.get("/api/slo")
        assert slo_resp.status_code == 200
        slos = slo_resp.json()
        print(f"[OK] Reliability Engine: {len(slos)} services evaluated for error budget compliance.")

        # 5. Execute DEMO 1: Successful Canary Rollout
        print("\n--- Executing DEMO 1: Successful Canary Deployment ---")
        demo1_resp = client.post("/api/demo/scenario-1")
        assert demo1_resp.status_code == 200, f"Demo 1 failed: {demo1_resp.text}"
        d1 = demo1_resp.json()
        assert d1["status"] == "PROMOTED", f"Expected PROMOTED, got {d1['status']}"
        assert d1["traffic_percentage"] == 100
        print(f"[OK] DEMO 1 PASSED: {d1['service_name']} release {d1['version']} PROMOTED to 100% traffic!")

        # 6. Execute DEMO 2: High Error Rate Violation & Automated Rollback
        print("\n--- Executing DEMO 2: Error Spike & Automated Rollback ---")
        demo2_resp = client.post("/api/demo/scenario-2")
        assert demo2_resp.status_code == 200, f"Demo 2 failed: {demo2_resp.text}"
        d2 = demo2_resp.json()
        assert d2["status"] == "ROLLED_BACK", f"Expected ROLLED_BACK, got {d2['status']}"
        assert d2["traffic_percentage"] == 0
        print(f"[OK] DEMO 2 PASSED: {d2['service_name']} release {d2['version']} automatically ROLLED_BACK to baseline {d2['previous_healthy_version']}!")
        print(f"    Reason: {d2['rollback_reason']}")

        # Verify incident was created for Demo 2
        inc_resp = client.get("/api/incidents")
        assert inc_resp.status_code == 200
        incidents = inc_resp.json()
        latest_inc = incidents[0]
        print(f"[OK] Incident Generated: {latest_inc['title']} (Severity: {latest_inc['severity']})")
        print(f"    AI Root Cause: {latest_inc['ai_root_cause'][:120]}...")

        # 7. Execute DEMO 3: Latency Anomaly & Progression Pause
        print("\n--- Executing DEMO 3: Latency Anomaly & Progression Pause ---")
        demo3_resp = client.post("/api/demo/scenario-3")
        assert demo3_resp.status_code == 200, f"Demo 3 failed: {demo3_resp.text}"
        d3 = demo3_resp.json()
        assert d3["status"] == "PAUSED", f"Expected PAUSED, got {d3['status']}"
        print(f"[OK] DEMO 3 PASSED: {d3['service_name']} release {d3['version']} safety gate PAUSED rollout!")

        # 8. Check Prometheus Exporter
        prom_resp = client.get("/metrics")
        assert prom_resp.status_code == 200
        assert "releaseguard_service_availability_percent" in prom_resp.text
        print("[OK] Prometheus /metrics Endpoint: Successfully exporting gauges & counters.")

        # 9. Verify Reset Endpoint
        reset_resp = client.post("/api/demo/reset")
        assert reset_resp.status_code == 200
        print("[OK] Reset Demo Data Endpoint: Reset verified successfully.")

    print("\n==================================================")
    print("ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY! [OK]")
    print("==================================================")

if __name__ == "__main__":
    verify_all_scenarios()
