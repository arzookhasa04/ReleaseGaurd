# ReleaseGuard AI — System Architecture

ReleaseGuard AI is an enterprise-grade platform engineering solution designed to eliminate bad releases before they impact production customer journeys.

Traditional CI/CD pipelines only verify that unit/integration tests pass at build time. They cannot predict how an artifact will behave under real network loads, database contention, or configuration drift. ReleaseGuard AI solves this by coupling progressive canary rollouts with mathematically enforced Service Level Objectives (SLOs) and an automated recovery state machine.

```
+-------------------------------------------------------------------------+
|                         RELEASEGUARD AI PLATFORM                        |
+-------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    +--------------------+                       +--------------------+
    | React 19 Frontend  |                       |  FastAPI Backend   |
    | Tailwind + Recharts| <--- REST / JSON ---> | State Machine Core |
    | Vite + TypeScript  |                       | Reliability Engine |
    +--------------------+                       +--------------------+
                                                           |
          +------------------------------------------------+
          |                        |                       |
          v                        v                       v
+--------------------+   +--------------------+  +--------------------+
| SQLite / PostgreSQL|   |  Chaos Lab Engine  |  |  Telemetry Adapters|
| Database Storage   |   | Synthetic Faults   |  | Live K8s / Simulator|
+--------------------+   +--------------------+  +--------------------+
                                                           |
                                                           v
                                                 +--------------------+
                                                 | Prometheus Exporter|
                                                 |  /metrics Endpoint |
                                                 +--------------------+
```

## Core Modules

### 1. State Machine Engine (`app.engines.state_machine`)
Enforces strict lifecycle state transitions for every release:
- `PENDING` -> `BUILDING` -> `TESTING` -> `READY` -> `CANARY` -> `MONITORING` -> `PROMOTED`
- Recovery paths: `PAUSED`, `ROLLBACK` -> `ROLLED_BACK` (or `FAILED` if recovery verification fails).
- Thread-safe serialization prevents race conditions between concurrent promotions and automated rollbacks.

### 2. Deterministic Reliability Engine (`app.engines.slo_engine`)
Evaluates telemetry against mathematical error budgets:
$$\text{Allowed Error Budget} = 100\% - \text{Availability Target}$$
$$\text{Consumed Budget} = \frac{100\% - \text{Observed Availability}}{\text{Allowed Error Budget}} \times 100\%$$
- Evaluates HTTP error rates, P95 response latency, CPU utilization, and memory pressure.
- Returns explicit `UNKNOWN` state if telemetry points are insufficient.

### 3. Automated Recovery Engine (`app.engines.rollback_engine`)
- Detects SLO violation during active canary slice.
- Drains canary traffic to 0%.
- Restores previous healthy version baseline.
- Performs mandatory health verification of the restored release.
- Automatically generates an Incident record correlated with the release.

### 4. AI Incident Analyst (`app.engines.ai_analyst`)
- Analyzes telemetry anomalies and deployment logs.
- Uses LLM when configured (`OPENAI_API_KEY`) or resilient local deterministic expert heuristics.
- **Safety Policy**: AI provides diagnostic advice only; AI never independently alters deployment state or triggers rollbacks.
