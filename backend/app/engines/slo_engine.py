from typing import List, Tuple, Optional
from datetime import datetime, timezone
from app.models import Service, MetricSnapshot
from app.schemas.slo import SLOSummaryOut, SLOMetricEvaluation

class SLOEngine:
    """
    Deterministic reliability evaluation engine.
    Calculates exact error budgets, SLO compliance, and deployment safety.
    """

    MIN_TELEMETRY_POINTS = 1

    @staticmethod
    def evaluate_service_slo(service: Service, snapshots: List[MetricSnapshot]) -> SLOSummaryOut:
        now = datetime.now(timezone.utc)
        target_availability = service.slo_target_availability
        
        # Allowed error budget percentage: e.g. 100 - 99.9 = 0.1%
        total_error_budget = round(100.0 - target_availability, 4)

        if not snapshots or len(snapshots) < SLOEngine.MIN_TELEMETRY_POINTS:
            # Explicit UNKNOWN state when insufficient monitoring data is available
            return SLOSummaryOut(
                service_id=service.id,
                service_name=service.name,
                overall_status="UNKNOWN",
                availability_target=target_availability,
                current_availability=None,
                error_budget_total_pct=total_error_budget,
                error_budget_consumed_pct=0.0,
                error_budget_remaining_pct=100.0,
                error_budget_status="UNKNOWN",
                evaluations=[
                    SLOMetricEvaluation(
                        name="Telemetry Sufficiency",
                        target=float(SLOEngine.MIN_TELEMETRY_POINTS),
                        current_value=float(len(snapshots)),
                        unit="snapshots",
                        status="UNKNOWN",
                        description="Insufficient telemetry data available for strict mathematical evaluation."
                    )
                ],
                timestamp=now,
                data_points_analyzed=len(snapshots),
                is_telemetry_sufficient=False
            )

        # Aggregate metrics over sample window
        total_requests = sum(s.request_count for s in snapshots)
        total_errors = sum(s.error_count for s in snapshots)
        
        if total_requests > 0:
            current_availability = round(((total_requests - total_errors) / total_requests) * 100.0, 3)
            current_error_rate = round((total_errors / total_requests) * 100.0, 3)
        else:
            # Fallback to mean of snapshot availability
            current_availability = round(sum(s.availability for s in snapshots) / len(snapshots), 3)
            current_error_rate = round(sum(s.error_rate for s in snapshots) / len(snapshots), 3)

        avg_p95 = round(sum(s.p95_latency for s in snapshots) / len(snapshots), 2)
        avg_cpu = round(sum(s.cpu_pct for s in snapshots) / len(snapshots), 2)
        avg_mem = round(sum(s.memory_pct for s in snapshots) / len(snapshots), 2)

        # Error budget math:
        # If Target is 99.9%, allowed error rate is 0.1%
        # If current error rate is 0.05%, consumed budget is 50%, remaining is 50%
        # If current error rate is 0.15%, consumed budget is 150%, remaining is 0%
        if total_error_budget > 0:
            unavailability = max(0.0, 100.0 - current_availability)
            consumed_pct = round((unavailability / total_error_budget) * 100.0, 2)
            remaining_pct = max(0.0, round(100.0 - consumed_pct, 2))
        else:
            consumed_pct = 0.0
            remaining_pct = 100.0

        if remaining_pct <= 0.0:
            budget_status = "EXHAUSTED"
        elif remaining_pct < 25.0:
            budget_status = "WARNING"
        else:
            budget_status = "HEALTHY"

        # Metric evaluations
        evaluations: List[SLOMetricEvaluation] = []

        # 1. Availability
        avail_status = "PASS" if current_availability >= target_availability else "FAIL"
        evaluations.append(SLOMetricEvaluation(
            name="Service Availability",
            target=target_availability,
            current_value=current_availability,
            unit="%",
            status=avail_status,
            description=f"Target: {target_availability}%. Current: {current_availability}% over evaluation window."
        ))

        # 2. Error Rate
        err_status = "PASS" if current_error_rate <= service.slo_max_error_rate else "FAIL"
        evaluations.append(SLOMetricEvaluation(
            name="HTTP Error Rate",
            target=service.slo_max_error_rate,
            current_value=current_error_rate,
            unit="%",
            status=err_status,
            description=f"Max Allowed: {service.slo_max_error_rate}%. Current: {current_error_rate}%."
        ))

        # 3. P95 Latency
        lat_status = "PASS" if avg_p95 <= service.slo_max_p95_latency else "FAIL"
        evaluations.append(SLOMetricEvaluation(
            name="P95 Response Latency",
            target=service.slo_max_p95_latency,
            current_value=avg_p95,
            unit="ms",
            status=lat_status,
            description=f"Max Allowed: {service.slo_max_p95_latency}ms. Observed: {avg_p95}ms."
        ))

        # 4. CPU Utilisation
        cpu_status = "PASS" if avg_cpu <= service.slo_max_cpu_pct else "FAIL"
        evaluations.append(SLOMetricEvaluation(
            name="CPU Utilization",
            target=service.slo_max_cpu_pct,
            current_value=avg_cpu,
            unit="%",
            status=cpu_status,
            description=f"Max Threshold: {service.slo_max_cpu_pct}%. Observed: {avg_cpu}%."
        ))

        # 5. Memory Utilisation
        mem_status = "PASS" if avg_mem <= service.slo_max_memory_pct else "FAIL"
        evaluations.append(SLOMetricEvaluation(
            name="Memory Utilization",
            target=service.slo_max_memory_pct,
            current_value=avg_mem,
            unit="%",
            status=mem_status,
            description=f"Max Threshold: {service.slo_max_memory_pct}%. Observed: {avg_mem}%."
        ))

        # Overall status derivation
        any_failed = any(e.status == "FAIL" for e in evaluations)
        if any_failed or budget_status == "EXHAUSTED":
            overall_status = "BREACHED"
        elif budget_status == "WARNING":
            overall_status = "DEGRADED"
        else:
            overall_status = "HEALTHY"

        return SLOSummaryOut(
            service_id=service.id,
            service_name=service.name,
            overall_status=overall_status,
            availability_target=target_availability,
            current_availability=current_availability,
            error_budget_total_pct=total_error_budget,
            error_budget_consumed_pct=consumed_pct,
            error_budget_remaining_pct=remaining_pct,
            error_budget_status=budget_status,
            evaluations=evaluations,
            timestamp=now,
            data_points_analyzed=len(snapshots),
            is_telemetry_sufficient=True
        )

    @staticmethod
    def is_deployment_safe(service: Service, snapshot: Optional[MetricSnapshot]) -> Tuple[bool, Optional[str]]:
        """
        Determines whether the canary deployment is safe to advance traffic.
        Returns (is_safe, violation_reason).
        """
        if not snapshot:
            return True, None # No violation detected yet
        
        # Check Error Rate threshold
        if snapshot.error_rate > service.slo_max_error_rate:
            return False, f"SLO Violation: HTTP Error Rate {snapshot.error_rate:.2f}% exceeds threshold of {service.slo_max_error_rate:.2f}%"

        # Check P95 Latency threshold
        if snapshot.p95_latency > service.slo_max_p95_latency:
            return False, f"SLO Violation: P95 Latency {snapshot.p95_latency:.1f}ms exceeds threshold of {service.slo_max_p95_latency:.1f}ms"

        # Check Availability target
        if snapshot.availability < service.slo_target_availability:
            return False, f"SLO Violation: Availability {snapshot.availability:.2f}% dropped below target {service.slo_target_availability:.2f}%"

        # Check CPU threshold
        if snapshot.cpu_pct > service.slo_max_cpu_pct:
            return False, f"SLO Violation: CPU Utilization {snapshot.cpu_pct:.1f}% exceeds threshold of {service.slo_max_cpu_pct:.1f}%"

        # Check Memory threshold
        if snapshot.memory_pct > service.slo_max_memory_pct:
            return False, f"SLO Violation: Memory Utilization {snapshot.memory_pct:.1f}% exceeds threshold of {service.slo_max_memory_pct:.1f}%"

        return True, None
