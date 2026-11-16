import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  GitFork, Rocket, Play, Pause, RotateCcw, CheckCircle,
  AlertTriangle, Filter, Search, ArrowUpRight, Activity
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { CanaryProgressBar } from '../components/CanaryProgressBar';
import { NewDeploymentModal } from '../components/NewDeploymentModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Deployment, Service, Environment } from '../types';
import { api } from '../services/api';

export const DeploymentsPage: React.FC = () => {
  const { environment, refreshOverview } = useOutletContext<{ environment: Environment; refreshOverview: () => void }>();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [isNewDeployOpen, setIsNewDeployOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Confirmation modal state for manual rollback
  const [rollbackConfirmDep, setRollbackConfirmDep] = useState<Deployment | null>(null);

  const fetchDeployments = async () => {
    try {
      const [depsData, svcsData] = await Promise.all([
        api.getDeployments(serviceFilter !== 'all' ? serviceFilter : undefined, statusFilter),
        api.getServices(environment)
      ]);
      setDeployments(depsData);
      setServices(svcsData);
    } catch (err) {
      console.error('Failed to load deployments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 5000);
    return () => clearInterval(interval);
  }, [environment, statusFilter, serviceFilter]);

  const handleAdvance = async (e: React.MouseEvent, depId: string) => {
    e.stopPropagation();
    setActionLoadingId(depId);
    try {
      await api.advanceDeployment(depId);
      await fetchDeployments();
      refreshOverview();
    } catch (err: any) {
      alert(`Advance failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePromote = async (e: React.MouseEvent, depId: string) => {
    e.stopPropagation();
    setActionLoadingId(depId);
    try {
      await api.promoteDeployment(depId, 100);
      await fetchDeployments();
      refreshOverview();
    } catch (err: any) {
      alert(`Promote failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (e: React.MouseEvent, depId: string) => {
    e.stopPropagation();
    setActionLoadingId(depId);
    try {
      await api.pauseDeployment(depId, 'Operator initiated pause');
      await fetchDeployments();
      refreshOverview();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteRollback = async () => {
    if (!rollbackConfirmDep) return;
    try {
      await api.rollbackDeployment(rollbackConfirmDep.id, 'Operator confirmed manual rollback');
      setRollbackConfirmDep(null);
      await fetchDeployments();
      refreshOverview();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const activeDeployments = deployments.filter((d) =>
    ['PENDING', 'BUILDING', 'TESTING', 'READY', 'CANARY', 'MONITORING', 'PAUSED', 'ROLLBACK'].includes(d.status)
  );

  const pastDeployments = deployments.filter((d) =>
    ['PROMOTED', 'ROLLED_BACK', 'FAILED'].includes(d.status)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Deployment Lifecycle Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real backend state machine progression, canary traffic weighting, and automated recovery actions.
          </p>
        </div>

        <button
          onClick={() => setIsNewDeployOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>New Deployment</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All States</option>
          <option value="CANARY">Canary</option>
          <option value="MONITORING">Monitoring</option>
          <option value="PAUSED">Paused</option>
          <option value="PROMOTED">Promoted</option>
          <option value="ROLLED_BACK">Rolled Back</option>
          <option value="FAILED">Failed</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono ml-2">
          <span>Service:</span>
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Services</option>
          {services.map((svc) => (
            <option key={svc.id} value={svc.id}>{svc.name}</option>
          ))}
        </select>

        <span className="ml-auto text-xs font-mono text-slate-500">
          {activeDeployments.length} Active • {pastDeployments.length} Completed
        </span>
      </div>

      {/* Active Deployments Section */}
      {activeDeployments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Active Release Rollouts ({activeDeployments.length})</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeDeployments.map((dep) => (
              <div
                key={dep.id}
                onClick={() => navigate(`/deployments/${dep.id}`)}
                className="p-5 rounded-xl bg-slate-900 border border-cyan-900/50 hover:border-cyan-700/80 transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white font-mono">{dep.service_name}</h3>
                      <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60">
                        {dep.version}
                      </span>
                      <StatusBadge status={dep.status} />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      Strategy: {dep.strategy} • Baseline to restore: {dep.previous_healthy_version || 'None'}
                      {dep.is_simulated && ' • [Simulated Infrastructure]'}
                    </div>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleAdvance(e, dep.id)}
                      disabled={actionLoadingId === dep.id}
                      title="Run next automated SLO evaluation check & advance traffic stage"
                      className="px-3 py-1.5 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{actionLoadingId === dep.id ? 'Evaluating...' : 'Advance Step'}</span>
                    </button>
                    <button
                      onClick={(e) => handlePromote(e, dep.id)}
                      disabled={actionLoadingId === dep.id}
                      title="Promote directly to 100% production traffic"
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Promote</span>
                    </button>
                    <button
                      onClick={(e) => handlePause(e, dep.id)}
                      disabled={actionLoadingId === dep.id || dep.status === 'PAUSED'}
                      title="Pause canary traffic progression"
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRollbackConfirmDep(dep);
                      }}
                      title="Drain canary traffic and initiate rollback"
                      className="px-3 py-1.5 text-xs font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback</span>
                    </button>
                  </div>
                </div>

                <CanaryProgressBar percentage={dep.traffic_percentage} status={dep.status} />

                {dep.events && dep.events.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-xl">
                      Latest Event: <strong className="text-slate-200">{dep.events[dep.events.length - 1].message}</strong>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(dep.events[dep.events.length - 1].timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past / Completed Deployments Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Deployment History ({pastDeployments.length})
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono">
            Loading deployment records...
          </div>
        ) : pastDeployments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono">
            No completed deployments match current filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {pastDeployments.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/deployments/${d.id}`)}
                className="py-3.5 px-3 rounded-lg hover:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-white">{d.service_name}</span>
                    <span className="text-xs font-mono text-slate-300 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {d.version}
                    </span>
                    <StatusBadge status={d.status} size="sm" />
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Strategy: {d.strategy} • Created: {new Date(d.created_at).toLocaleString()}
                    {d.completed_at && ` • Finished: ${new Date(d.completed_at).toLocaleTimeString()}`}
                  </div>

                  {d.rollback_reason && (
                    <div className="text-[11px] text-violet-300 mt-1">
                      <span className="font-semibold">Rollback Trigger: </span>
                      {d.rollback_reason}
                    </div>
                  )}

                  {d.failure_reason && (
                    <div className="text-[11px] text-rose-300 mt-1">
                      <span className="font-semibold">Failure Details: </span>
                      {d.failure_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:text-right shrink-0">
                  <div>
                    <span className="text-xs font-mono font-bold text-cyan-400">{d.traffic_percentage}%</span>
                    <span className="text-[10px] text-slate-500 block font-mono">final traffic</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewDeploymentModal
        isOpen={isNewDeployOpen}
        services={services}
        onClose={() => setIsNewDeployOpen(false)}
        onCreated={(id) => {
          fetchDeployments();
          refreshOverview();
          navigate(`/deployments/${id}`);
        }}
      />

      <ConfirmationModal
        isOpen={rollbackConfirmDep !== null}
        title={`Trigger Manual Rollback for ${rollbackConfirmDep?.service_name}`}
        message={`Are you sure you want to abort release ${rollbackConfirmDep?.version}? Traffic will be immediately drained to 0% and previous baseline ${rollbackConfirmDep?.previous_healthy_version || 'vStable'} will be restored.`}
        confirmLabel="Initiate Rollback"
        isDestructive={true}
        onConfirm={handleExecuteRollback}
        onCancel={() => setRollbackConfirmDep(null)}
      />
    </div>
  );
};
