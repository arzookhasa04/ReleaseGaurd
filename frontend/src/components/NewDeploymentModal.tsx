import React, { useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { Service } from '../types';
import { api } from '../services/api';

interface NewDeploymentModalProps {
  isOpen: boolean;
  services: Service[];
  defaultServiceId?: string;
  onClose: () => void;
  onCreated: (deploymentId: string) => void;
}

export const NewDeploymentModal: React.FC<NewDeploymentModalProps> = ({
  isOpen,
  services,
  defaultServiceId,
  onClose,
  onCreated
}) => {
  const [serviceId, setServiceId] = useState(defaultServiceId || (services[0]?.id ?? ''));
  const [version, setVersion] = useState('v1.1.0');
  const [strategy, setStrategy] = useState('CANARY');
  const [trafficPct, setTrafficPct] = useState(5);
  const [autoRollback, setAutoRollback] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const dep = await api.createDeployment({
        service_id: serviceId,
        version: version.trim(),
        strategy,
        initial_traffic_percentage: Number(trafficPct),
        auto_rollback_enabled: autoRollback,
      });
      onCreated(dep.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger deployment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <Rocket className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">Trigger New Deployment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} (Current: {svc.current_version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Release Version Tag</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. v2.5.0 or v2.5.0-rc1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deployment Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="CANARY">Canary (SLO-Gated)</option>
                <option value="BLUE_GREEN">Blue/Green</option>
                <option value="ROLLING">Rolling Update</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Initial Canary Traffic</label>
              <select
                value={trafficPct}
                onChange={(e) => setTrafficPct(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={5}>5% Traffic Slice</option>
                <option value={10}>10% Traffic Slice</option>
                <option value={25}>25% Traffic Slice</option>
                <option value={50}>50% Traffic Slice</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="pr-4">
              <span className="text-xs font-medium text-slate-200 block">Automated Rollback Engine</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Automatically drains traffic and restores healthy release if SLO thresholds are violated.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoRollback}
              onChange={(e) => setAutoRollback(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Rocket className="w-3.5 h-3.5" />
              {submitting ? 'Initiating...' : 'Launch Deployment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
