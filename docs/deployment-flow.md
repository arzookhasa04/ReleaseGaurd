# Canary Deployment & Traffic Flow

ReleaseGuard AI controls progressive canary traffic increments to limit the blast radius of any faulty release candidate.

## Progressive Rollout Stages

```
   [0% Traffic]
        |
        v
    [BUILDING] ---------> [TESTING] ---------> [READY]
                                                 |
                                                 v
                                          [CANARY (5% - 10%)]
                                                 |
                                      +----------+----------+
                                      |                     |
                                (SLO Healthy)         (SLO Violation)
                                      |                     |
                                      v                     v
                             [MONITORING (25%)]       [AUTO-ROLLBACK (0%)]
                                      |                     |
                                (SLO Healthy)               v
                                      |               [RESTORE BASELINE]
                                      v                     |
                             [CANARY (50%)]                 v
                                      |               [VERIFY HEALTH]
                                (SLO Healthy)               |
                                      |                     v
                                      v               [INCIDENT CREATED]
                             [PROMOTED (100%)]
```

## Observation & Traffic Slicing
1. **Initial Canary (5% - 10%)**: Routes a small canary fraction.
2. **Observation Window**: Telemetry snapshots are evaluated continuously against:
   - HTTP Error Rate $\le \text{Max Allowed (e.g. 1.0\%)}$
   - P95 Response Latency $\le \text{Max Allowed (e.g. 450ms)}$
   - Availability $\ge \text{Target (e.g. 99.9\%)}$
3. **Mid-Canary (25% - 50%)**: Traffic is gradually expanded once earlier stages pass without error budget burn.
4. **Promotion (100%)**: Release is promoted to primary stable version only after passing all stages.
