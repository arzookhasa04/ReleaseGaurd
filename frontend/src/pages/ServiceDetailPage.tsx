import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Server, GitFork, AlertOctagon, Activity, Rocket,
  ArrowLeft, CheckCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { NewDeploymentModal } from '../components/NewDeploymentModal';
import { Service, SLOSummary, Deployment } from '../types';
import { api } from '../services/api';

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<Service | null>(null);
  const [slo, setSlo] = useState<SLOSummary | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeployOpen, setIsDeployOpen] = useState(false);

  const fetchServiceData = async () => {
    if (!id) return;
    try {
      const [svcData, sloData, metricsData, depsData] = await Promise.all([
        api.getService(id),
        api.getServiceSLO(id),
        api.getServiceMetrics(id),
        api.getDeployments(id)
      ]);
      setService(svcData);
      setSlo(sloData);
      setMetrics(metricsData);
      setDeployments(depsData);
    } catch (err) {
      console.error('Failed to load service detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceData();
    const interval = setInterval(fetchServiceData, 6000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading && !service) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-xs">
        <Activity className="w-6 h-6 text-cyan-400 animate-spin mr-2" />
        Loading service profile & SLO evaluation...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 text-center text-slate-400">
        Service not found.
        <button onClick={() => navigate('/services')} className="ml-2 text-cyan-400 underline">
          Return to Service Catalog
        </button>
      </div>
    );
  }

  const chartData = metrics?.history?.map((snap: any) => ({
    time: new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    error_rate: snap.error_rate,
    p95: snap.p95_latency,
    availability: snap.availability
  })) || [];

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <button
          onClick={() => navigate('/services')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Services</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-violet-950/80 text-violet-400 border border-violet-800/60">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-mono">{service.name}</h1>
                <StatusBadge status={service.health_status} />
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {service.description}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 mt-2">
                <span>Version: <strong className="text-cyan-400">{service.current_version}</strong></span>
                <span>Strategy: <strong className="text-slate-300">{service.deployment_strategy}</strong></span>
                <span>Owner: <strong className="text-slate-300">{service.owner}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDeployOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Deploy New Version</span>
            </button>
          </div>
        </div>
      </div>

      {/* SLO & Error Budget Overview */}
      {slo && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Reliability & SLO Error Budget
              </h3>
            </div>
            <StatusBadge status={slo.error_budget_status} size="sm" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-mono block">Availability Target</span>
              <span className="text-xl font-bold text-white font-mono">{slo.availability_target}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">SLA boundary</span>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-mono block">Current Availability</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{slo.current_availability?.toFixed(2)}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Sample window</span>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-mono block">Total Allowed Error Budget</span>
              <span className="text-xl font-bold text-slate-200 font-mono">{slo.error_budget_total_pct}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">(100 - Target)</span>
            </div>
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-mono block">Remaining Budget</span>
              <span className="text-xl font-bold text-cyan-400 font-mono">{slo.error_budget_remaining_pct}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Consumed: {slo.error_budget_consumed_pct}%</span>
            </div>
          </div>

          {/* Evaluations Checklist */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Active Evaluation Gates
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {slo.evaluations.map((ev, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-200 block">{ev.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{ev.description}</span>
                  </div>
                  <StatusBadge status={ev.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error Rate Chart */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Error Rate Telemetry (%)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="error_rate" stroke="#F43F5E" strokeWidth={2} dot={false} name="Error Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P95 Latency Chart */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">P95 Response Latency (ms)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="ms" />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="p95" stroke="#06B6D4" strokeWidth={2} dot={false} name="P95 Latency" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deployment History Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Deployment Lifecycle History ({deployments.length})
        </h3>

        {deployments.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {deployments.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/deployments/${d.id}`)}
                className="py-3.5 flex items-center justify-between hover:bg-slate-850/50 px-2 rounded cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{d.version}</span>
                    <StatusBadge status={d.status} size="sm" />
                    {d.is_simulated && (
                      <span className="text-[10px] font-mono text-slate-500">[Simulated]</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Created: {new Date(d.created_at).toLocaleString()}
                    {d.previous_healthy_version && ` • Restored baseline: ${d.previous_healthy_version}`}
                  </div>
                  {d.rollback_reason && (
                    <div className="text-[11px] text-violet-300 mt-1">
                      Rollback Reason: {d.rollback_reason}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-cyan-400">{d.traffic_percentage}%</span>
                  <span className="text-[11px] text-slate-500 block font-mono">traffic</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No deployments recorded for this service.
          </div>
        )}
      </div>

      <NewDeploymentModal
        isOpen={isDeployOpen}
        services={service ? [service] : []}
        defaultServiceId={service.id}
        onClose={() => setIsDeployOpen(false)}
        onCreated={(depId) => {
          navigate(`/deployments/${depId}`);
        }}
      />
    </div>
  );
};
