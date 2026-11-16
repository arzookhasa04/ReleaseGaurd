import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  Server, GitFork, CheckCircle, ShieldAlert, AlertTriangle,
  Clock, Activity, Sparkles, Rocket, Plus, ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar
} from 'recharts';

import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { CanaryProgressBar } from '../components/CanaryProgressBar';
import { NewDeploymentModal } from '../components/NewDeploymentModal';
import { NewServiceModal } from '../components/NewServiceModal';
import { Environment, DashboardOverview, Service } from '../types';
import { api } from '../services/api';

export const OverviewPage: React.FC = () => {
  const { environment, refreshOverview } = useOutletContext<{ environment: Environment; refreshOverview: () => void }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [overviewData, servicesData] = await Promise.all([
        api.getDashboardOverview(environment),
        api.getServices(environment)
      ]);
      setData(overviewData);
      setServices(servicesData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [environment]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono">Loading SLO metrics & deployment state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Mission Control</h1>
            {data?.is_simulated_infrastructure && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                [SIMULATED TELEMETRY DUAL-MODE]
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deployment safety, automated recovery status, and SLO error budget tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsServiceModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Service</span>
          </button>
          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>New Deployment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Total Services"
          value={data?.total_services || 0}
          icon={Server}
          subtext="Under SLO monitoring"
          status="info"
        />
        <MetricCard
          title="Active Releases"
          value={data?.active_deployments || 0}
          icon={GitFork}
          subtext="In canary rollout"
          status={data?.active_deployments ? 'warning' : 'healthy'}
        />
        <MetricCard
          title="Success Rate"
          value={data?.deployment_success_rate ?? 100}
          unit="%"
          icon={CheckCircle}
          subtext="Historical releases"
          status={data && data.deployment_success_rate >= 95 ? 'healthy' : 'warning'}
        />
        <MetricCard
          title="Auto Rollbacks"
          value={data?.total_rollbacks || 0}
          icon={ShieldAlert}
          subtext="Safety gate interventions"
          status="danger"
        />
        <MetricCard
          title="Avg Error Rate"
          value={data?.current_avg_error_rate ?? 0.04}
          unit="%"
          icon={AlertTriangle}
          subtext="SLO threshold: ≤ 1.0%"
          status={data && data.current_avg_error_rate > 1.0 ? 'danger' : 'healthy'}
        />
        <MetricCard
          title="Avg P95 Latency"
          value={data?.current_avg_p95_latency ?? 35}
          unit="ms"
          icon={Clock}
          subtext="SLO target: ≤ 450ms"
          status={data && data.current_avg_p95_latency > 450 ? 'danger' : 'healthy'}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Trends Chart */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">P95 & P50 Latency Trends</h3>
              <p className="text-[11px] text-slate-400">Response time telemetry across microservices (last 12h)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> P95
              </span>
              <span className="flex items-center gap-1 text-violet-400">
                <span className="w-2 h-2 rounded-full bg-violet-400" /> P50
              </span>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.latency_trends || []}>
                <defs>
                  <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="p95" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#p95Grad)" />
                <Area type="monotone" dataKey="p50" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#p50Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deployment Frequency & Rollbacks */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Release Velocity & Recovery</h3>
              <p className="text-[11px] text-slate-400">Deployments promoted vs automated rollbacks</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Promoted
              </span>
              <span className="flex items-center gap-1 text-violet-400">
                <span className="w-2 h-2 rounded-full bg-violet-400" /> Rollbacks
              </span>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.deployment_frequency || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="deployments" fill="#10B981" radius={[4, 4, 0, 0]} name="Promoted Deployments" />
                <Bar dataKey="rollbacks" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Automated Rollbacks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Deployments / Incidents & Service Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Deployments Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Deployments & History</h3>
            </div>
            <Link
              to="/deployments"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.recent_deployments && data.recent_deployments.length > 0 ? (
            <div className="space-y-3">
              {data.recent_deployments.map((dep) => (
                <div
                  key={dep.id}
                  onClick={() => navigate(`/deployments/${dep.id}`)}
                  className="p-3.5 rounded-lg bg-slate-850/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-white font-mono">{dep.service_name}</span>
                      <span className="text-xs font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {dep.version}
                      </span>
                    </div>
                    <StatusBadge status={dep.status} size="sm" />
                  </div>

                  <CanaryProgressBar percentage={dep.traffic_percentage} status={dep.status} />

                  {dep.rollback_reason && (
                    <div className="mt-2 text-[11px] text-violet-300 bg-violet-950/40 border border-violet-900/50 p-2 rounded">
                      <span className="font-semibold">Recovery Trigger: </span>
                      {dep.rollback_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs font-mono">
              No recent deployment activity.
            </div>
          )}
        </div>

        {/* Active Incidents & SLO Status */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Incidents</h3>
              </div>
              <Link
                to="/incidents"
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.active_incidents && data.active_incidents.length > 0 ? (
              <div className="space-y-3">
                {data.active_incidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => navigate(`/incidents`)}
                    className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 hover:border-rose-700/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-rose-200">{inc.service_name}</span>
                      <StatusBadge status={inc.severity} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                      {inc.title}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-slate-500">
                      Condition: {inc.triggering_condition}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-center text-xs text-emerald-400 flex flex-col items-center gap-1.5 my-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Zero active incidents. All SLO safety thresholds passing.</span>
              </div>
            )}
          </div>

          {/* Quick Demo Trigger Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 mb-2">
              Ready to test automatic rollback or latency pauses?
            </div>
            <button
              onClick={() => {
                const modalLauncher = document.querySelector('[title="Demo Scenarios"]') as HTMLElement;
                if (modalLauncher) modalLauncher.click();
              }}
              className="w-full py-2 bg-gradient-to-r from-violet-600/90 to-cyan-600/90 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Launch Demo Scenarios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services Health Snapshot Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Services Telemetry & Compliance</h3>
          </div>
          <Link
            to="/services"
            className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Service Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Service Name</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Environment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3">Error Rate</th>
                <th className="py-2.5 px-3">P95 Latency</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.services_health?.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-850/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white font-mono">{svc.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{svc.version}</td>
                  <td className="py-3 px-3 uppercase text-[10px] font-mono text-slate-400">{svc.environment}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={svc.health} size="sm" />
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{svc.availability?.toFixed(2)}%</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{svc.error_rate?.toFixed(2)}%</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{svc.p95_latency?.toFixed(1)}ms</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate(`/services/${svc.id}`)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewDeploymentModal
        isOpen={isDeployModalOpen}
        services={services}
        onClose={() => setIsDeployModalOpen(false)}
        onCreated={(id) => {
          refreshOverview();
          fetchData();
          navigate(`/deployments/${id}`);
        }}
      />

      <NewServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onCreated={() => {
          refreshOverview();
          fetchData();
        }}
      />
    </div>
  );
};
