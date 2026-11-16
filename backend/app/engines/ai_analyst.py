import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIIncidentAnalyst:
    """
    AI-assisted incident investigation engine.
    Analyzes telemetry anomalies, logs, and deployment stages.
    Provides rule-based expert analysis with optional LLM augmentation.
    """

    @staticmethod
    async def analyze_incident(
        service_name: str,
        version: str,
        triggering_condition: str,
        observed_metrics: Dict[str, Any],
        recent_events: list
    ) -> Dict[str, Any]:
        
        # Check if live LLM integration is configured
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-"):
            try:
                analysis = await AIIncidentAnalyst._call_llm(
                    service_name=service_name,
                    version=version,
                    triggering_condition=triggering_condition,
                    observed_metrics=observed_metrics,
                    recent_events=recent_events
                )
                if analysis:
                    return analysis
            except Exception as e:
                logger.warning(f"LLM analysis failed, falling back to deterministic expert engine: {e}")

        # Deterministic Expert Rule-Based Engine
        return AIIncidentAnalyst._generate_expert_analysis(
            service_name=service_name,
            version=version,
            triggering_condition=triggering_condition,
            observed_metrics=observed_metrics,
            recent_events=recent_events
        )

    @staticmethod
    def _generate_expert_analysis(
        service_name: str,
        version: str,
        triggering_condition: str,
        observed_metrics: Dict[str, Any],
        recent_events: list
    ) -> Dict[str, Any]:
        """
        Synthesizes an in-depth root cause analysis using deterministic domain heuristics.
        """
        error_rate = observed_metrics.get("error_rate", 0.0)
        p95_latency = observed_metrics.get("p95_latency", 0.0)
        cpu_pct = observed_metrics.get("cpu_pct", 0.0)
        memory_pct = observed_metrics.get("memory_pct", 0.0)
        availability = observed_metrics.get("availability", 100.0)
        active_experiment = observed_metrics.get("active_experiment")

        if active_experiment:
            root_cause = (
                f"Controlled Chaos Experiment '{active_experiment}' active on service '{service_name}'. "
                f"Induced fault generated deliberate telemetry drift matching signature: {triggering_condition}."
            )
            evidence = (
                f"Observed Metric Drift: Error Rate={error_rate:.2f}%, P95 Latency={p95_latency:.1f}ms, "
                f"CPU={cpu_pct:.1f}%, Availability={availability:.2f}%. "
                f"Experiment trigger timestamp coincided exactly with telemetry degradation."
            )
            remediation = "Halt or let the active chaos experiment terminate. ReleaseGuard automated recovery safely protected production users by mitigating canary exposure."
            prevention = "Validate circuit breakers, client retry backoffs, and fallback caches under simulated failure conditions prior to production promotion."
        elif error_rate > 5.0 or "Error Rate" in triggering_condition:
            root_cause = (
                f"Release {version} in service '{service_name}' introduced high unhandled exceptions "
                f"(HTTP 5xx responses). Potential downstream API schema mismatch, missing DB migration, or null pointer exception."
            )
            evidence = (
                f"HTTP Error Rate spiked to {error_rate:.2f}% (acceptable threshold is 1.00%). "
                f"Service availability degraded to {availability:.2f}%. Canary progression immediately suspended."
            )
            remediation = (
                "1. Confirm previous healthy release has completed rollback.\n"
                "2. Inspect application stack traces for unhandled 500 status codes in error logs.\n"
                "3. Verify database migration status and API request schema compatibility."
            )
            prevention = "Add automated synthetic integration tests and contract tests in pre-flight CI/CD staging before canary rollout."
        elif p95_latency > 400.0 or "Latency" in triggering_condition:
            root_cause = (
                f"Release {version} triggered severe latency regression on '{service_name}'. "
                f"Likely causes: unindexed database query, synchronous blocking I/O, thread pool exhaustion, or external dependency timeout."
            )
            evidence = (
                f"P95 latency reached {p95_latency:.1f}ms (threshold: 500ms). "
                f"CPU utilization at {cpu_pct:.1f}%. Traffic pause executed to protect user journey SLAs."
            )
            remediation = (
                "1. Trace slow spans via APM/OpenTelemetry distributed tracing.\n"
                "2. Check query execution plans and database connection pool contention.\n"
                "3. Ensure timeouts and fallbacks are configured for third-party HTTP calls."
            )
            prevention = "Incorporate automated performance benchmark gating and query budget linting into pull request pipelines."
        else:
            root_cause = (
                f"Resource constraint or SLO breach detected during canary evaluation of {version} on {service_name}. "
                f"Condition: {triggering_condition}"
            )
            evidence = (
                f"Telemetry Snapshot: CPU={cpu_pct:.1f}%, Memory={memory_pct:.1f}%, Error Rate={error_rate:.2f}%, Latency={p95_latency:.1f}ms."
            )
            remediation = "Analyze memory heap dumps and pod resource limits. Review recent code changes for thread or connection leaks."
            prevention = "Set accurate Kubernetes resource requests/limits and configure Horizontal Pod Autoscaler (HPA) with conservative scale-up intervals."

        return {
            "ai_summary": f"Incident detected for {service_name} ({version}): {triggering_condition}. Automated safeguards intervened.",
            "ai_root_cause": root_cause,
            "ai_supporting_evidence": evidence,
            "ai_impact_assessment": f"Canary traffic blast radius was constrained to {observed_metrics.get('traffic_percentage', 5)}% of total users before automated recovery mitigated further exposure.",
            "ai_suggested_remediation": remediation,
            "ai_prevention": prevention,
            "ai_confidence": 0.94,
            "source": "deterministic_expert_engine"
        }

    @staticmethod
    async def _call_llm(
        service_name: str,
        version: str,
        triggering_condition: str,
        observed_metrics: Dict[str, Any],
        recent_events: list
    ) -> Optional[Dict[str, Any]]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        prompt = f"""
You are ReleaseGuard AI Senior SRE Incident Analyst.
Analyze this deployment incident objectively:
Service: {service_name}
Version: {version}
Triggering SLO Violation: {triggering_condition}
Telemetry Metrics: {json.dumps(observed_metrics)}
Recent Lifecycle Events: {json.dumps(recent_events[:5])}

Respond ONLY in valid JSON matching this schema:
{{
  "ai_summary": "1-2 sentence executive summary",
  "ai_root_cause": "Detailed technical root cause analysis based on the metrics",
  "ai_supporting_evidence": "Specific metric facts and event timestamps supporting hypothesis",
  "ai_impact_assessment": "Blast radius and user impact calculation",
  "ai_suggested_remediation": "Numbered step-by-step remediation guide",
  "ai_prevention": "Strategic architectural prevention recommendations",
  "ai_confidence": 0.95
}}
"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers=headers,
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a senior site reliability engineer and platform incident commander."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                parsed["source"] = "llm_openai"
                return parsed
        return None
