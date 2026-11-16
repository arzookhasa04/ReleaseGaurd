export type Environment = 'development' | 'staging' | 'production' | 'all';

export type DeploymentStatus = 
  | 'PENDING'
  | 'BUILDING'
  | 'TESTING'
  | 'READY'
  | 'CANARY'
  | 'MONITORING'
  | 'PROMOTED'
  | 'PAUSED'
  | 'ROLLBACK'
  | 'ROLLED_BACK'
  | 'FAILED';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  current_version: string;
  environment: string;
  health_check_endpoint: string;
  deployment_strategy: string;
  slo_target_availability: number;
  slo_max_error_rate: number;
  slo_max_p95_latency: number;
  slo_max_cpu_pct: number;
  slo_max_memory_pct: number;
  owner: string;
  created_at: string;
  updated_at: string;
  active_deployments_count: number;
  active_incidents_count: number;
  health_status: 'HEALTHY' | 'DEGRADED' | 'BREACHED' | 'UNKNOWN';
}

export interface DeploymentEvent {
  id: string;
  deployment_id: string;
  stage: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  metric_payload: string | null;
  timestamp: string;
}

export interface Deployment {
  id: string;
  service_id: string;
  service_name: string;
  version: string;
  previous_healthy_version: string | null;
  status: DeploymentStatus;
  traffic_percentage: number;
  strategy: string;
  observation_duration_sec: number;
  auto_rollback_enabled: boolean;
  failure_reason: string | null;
  rollback_reason: string | null;
  is_simulated: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  events: DeploymentEvent[];
}

export interface SLOMetricEvaluation {
  name: string;
  target: number;
  current_value: number | null;
  unit: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  description: string;
}

export interface SLOSummary {
  service_id: string;
  service_name: string;
  overall_status: 'HEALTHY' | 'DEGRADED' | 'BREACHED' | 'UNKNOWN';
  availability_target: number;
  current_availability: number | null;
  error_budget_total_pct: number;
  error_budget_consumed_pct: number;
  error_budget_remaining_pct: number;
  error_budget_status: 'HEALTHY' | 'WARNING' | 'EXHAUSTED' | 'UNKNOWN';
  evaluations: SLOMetricEvaluation[];
  timestamp: string;
  data_points_analyzed: number;
  is_telemetry_sufficient: boolean;
}

export interface Incident {
  id: string;
  service_id: string;
  service_name: string;
  deployment_id: string | null;
  deployment_version: string | null;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  triggering_condition: string;
  observed_metrics: string | null;
  ai_summary: string | null;
  ai_root_cause: string | null;
  ai_supporting_evidence: string | null;
  ai_impact_assessment: string | null;
  ai_suggested_remediation: string | null;
  ai_prevention: string | null;
  ai_confidence: number;
  acknowledged_by: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ChaosExperiment {
  id: string;
  service_id: string;
  service_name?: string;
  experiment_type: 'HTTP_500' | 'LATENCY_SPIKE' | 'CPU_SPIKE' | 'MEMORY_PRESSURE' | 'OUTAGE' | 'TRAFFIC_BURST';
  severity: number;
  latency_ms: number;
  error_rate_pct: number;
  cpu_load_pct: number;
  duration_seconds: number;
  is_active: boolean;
  started_at: string;
  stopped_at: string | null;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target_type: string;
  target_id: string;
  details: string | null;
  outcome: 'SUCCESS' | 'FAILURE';
  timestamp: string;
}

export interface MetricSnapshot {
  id: string;
  service_id: string;
  service_name?: string;
  deployment_id: string | null;
  request_count: number;
  error_count: number;
  error_rate: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  cpu_pct: number;
  memory_pct: number;
  availability: number;
  is_simulated: boolean;
  timestamp: string;
}

export interface DashboardOverview {
  total_services: number;
  active_deployments: number;
  deployment_success_rate: number;
  total_rollbacks: number;
  current_avg_error_rate: number;
  current_avg_p95_latency: number;
  active_incidents_count: number;
  environment: string;
  is_simulated_infrastructure: boolean;
  recent_deployments: any[];
  active_incidents: any[];
  services_health: any[];
  deployment_frequency: any[];
  latency_trends: any[];
  error_rate_trends: any[];
}

export interface PortfolioInsights {
  engine_mode: string;
  llm_model: string;
  total_analyzed_services: number;
  total_analyzed_incidents: number;
  portfolio_rollback_rate_pct: number;
  insights: {
    id: string;
    category: string;
    title: string;
    finding: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;
    confidence: number;
  }[];
}
