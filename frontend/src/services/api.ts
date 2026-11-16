import {
  Service, Deployment, SLOSummary, Incident,
  ChaosExperiment, AuditLog, DashboardOverview, PortfolioInsights
} from '../types';

// Support both VITE_API_BASE_URL and VITE_API_URL
const rawEnvUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).trim();

// Normalize URL:
// If user enters "https://my-backend.onrender.com", append "/api"
// If user enters "https://my-backend.onrender.com/api", use as is
// If empty, fallback to local development URL
export const API_BASE = (() => {
  if (!rawEnvUrl) return 'http://localhost:8000/api';
  const clean = rawEnvUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
})();

export const BACKEND_ROOT = API_BASE.replace(/\/api$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      } else if (errorData.message) {
        errorMsg = errorData.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Services
  getServices: (environment?: string, search?: string) => {
    const params = new URLSearchParams();
    if (environment && environment !== 'all') params.append('environment', environment);
    if (search) params.append('search', search);
    return request<Service[]>(`/services?${params.toString()}`);
  },
  getService: (id: string) => request<Service>(`/services/${id}`),
  createService: (data: Partial<Service>) => request<Service>('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateService: (id: string, data: Partial<Service>) => request<Service>(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteService: (id: string) => request<{ message: string }>(`/services/${id}`, {
    method: 'DELETE',
  }),

  // Deployments
  getDeployments: (serviceId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.append('service_id', serviceId);
    if (status && status !== 'all') params.append('status', status);
    return request<Deployment[]>(`/deployments?${params.toString()}`);
  },
  getDeployment: (id: string) => request<Deployment>(`/deployments/${id}`),
  createDeployment: (data: {
    service_id: string;
    version: string;
    strategy?: string;
    initial_traffic_percentage?: number;
    auto_rollback_enabled?: boolean;
    observation_duration_sec?: number;
  }) => request<Deployment>('/deployments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  advanceDeployment: (id: string) => request<Deployment>(`/deployments/${id}/advance`, {
    method: 'POST',
  }),
  promoteDeployment: (id: string, target_traffic_percentage?: number) => request<Deployment>(`/deployments/${id}/promote`, {
    method: 'POST',
    body: JSON.stringify({ target_traffic_percentage }),
  }),
  pauseDeployment: (id: string, reason?: string) => request<Deployment>(`/deployments/${id}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  rollbackDeployment: (id: string, reason?: string) => request<Deployment>(`/deployments/${id}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  // SLOs
  getAllSLOs: () => request<SLOSummary[]>('/slo'),
  getServiceSLO: (serviceId: string) => request<SLOSummary>(`/slo/${serviceId}`),

  // Metrics & Dashboard
  getDashboardOverview: (environment?: string) => {
    const params = new URLSearchParams();
    if (environment && environment !== 'all') params.append('environment', environment);
    return request<DashboardOverview>(`/metrics/overview?${params.toString()}`);
  },
  getServiceMetrics: (serviceId: string) => request<any>(`/metrics/service/${serviceId}`),
  triggerTelemetryTick: () => request<{ status: string; snapshots_generated: number }>('/metrics/tick', {
    method: 'POST',
  }),

  // Incidents
  getIncidents: (status?: string, severity?: string, serviceId?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (severity && severity !== 'all') params.append('severity', severity);
    if (serviceId) params.append('service_id', serviceId);
    return request<Incident[]>(`/incidents?${params.toString()}`);
  },
  getIncident: (id: string) => request<Incident>(`/incidents/${id}`),
  updateIncident: (id: string, data: { status: string; notes?: string }) => request<Incident>(`/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Chaos Lab
  getChaosExperiments: (serviceId?: string, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (serviceId) params.append('service_id', serviceId);
    if (activeOnly) params.append('active_only', 'true');
    return request<ChaosExperiment[]>(`/chaos/experiments?${params.toString()}`);
  },
  startChaosExperiment: (data: {
    service_id: string;
    experiment_type: string;
    severity: number;
    duration_seconds?: number;
    latency_ms?: number;
    error_rate_pct?: number;
    notes?: string;
  }) => request<ChaosExperiment>('/chaos/experiments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  stopChaosExperiment: (id: string) => request<ChaosExperiment>(`/chaos/experiments/${id}/stop`, {
    method: 'POST',
  }),

  // Audit Logs
  getAuditLogs: (search?: string, action?: string, target_type?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (action) params.append('action', action);
    if (target_type) params.append('target_type', target_type);
    return request<AuditLog[]>(`/audit-logs?${params.toString()}`);
  },

  // AI Insights
  getPortfolioInsights: () => request<PortfolioInsights>('/ai/insights'),
  requestAIAnalysis: (data: {
    service_id: string;
    version?: string;
    triggering_condition: string;
    observed_metrics?: any;
  }) => request<any>('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Demo Scenarios
  getDemoStatus: () => request<{ cluster_info: any; available_scenarios: any[] }>('/demo/status'),
  resetDemoData: () => request<{ status: string; message: string }>('/demo/reset', {
    method: 'POST',
  }),
  runDemoScenario1: () => request<Deployment>('/demo/scenario-1', { method: 'POST' }),
  runDemoScenario2: () => request<Deployment>('/demo/scenario-2', { method: 'POST' }),
  runDemoScenario3: () => request<Deployment>('/demo/scenario-3', { method: 'POST' }),

  // System Health
  getHealth: () => request<any>('/health'),
};
