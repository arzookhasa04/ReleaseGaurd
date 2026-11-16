import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GitFork, Play, Pause, RotateCcw, CheckCircle, ArrowLeft,
  Activity, AlertTriangle, ShieldAlert, Clock, Terminal, ChevronRight
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { CanaryProgressBar } from '../components/CanaryProgressBar';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Deployment } from '../types';
import { api } from '../services/api';

export const DeploymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);

  const fetchDeployment = async () => {
    if (!id) return;
    try {
      const data = await api.getDeployment(id);
      setDeployment(data);
    } catch (err) {
      console.error('Failed to load deployment', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployment();
    const interval = setInterval(fetchDeployment, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAdvance = async () => {
    if (!deployment) return;
    setActionLoading(true);
    try {
      await api.advanceDeployment(deployment.id);
      await fetchDeployment();
    } catch (err: any) {
      alert(`Advance failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!deployment) return;
    setActionLoading(true);
    try {
      await api.promoteDeployment(deployment.id, 100);
      await fetchDeployment();
    } catch (err: any) {
      alert(`Promote failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!deployment) return;
    setActionLoading(true);
    try {
      await api.pauseDeployment(deployment.id, 'Operator paused rollout');
      await fetchDeployment();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!deployment) return;
    try {
      await api.rollbackDeployment(deployment.id, 'Operator manual rollback');
      setIsRollbackModalOpen(false);
      await fetchDeployment();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  if (loading && !deployment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-mono text-xs">
        <Activity className="w-6 h-6 text-cyan-400 animate-spin mr-2" />
        Loading deployment lifecycle state...
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="p-8 text-center text-slate-400">
        Deployment not found.
        <button onClick={() => navigate('/deployments')} className="ml-2 text-cyan-400 underline">
          Back to Deployments
        </button>
      </div>
    );
  }

  const isTerminal = ['PROMOTED', 'ROLLED_BACK', 'FAILED'].includes(deployment.status);

  const pipelineStages = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'BUILDING', label: 'Building' },
    { key: 'TESTING', label: 'Testing' },
    { key: 'READY', label: 'Ready' },
    { key: 'CANARY', label: 'Canary' },
    { key: 'MONITORING', label: 'Monitoring' },
    { key: 'PROMOTED', label: 'Promoted' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div>
        <button
          onClick={() => navigate('/deployments')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Deployments</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{deployment.service_name}</h1>
              <span className="text-sm font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60">
                {deployment.version}
              </span>
              <StatusBadge status={deployment.status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-2">
              <span>ID: <code className="text-slate-300">{deployment.id.slice(0, 8)}</code></span>
              <span>Baseline to Restore: <strong className="text-slate-300">{deployment.previous_healthy_version || 'None'}</strong></span>
              <span>Auto-Recovery: <strong className={deployment.auto_rollback_enabled ? 'text-emerald-400' : 'text-amber-400'}>{deployment.auto_rollback_enabled ? 'Active' : 'Disabled'}</strong></span>
              <span>Infrastructure: <strong className="text-slate-300">{deployment.is_simulated ? 'Simulator Mode' : 'Live Kubernetes'}</strong></span>
            </div>
          </div>

          {!isTerminal && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAdvance}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{actionLoading ? 'Evaluating...' : 'Advance Canary Step'}</span>
              </button>
              <button
                onClick={handlePromote}
                disabled={actionLoading}
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Promote 100%</span>
              </button>
              <button
                onClick={handlePause}
                disabled={actionLoading || deployment.status === 'PAUSED'}
                className="px-3 py-2 text-xs font-semibold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
              <button
                onClick={() => setIsRollbackModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visual Pipeline Progression Bar */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            State Machine Progression
          </span>
          <span className="text-xs font-mono text-cyan-400">
            Traffic Weight: {deployment.traffic_percentage}%
          </span>
        </div>

        {/* Stages steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {pipelineStages.map((stg, i) => {
            const hasPassed = deployment.events.some((ev) => ev.stage === stg.key);
            const isCurrent = deployment.status === stg.key;
            return (
              <div
                key={stg.key}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-950/40'
                    : hasPassed
                    ? 'bg-slate-950/60 border-emerald-800/60 text-emerald-400'
                    : 'bg-slate-950/30 border-slate-850 text-slate-600'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-500 mb-0.5">0{i + 1}</div>
                <div className="text-xs font-mono">{stg.label}</div>
              </div>
            );
          })}
        </div>

        <CanaryProgressBar percentage={deployment.traffic_percentage} status={deployment.status} />

        {deployment.rollback_reason && (
          <div className="p-3 bg-violet-950/40 border border-violet-800/60 rounded-lg text-xs text-violet-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Automated Recovery Triggered</span>
              <span>{deployment.rollback_reason}</span>
            </div>
          </div>
        )}

        {deployment.failure_reason && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Deployment Failure Details</span>
              <span>{deployment.failure_reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Deployment Lifecycle Audit Events Timeline */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Immutable Lifecycle Event Log ({deployment.events.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Chronological State Audit</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {deployment.events.map((ev, index) => {
            let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
            if (ev.level === 'SUCCESS') badgeBg = 'bg-emerald-950 text-emerald-400 border-emerald-800';
            else if (ev.level === 'WARNING') badgeBg = 'bg-amber-950 text-amber-400 border-amber-800';
            else if (ev.level === 'ERROR') badgeBg = 'bg-rose-950 text-rose-400 border-rose-800';
            else if (ev.level === 'INFO') badgeBg = 'bg-cyan-950 text-cyan-400 border-cyan-800';

            return (
              <div
                key={ev.id || index}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="text-[11px] text-slate-500 shrink-0 pt-0.5">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </div>

                <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase shrink-0 ${badgeBg}`}>
                  {ev.stage}
                </span>

                <div className="flex-1 text-slate-300 font-sans text-xs leading-relaxed">
                  {ev.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isRollbackModalOpen}
        title="Trigger Immediate Rollback"
        message={`Are you sure you want to roll back ${deployment.service_name} release ${deployment.version}? Traffic will be drained to 0% and version ${deployment.previous_healthy_version || 'vStable'} verified.`}
        confirmLabel="Execute Rollback"
        isDestructive={true}
        onConfirm={handleRollback}
        onCancel={() => setIsRollbackModalOpen(false)}
      />
    </div>
  );
};
