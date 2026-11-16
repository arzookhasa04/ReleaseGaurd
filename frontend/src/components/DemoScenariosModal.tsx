import React, { useState } from 'react';
import { Play, RotateCcw, CheckCircle2, AlertOctagon, PauseCircle, X, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../services/api';

interface DemoScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioTriggered: () => void;
}

export const DemoScenariosModal: React.FC<DemoScenariosModalProps> = ({
  isOpen,
  onClose,
  onScenarioTriggered
}) => {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleRun = async (scenario: string) => {
    setLoadingScenario(scenario);
    setFeedback(null);
    try {
      if (scenario === '1') {
        const res = await api.runDemoScenario1();
        setFeedback({
          type: 'success',
          message: `Scenario 1 completed! Release ${res.version} on ${res.service_name} progressed through canary checks and was PROMOTED to 100% traffic.`
        });
      } else if (scenario === '2') {
        const res = await api.runDemoScenario2();
        setFeedback({
          type: 'success',
          message: `Scenario 2 completed! Faulty release ${res.version} breached the 1.0% error rate SLO. Automated recovery safely ROLLED BACK to ${res.previous_healthy_version} and opened an incident with AI root-cause analysis.`
        });
      } else if (scenario === '3') {
        const res = await api.runDemoScenario3();
        setFeedback({
          type: 'success',
          message: `Scenario 3 completed! Release ${res.version} triggered high latency (780ms). Safety gates PAUSED progression pending engineer review.`
        });
      } else if (scenario === 'reset') {
        await api.resetDemoData();
        setFeedback({
          type: 'success',
          message: 'Demo dataset reset to baseline state with sample microservices, deployments, and SLO metrics.'
        });
      }
      onScenarioTriggered();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to execute scenario.'
      });
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-violet-950/80 text-violet-400 border border-violet-800/60">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white">Interactive SRE Demonstration Scenarios</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic portfolio scenarios testing safety gates, automated recovery, and reliability metrics.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs leading-relaxed border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-3 mt-4">
          {/* Scenario 1 */}
          <div className="p-4 rounded-lg bg-slate-850/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Demo 1: Successful Canary Rollout</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">Expected: PROMOTED</span>
              </div>
              <p className="text-xs text-slate-400">
                Deploys policy-api:v3.2.0, passes contract tests, evaluates 10% → 50% → 100% traffic against SLO thresholds, and safely promotes.
              </p>
            </div>
            <button
              onClick={() => handleRun('1')}
              disabled={loadingScenario !== null}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {loadingScenario === '1' ? 'Executing...' : 'Run Demo 1'}
            </button>
          </div>

          {/* Scenario 2 */}
          <div className="p-4 rounded-lg bg-slate-850/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Demo 2: Error Spike & Automated Rollback</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-800/60">Expected: ROLLED_BACK</span>
              </div>
              <p className="text-xs text-slate-400">
                Deploys faulty release claims-api:v2.4.1-err (8.5% error rate). Reliability engine intercepts the violation, halts promotion, safely restores baseline, and triggers AI analysis.
              </p>
            </div>
            <button
              onClick={() => handleRun('2')}
              disabled={loadingScenario !== null}
              className="px-3.5 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {loadingScenario === '2' ? 'Executing...' : 'Run Demo 2'}
            </button>
          </div>

          {/* Scenario 3 */}
          <div className="p-4 rounded-lg bg-slate-850/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Demo 3: Latency Anomaly & Progression Pause</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">Expected: PAUSED</span>
              </div>
              <p className="text-xs text-slate-400">
                Deploys payment-service:v1.8.5-lat with unindexed query (780ms latency). Safety gate detects SLA breach and halts deployment progression for investigation.
              </p>
            </div>
            <button
              onClick={() => handleRun('3')}
              disabled={loadingScenario !== null}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              {loadingScenario === '3' ? 'Executing...' : 'Run Demo 3'}
            </button>
          </div>
        </div>

        {/* Reset Data */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Need a clean slate? Resets sample microservices, deployments, and SLO metrics.
          </div>
          <button
            onClick={() => handleRun('reset')}
            disabled={loadingScenario !== null}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {loadingScenario === 'reset' ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
