import React, { useState, useEffect } from 'react';
import {
  Flame, Play, Square, AlertTriangle, ShieldCheck,
  Server, Activity, TrendingUp, Zap, HelpCircle
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { ChaosExperiment, Service } from '../types';
import { api } from '../services/api';

export const ChaosLabPage: React.FC = () => {
  const [experiments, setExperiments] = useState<ChaosExperiment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [experimentType, setExperimentType] = useState<'HTTP_500' | 'LATENCY_SPIKE' | 'CPU_SPIKE' | 'MEMORY_PRESSURE' | 'OUTAGE' | 'TRAFFIC_BURST'>('HTTP_500');
  const [severity, setSeverity] = useState(60);
  const [duration, setDuration] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [expData, svcsData] = await Promise.all([
        api.getChaosExperiments(),
        api.getServices()
      ]);
      setExperiments(expData);
      setServices(svcsData);
      if (svcsData.length > 0 && !selectedServiceId) {
        setSelectedServiceId(svcsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load chaos experiments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStartExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) return;
    setSubmitting(true);
    try {
      await api.startChaosExperiment({
        service_id: selectedServiceId,
        experiment_type: experimentType,
        severity: Number(severity),
        duration_seconds: Number(duration),
        notes: `Simulated ${experimentType} at ${severity}% severity`
      });
      await fetchData();
    } catch (err: any) {
      alert(`Chaos initiation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopExperiment = async (id: string) => {
    try {
      await api.stopChaosExperiment(id);
      await fetchData();
    } catch (err: any) {
      alert(`Halt failed: ${err.message}`);
    }
  };

  const activeExp = experiments.find((e) => e.is_active);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Chaos Engineering Lab</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/70 text-rose-400 border border-rose-800/60">
            CONTROLLED FAULT INJECTION
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Validate SLO detection gates and automated rollback engines under controlled synthetic microservice failures.
        </p>
      </div>

      {/* Active Chaos Experiment Banner */}
      {activeExp && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-900/60 text-rose-400 border border-rose-700/60">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                  ACTIVE FAULT EXPERIMENT: {activeExp.experiment_type}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200">
                  {activeExp.severity}% Severity
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target: <strong className="font-mono text-white">{activeExp.service_name}</strong> • Started at {new Date(activeExp.started_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleStopExperiment(activeExp.id)}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Halt Chaos Experiment</span>
          </button>
        </div>
      )}

      {/* Experiment Launcher and Control Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Flame className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Configure Failure Experiment
            </h2>
          </div>

          <form onSubmit={handleStartExperiment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Service</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                required
              >
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} ({svc.current_version}) — [{svc.environment}]
                  </option>
                ))}
              </select>
            </div>

            {/* Failure Scenarios */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Failure Scenario Signature</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'HTTP_500', label: 'HTTP 500 Errors', desc: 'Induces unhandled 5xx exceptions' },
                  { id: 'LATENCY_SPIKE', label: 'Latency Degradation', desc: 'Simulates DB lock contention' },
                  { id: 'CPU_SPIKE', label: 'CPU Saturation', desc: 'Simulates heavy loop/compute load' },
                  { id: 'MEMORY_PRESSURE', label: 'Memory Exhaustion', desc: 'Simulates memory leak curve' },
                  { id: 'OUTAGE', label: 'Total Service Outage', desc: 'Simulates pod crash loop' },
                  { id: 'TRAFFIC_BURST', label: 'Surge Traffic Burst', desc: '5x sudden ingress request spike' },
                ].map((scen) => (
                  <div
                    key={scen.id}
                    onClick={() => setExperimentType(scen.id as any)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      experimentType === scen.id
                        ? 'bg-rose-950/60 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">{scen.label}</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">{scen.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Failure Severity Intensity:</span>
                <span className="font-mono text-rose-400 font-bold">{severity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Mild (10%)</span>
                <span>Moderate (50%)</span>
                <span>Extreme (100%)</span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Auto-Stop Duration (Seconds)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value={60}>60 Seconds (1 minute)</option>
                <option value={120}>120 Seconds (2 minutes)</option>
                <option value={300}>300 Seconds (5 minutes)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Injecting Fault...' : 'Inject Chaos Fault'}</span>
            </button>
          </form>
        </div>

        {/* Experiment Isolation & Safety Information */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Experiment Isolation & Boundaries</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chaos Lab experiments operate safely within local containerized boundaries or deterministic telemetry synthesis.
              Faults automatically expire after their configured duration or can be instantly aborted via the <strong>Halt</strong> button.
            </p>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Automated SLO Intercept:</span>
                <span className="text-emerald-400 font-bold">&lt; 15 seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Canary Traffic Protection:</span>
                <span className="text-cyan-400 font-bold">100% blast containment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Chaos Log */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono">
          Chaos Experiment Audit History ({experiments.length})
        </h3>

        {experiments.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {experiments.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{exp.service_name}</span>
                    <span className="font-mono text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60">
                      {exp.experiment_type} ({exp.severity}%)
                    </span>
                    {exp.is_active ? (
                      <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                        [ACTIVE]
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
                        [STOPPED]
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    Started: {new Date(exp.started_at).toLocaleString()}
                    {exp.stopped_at && ` • Finished: ${new Date(exp.stopped_at).toLocaleTimeString()}`}
                  </div>
                </div>

                {exp.is_active && (
                  <button
                    onClick={() => handleStopExperiment(exp.id)}
                    className="px-2.5 py-1 text-xs bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded transition-colors"
                  >
                    Halt
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No chaos experiments launched yet.
          </div>
        )}
      </div>
    </div>
  );
};
