# ReleaseGuard AI — Technical Interview Demonstration Guide

This guide outlines how to present ReleaseGuard AI during a platform engineering or SRE interview.

## 1. Quick Startup

### Option A: Local Development Setup (Quickest)
1. **Backend**:
   ```powershell
   cd backend
   .\.venv\Scripts\activate
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
2. **Frontend**:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

### Option B: Docker Compose (Full Stack with Prometheus & Grafana)
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin / admin)

---

## 2. Interactive Demonstration Scenarios

Click the **"Demo Scenarios"** button in the top navigation bar to trigger any of the three pre-configured repeatable scenarios:

### DEMO 1: Successful Canary Deployment
- **Target**: `policy-api` release `v3.2.0`
- **What Happens**:
  1. The platform executes container build and pre-deployment tests.
  2. Routes initial 10% canary traffic.
  3. Verifies that HTTP error rate is $0.02\%$ and P95 latency is $32\text{ ms}$ (well within SLO).
  4. Advances traffic to 50% and then automatically promotes to 100% production traffic.
- **Key Talking Point**: "Notice how ReleaseGuard enforces quality gates at each stage before allowing traffic expansion."

### DEMO 2: High Error Rate Violation & Automated Recovery
- **Target**: `claims-api` release `v2.4.1-err`
- **What Happens**:
  1. Release candidate passes initial unit tests.
  2. Canary slice is routed at 10% traffic.
  3. Canary encounters unhandled exceptions, spiking error rate to $8.57\%$.
  4. ReleaseGuard detects the SLO violation within seconds.
  5. Canary traffic is immediately drained to $0\%$, safely containing customer exposure to just the 10% slice.
  6. Restores the verified baseline (`v2.4.0`) and confirms healthy verification.
  7. Opens an incident and invokes the AI Incident Analyst to generate a root-cause explanation.
- **Key Talking Point**: "The blast radius was restricted to a small traffic slice, and automated recovery mitigated the issue before a human engineer even opened an alert."

### DEMO 3: Latency Anomaly & Progression Pause
- **Target**: `payment-service` release `v1.8.5-lat`
- **What Happens**:
  1. Release introduces an unindexed query, causing P95 latency to spike to $780\text{ ms}$ (threshold: $350\text{ ms}$).
  2. ReleaseGuard intercepts the latency breach and immediately pauses deployment progression.
  3. Allows engineers to inspect distributed APM traces and logs before deciding to resume or rollback.
- **Key Talking Point**: "Not every issue requires an immediate rollback; latency warnings can be paused so operators can investigate without aborting long-running state."

---

## 3. Chaos Engineering Lab
1. Navigate to **Chaos Lab** from the sidebar.
2. Select any microservice (e.g. `claims-api`).
3. Choose a failure scenario: **HTTP 500 Errors**, **Latency Spike**, **CPU Spike**, **Memory Pressure**, **Outage**, or **Traffic Burst**.
4. Set severity slider (e.g. 60%) and click **"Inject Chaos Fault"**.
5. Switch to **Monitoring** or **Reliability & SLOs** to watch the real-time telemetry degradation and SLO error budget consumption!
6. Click **"Halt Chaos Experiment"** to watch the metrics recover to baseline.
