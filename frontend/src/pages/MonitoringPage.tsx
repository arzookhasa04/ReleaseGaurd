import React, { useState, useEffect } from 'react';
import {
  BarChart3, Activity, RefreshCw, Server, AlertCircle,
  ExternalLink, Layers, CheckCircle2, Shield
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { Service } from '../types';
import { api } from '../services/api';

export const MonitoringPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async () => {
    try {
      const svcs = await api.getServices();
      setServices(svcs);
      if (svcs.length > 0 && !selectedServiceId) {
        setSelectedServiceId(svcs[0].id);
      }
    } catch (err) {
      console.error('Failed to load services for monitoring', err);
    }
  };

  const fetchMetrics = async (serviceId: string) => {
    if (!serviceId) return;
    try {
      const data = await api.getServiceMetrics(serviceId);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedServiceId) {
      fetchMetrics(selectedServiceId);
      const interval = setInterval(() => fetchMetrics(selectedServiceId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedServiceId]);

  const handleManualTick = async () => {
    setRefreshing(true);
    try {
      await api.triggerTelemetryTick();
      if (selectedServiceId) {
        await fetchMetrics(selectedServiceId);
      }
    } catch (err) {
      console.error('Telemetry tick error', err);
    } finally {
      setRefreshing(false);
    }
  };

  const currentService = services.find((s) => s.id === selectedServiceId);

  const chartData = metrics?.history?.map((snap: any) => ({
    time: new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    error_rate: snap.error_rate,
    threshold_error: currentService?.slo_max_error_rate ?? 1.0,
    p50: snap.p50_latency,
    p95: snap.p95_latency,
    p99: snap.p99_latency,
    threshold_latency: currentService?.slo_max_p95_latency ?? 450,
    cpu: snap.cpu_pct,
    memory: snap.memory_pct,
    requests: snap.request_count,
    availability: snap.availability
  })) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Observability & Telemetry</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              PROMETHEUS INSTRUMENTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time latency distributions, unhandled error rates, resource saturation, and Prometheus exporter endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualTick}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Generate Telemetry Tick</span>
          </button>
          <a
            href="http://localhost:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Prometheus /metrics</span>
          </a>
        </div>
      </div>

      {/* Service Selector & Mode Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Select Microservice Target:</span>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name} ({svc.current_version}) — [{svc.environment}]
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Telemetry Source: {metrics?.is_simulated ? 'High-Fidelity Deterministic Simulator' : 'Prometheus Daemon'}</span>
        </div>
      </div>

      {/* Live Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">Availability</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{metrics.availability?.toFixed(2)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">SLO Target: {currentService?.slo_target_availability}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">HTTP Error Rate</span>
            <span className={`text-xl font-bold font-mono ${metrics.current_error_rate > (currentService?.slo_max_error_rate ?? 1.0) ? 'text-rose-400' : 'text-white'}`}>
              {metrics.current_error_rate?.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Max: {currentService?.slo_max_error_rate}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">P95 Latency</span>
            <span className={`text-xl font-bold font-mono ${metrics.p95_latency > (currentService?.slo_max_p95_latency ?? 450) ? 'text-rose-400' : 'text-cyan-400'}`}>
              {metrics.p95_latency?.toFixed(1)}ms
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Limit: {currentService?.slo_max_p95_latency}ms</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">P99 Latency</span>
            <span className="text-xl font-bold font-mono text-violet-400">{metrics.p99_latency?.toFixed(1)}ms</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Tail outlier bound</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">CPU Saturation</span>
            <span className="text-xl font-bold font-mono text-slate-200">{metrics.cpu_pct?.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Limit: {currentService?.slo_max_cpu_pct}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono block">Memory Saturation</span>
            <span className="text-xl font-bold font-mono text-slate-200">{metrics.memory_pct?.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Limit: {currentService?.slo_max_memory_pct}%</span>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Distribution */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Latency Profile (P50, P95, P99)</h3>
              <p className="text-[11px] text-slate-400">Response time distribution vs max threshold</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="ms" />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="p50" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="P50" />
                <Line type="monotone" dataKey="p95" stroke="#06B6D4" strokeWidth={2} dot={false} name="P95" />
                <Line type="monotone" dataKey="p99" stroke="#EC4899" strokeWidth={1.5} dot={false} name="P99" />
                <Line type="monotone" dataKey="threshold_latency" stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="SLO Max" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HTTP Error Rate vs SLO Threshold */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">HTTP Error Rate (%)</h3>
              <p className="text-[11px] text-slate-400">Unhandled 5xx responses vs SLO threshold boundary</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="error_rate" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#errGrad)" name="Observed Error %" />
                <Line type="monotone" dataKey="threshold_error" stroke="#EAB308" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="SLO Max Error %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU & Memory Utilization */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resource Saturation (%)</h3>
              <p className="text-[11px] text-slate-400">Pod CPU and memory utilization</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="cpu" stroke="#06B6D4" strokeWidth={2} dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#A855F7" strokeWidth={2} dot={false} name="Memory %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Request Throughput */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Request Throughput</h3>
              <p className="text-[11px] text-slate-400">Total ingress requests handled per sample window</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area type="monotone" dataKey="requests" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#reqGrad)" name="Requests" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
