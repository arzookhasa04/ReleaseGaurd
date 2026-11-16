# ReleaseGuard AI — SLO-Aware Deployment & Automated Recovery Platform

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-brightgreen?style=flat-square&logo=githubactions)](https://github.com/company-org/releaseguard-ai)
[![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![Prometheus](https://img.shields.io/badge/Prometheus-Enabled-E6522C?style=flat-square&logo=prometheus)](https://prometheus.io)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=flat-square&logo=kubernetes)](https://kubernetes.io)

---

## 1. Executive Summary & Industry Problem

Traditional CI/CD pipelines verify that code compiles and unit tests pass before deployment. However, **applications can pass all automated tests and still behave catastrophically in production** due to:
- Latent database deadlocks or missing table indexes.
- Third-party API dependency timeouts and rate limits.
- Downstream contract regressions and serialization errors.
- Memory leaks and CPU exhaustion under real concurrency.

In mission-critical insurance, fintech, and platform engineering environments, an outage during customer policy issuance or claims adjudication incurs direct financial loss and severe regulatory penalty.

**ReleaseGuard AI** bridges the gap between CI/CD deployment pipelines and Site Reliability Engineering (SRE). It introduces **SLO-aware progressive canary deployments** with **sub-second automated rollback**, mathematically rigorous error budget tracking, and AI-assisted incident root-cause diagnosis.

---

## 2. Key Platform Features

1. **State Machine Deployment Engine**:
   - Backend-enforced state machine: `PENDING` → `BUILDING` → `TESTING` → `READY` → `CANARY` → `MONITORING` → `PROMOTED`.
   - Concurrency-safe lock registry serializing operations per deployment.
2. **Progressive Canary & Traffic Weighting**:
   - Automated traffic progression: $5\% \to 10\% \to 25\% \to 50\% \to 100\%$.
   - Live traffic slicing constraining customer blast radius.
3. **Deterministic Reliability & SLO Engine**:
   - Mathematically exact error budget calculation: $\text{Error Budget} = 100\% - \text{Availability Target}$.
   - Evaluates availability compliance, HTTP error rates, P95 response latency, and resource saturation.
   - Explicit `UNKNOWN` state handling for incomplete telemetry windows.
4. **Automated Recovery & Verification**:
   - Sub-15-second automatic rollback upon any SLO violation.
   - Mandatory post-rollback health verification of the restored release baseline.
   - Never falsely reports a rollback as successful unless verification passes.
5. **Chaos Engineering Lab**:
   - Interactive fault injection: HTTP 500 errors, Latency spikes, CPU saturation, Memory pressure, Service outages, and Traffic bursts.
   - Live before-and-after telemetry comparison.
6. **AI Incident Analyst**:
   - Correlates metric anomalies with deployment logs to generate root causes, blast radius impact, and step-by-step remediation plans.
   - **Safety Boundary**: Deterministic rules govern deployment decisions; AI never independently alters routing or triggers rollbacks.
   - Resilient offline-first design: Uses OpenAI LLM when configured, or a built-in expert deterministic heuristic engine when offline.
7. **Immutable Audit Trail**:
   - Append-only cryptographic audit logging of state transitions, rollbacks, and chaos injections.
8. **Enterprise Monitoring**:
   - Native Prometheus metrics instrumentation on `/metrics` with Grafana dashboard provisioning.

---

## 3. High-Level Architecture

```
+---------------------------------------------------------------------------------+
|                                 RELEASEGUARD AI                                 |
+---------------------------------------------------------------------------------+
                                         |
             +---------------------------+---------------------------+
             |                                                       |
             v                                                       v
  +---------------------+                                 +---------------------+
  |   React Frontend    | <====== REST API / JSON ======> |   FastAPI Backend   |
  |  Tailwind + Recharts|                                 | State Machine Core  |
  |  Vite + TypeScript  |                                 | Reliability Engine  |
  +---------------------+                                 +---------------------+
             |                                                       |
             |                                                       |
             +---------------------------+---------------------------+
                                         |
             +---------------------------+---------------------------+
             |                           |                           |
             v                           v                           v
  +---------------------+     +---------------------+     +---------------------+
  |  SQLite / PostgreSQL|     |   Chaos Lab Engine  |     |  Telemetry Adapters |
  |   Database Storage  |     |   Synthetic Faults  |     | Live K8s / Simulator|
  +---------------------+     +---------------------+     +---------------------+
                                                                     |
                                                                     v
                                                          +---------------------+
                                                          | Prometheus Exporter |
                                                          |  /metrics Endpoint  |
                                                          +---------------------+
```

---

## 4. Technology Stack

- **Frontend**:
  - React 19, TypeScript, Vite
  - Tailwind CSS, Lucide React
  - Recharts (Time-series, latency distributions, error budgets)
  - React Router DOM v7
  - Vitest + Testing Library
- **Backend**:
  - Python 3.12, FastAPI, Pydantic v2
  - SQLAlchemy 2.0 ORM
  - SQLite (Local zero-config dev mode) & PostgreSQL 16
  - Prometheus Client (`prometheus_client`)
  - Pytest + Pytest-AsyncIO
- **Infrastructure & DevOps**:
  - Docker & Docker Compose
  - Kubernetes (Deployments, Services, Ingress, HPA, ServiceMonitor)
  - Prometheus & Grafana Provisioning
  - GitHub Actions & Jenkins Pipelines

---

## 5. Project Structure

```
releaseguard-ai/
│
├── frontend/                     # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/           # Reusable enterprise UI components
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── CanaryProgressBar.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DemoScenariosModal.tsx
│   │   │   ├── NewDeploymentModal.tsx
│   │   │   ├── NewServiceModal.tsx
│   │   │   └── ConfirmationModal.tsx
│   │   ├── layouts/              # AppLayout shell
│   │   ├── pages/                # 10 Functional Platform Pages
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── ServicesPage.tsx
│   │   │   ├── ServiceDetailPage.tsx
│   │   │   ├── DeploymentsPage.tsx
│   │   │   ├── DeploymentDetailPage.tsx
│   │   │   ├── SLOPage.tsx
│   │   │   ├── MonitoringPage.tsx
│   │   │   ├── IncidentsPage.tsx
│   │   │   ├── AIInsightsPage.tsx
│   │   │   ├── ChaosLabPage.tsx
│   │   │   ├── AuditLogsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/             # API client methods
│   │   ├── test/                 # Vitest test suite
│   │   └── types/                # TypeScript interface definitions
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # Python 3.12 + FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── adapters/             # Kubernetes, Simulator, Prometheus adapters
│   │   │   ├── simulator.py
│   │   │   ├── kubernetes.py
│   │   │   └── prometheus_exporter.py
│   │   ├── api/                  # REST API Endpoints
│   │   │   ├── services.py
│   │   │   ├── deployments.py
│   │   │   ├── slo.py
│   │   │   ├── metrics.py
│   │   │   ├── incidents.py
│   │   │   ├── chaos.py
│   │   │   ├── audit.py
│   │   │   ├── ai.py
│   │   │   └── demo.py
│   │   ├── core/                 # Config & Database sessions
│   │   ├── engines/              # Core Reliability Engines
│   │   │   ├── state_machine.py
│   │   │   ├── slo_engine.py
│   │   │   ├── rollback_engine.py
│   │   │   └── ai_analyst.py
│   │   ├── models/               # SQLAlchemy Models
│   │   ├── schemas/              # Pydantic Schemas
│   │   ├── services/             # Initial Demo Seeder
│   │   └── main.py               # FastAPI App Entrypoint
│   ├── tests/                    # Pytest Suite (10 unit/integration tests)
│   └── requirements.txt
│
├── infrastructure/               # Docker, K8s, Prometheus, Grafana
│   ├── docker/
│   ├── kubernetes/
│   ├── prometheus/
│   └── grafana/
│
├── docs/                         # Engineering Documentation
│   ├── architecture.md
│   ├── deployment-flow.md
│   ├── slo-engine.md
│   ├── rollback-design.md
│   └── demo-guide.md
│
├── docker-compose.yml
├── Jenkinsfile
├── .github/workflows/ci-cd.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Quick Start & Installation

### Option A: Local Development Mode (Zero-Config)

#### 1. Backend Setup:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Prometheus Exporter: `http://localhost:8000/metrics`

#### 2. Frontend Setup:
```powershell
cd frontend
npm install
npm run dev
```
- Frontend UI: `http://localhost:5173`

---

### Option B: Docker Compose (Full Stack)
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (Credentials: `admin` / `admin`)

---

## 7. Interactive Demonstration Scenarios

Click the **"Demo Scenarios"** button in the top navigation bar to trigger any of the three repeatable demonstration workflows:

| Scenario | Service | Fault Injected | Automated Safety Outcome |
|---|---|---|---|
| **DEMO 1: Successful Canary Rollout** | `policy-api:v3.2.0` | None (Healthy build) | Progresses $10\% \to 50\% \to 100\%$ and **PROMOTED**. |
| **DEMO 2: Error Spike & Auto-Rollback** | `claims-api:v2.4.1-err` | 8.57% HTTP 500 error spike | Violation detected; traffic drained to $0\%$; **ROLLED_BACK** to healthy baseline; AI Incident opened. |
| **DEMO 3: Latency Anomaly & Progression Pause** | `payment-service:v1.8.5-lat` | P95 latency spiked to 780ms | Intercepted by safety gate; progression **PAUSED** to prevent customer SLA penalty. |

---

## 8. Automated Testing

### Backend Test Suite (Pytest)
```powershell
cd backend
.\.venv\Scripts\pytest -v tests/test_backend.py
```
**Test Coverage Includes**:
- Valid deployment lifecycle state transitions.
- Concurrency locks & invalid state transition rejection.
- Mathematical error budget calculation & consumption rate.
- Telemetry sufficiency & `UNKNOWN` state handling.
- Automated rollback execution on SLO breach.
- Failed rollback verification handling (critical incident path).
- Chaos experiment lifecycle.
- Prometheus exporter metrics output.

### Frontend Test Suite (Vitest)
```powershell
cd frontend
npm test
```
**Test Coverage Includes**:
- Status badge formatting across all lifecycle states.
- Canary progress bar multi-stage traffic slicing.
- Metric cards, thresholds, and confirmation modal workflows.

---

## 9. Platform Engineering Deep-Dive

### Why SLOs Matter Over Static Thresholds
Static CPU or memory alerts fire regardless of user impact. Service Level Objectives (SLOs) align deployment decisions with actual user experience: an application using 85% CPU that responds in 20ms with 0 errors is healthy, whereas an application using 10% CPU with 5% unhandled 500 errors is broken.

### Why Deterministic Rules Control Deployment Safety
While LLMs excel at qualitative diagnosis (synthesizing logs, explaining error cascades, and suggesting PR remedies), LLMs must **never** be in the critical path of deployment decisions or traffic routing. Deterministic mathematical rules evaluate error budgets with 100% predictability, eliminating hallucination risks in live production pipelines.

---

## 10. License & Author
Engineered for technical evaluation at technology-driven enterprise organizations.
Licensed under the Apache 2.0 License.
