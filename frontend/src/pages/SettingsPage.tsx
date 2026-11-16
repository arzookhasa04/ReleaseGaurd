import React, { useState, useEffect } from 'react';
import {
  Settings, Server, Cpu, RotateCcw, ShieldCheck,
  CheckCircle2, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react';

import { ConfirmationModal } from '../components/ConfirmationModal';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to load health info', err);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetDemoData();
      setIsResetOpen(false);
      setMessage('Demo data reset successfully to pristine initial state.');
      fetchHealth();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Configuration & Health</h1>
        <p className="text-xs text-slate-400 mt-1">
          Infrastructure adapters, observability endpoints, AI diagnosis engine settings, and system state controls.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Infrastructure Adapter Status Card */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Server className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Infrastructure & Cluster Adapter
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-1">Operational Mode</span>
            <span className="text-sm font-bold text-cyan-400 block">
              {healthData?.infrastructure?.mode || 'SIMULATOR_DETERMINISTIC'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              {healthData?.infrastructure?.message}
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] text-slate-400 block mb-1">Telemetry Provider</span>
            <span className="text-sm font-bold text-white block">
              {healthData?.infrastructure?.telemetry_source || 'ReleaseGuard Telemetry Synthesizer'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Active Prometheus Exporter: <a href="http://localhost:8000/metrics" target="_blank" rel="noreferrer" className="text-cyan-400 underline">/metrics</a>
            </span>
          </div>
        </div>
      </div>

      {/* AI Engine Status */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            AI Incident Analyst Engine
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          ReleaseGuard AI employs an offline-first resilient design: if no live OpenAI API key is configured, an advanced deterministic rule-based expert engine produces full root-cause diagnoses, supporting evidence trees, and step-by-step remediation procedures.
        </p>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Environment Credential:</span>
            <span className="text-slate-300">OPENAI_API_KEY (Auto-detected if set)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Deterministic Fallback:</span>
            <span className="text-emerald-400 font-bold">100% Functional Offline</span>
          </div>
        </div>
      </div>

      {/* Demo Data Reset Card */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-rose-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Demo Environment Reset
          </h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Resets all microservices, deployments, and SLO metrics to pristine baseline demo data. Recommended before demonstrating scenarios in an interview.
        </p>

        <button
          onClick={() => setIsResetOpen(true)}
          disabled={resetting}
          className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Resetting Data...' : 'Reset Demo Dataset'}</span>
        </button>
      </div>

      <ConfirmationModal
        isOpen={isResetOpen}
        title="Confirm Demo Data Reset"
        message="This will wipe all active deployments, custom services, and recorded incidents, restoring the initial insurance demo services (claims-api, policy-api, payment-service, notification-service)."
        confirmLabel="Reset Everything"
        isDestructive={true}
        onConfirm={handleReset}
        onCancel={() => setIsResetOpen(false)}
      />
    </div>
  );
};
