import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ShieldCheck, AlertTriangle, ArrowUpRight,
  TrendingUp, CheckCircle, HelpCircle, Info
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { SLOSummary } from '../types';
import { api } from '../services/api';

export const SLOPage: React.FC = () => {
  const navigate = useNavigate();
  const [slos, setSlos] = useState<SLOSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSLOs = async () => {
    try {
      const data = await api.getAllSLOs();
      setSlos(data);
    } catch (err) {
      console.error('Failed to load SLOs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLOs();
    const interval = setInterval(fetchSLOs, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Reliability & SLO Engine</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            DETERMINISTIC GATING ACTIVE
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Mathematical error budget evaluation, availability compliance tracking, and deployment safety conditions.
        </p>
      </div>

      {/* Mathematical Principle Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-violet-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider font-mono">
            <Info className="w-4 h-4" />
            <span>Mathematical Error Budget Formula</span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-2xl">
            Allowed Error Budget is strictly defined as <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 font-mono">Error Budget = 100% - Availability Target</code>.
            If target is 99.9%, the allowable fault window is 0.10%. Consumed budget is mathematically computed as <code className="bg-slate-950 px-1.5 py-0.5 rounded text-violet-400 font-mono">(100 - Current) / Allowed * 100%</code>.
          </p>
        </div>
        <div className="text-right shrink-0 font-mono text-xs text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div>Safety Evaluation Gate:</div>
          <div className="text-emerald-400 font-bold mt-0.5">Automated Rollback on Breach</div>
        </div>
      </div>

      {/* Services SLO Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs font-mono">
          <Activity className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
          Calculating error budgets and telemetry compliance...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {slos.map((slo) => {
            const isExhausted = slo.error_budget_status === 'EXHAUSTED';
            const isWarning = slo.error_budget_status === 'WARNING';

            let budgetBarColor = 'bg-cyan-500';
            if (isExhausted) budgetBarColor = 'bg-rose-500';
            else if (isWarning) budgetBarColor = 'bg-amber-500';

            return (
              <div
                key={slo.service_id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white font-mono">{slo.service_name}</h3>
                    <StatusBadge status={slo.overall_status} size="sm" />
                    {!slo.is_telemetry_sufficient && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                        INSUFFICIENT TELEMETRY (UNKNOWN)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono text-xs">
                      <span className="text-slate-400 text-[10px] block">Availability Target</span>
                      <span className="text-white font-bold">{slo.availability_target}%</span>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-slate-400 text-[10px] block">Observed Availability</span>
                      <span className="text-emerald-400 font-bold">
                        {slo.current_availability !== null ? `${slo.current_availability.toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Budget Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Error Budget Remaining: <strong className="text-white">{slo.error_budget_remaining_pct}%</strong>
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Budget Consumed: {slo.error_budget_consumed_pct}% • Total Allowed: {slo.error_budget_total_pct}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${budgetBarColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, slo.error_budget_remaining_pct))}%` }}
                    />
                  </div>
                </div>

                {/* Metric Evaluations List */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                  {slo.evaluations.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xs font-semibold text-slate-300">{ev.name}</span>
                        <StatusBadge status={ev.status} size="sm" />
                      </div>

                      <div className="flex items-baseline gap-1 font-mono text-sm font-bold text-white mb-1">
                        <span>{ev.current_value !== null ? ev.current_value : '—'}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{ev.unit}</span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        Target: {ev.target}{ev.unit}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Footer */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-slate-500">
                    Analyzed {slo.data_points_analyzed} telemetry snapshots over active evaluation window.
                  </span>
                  <button
                    onClick={() => navigate(`/services/${slo.service_id}`)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect Service</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
