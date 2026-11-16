import React, { useState } from 'react';
import { Server, X } from 'lucide-react';
import { api } from '../services/api';

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const NewServiceModal: React.FC<NewServiceModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [currentVersion, setCurrentVersion] = useState('v1.0.0');
  const [environment, setEnvironment] = useState('production');
  const [healthEndpoint, setHealthEndpoint] = useState('/healthz');
  const [strategy, setStrategy] = useState('CANARY');
  const [sloTargetAvailability, setSloTargetAvailability] = useState(99.9);
  const [sloMaxErrorRate, setSloMaxErrorRate] = useState(1.0);
  const [sloMaxP95Latency, setSloMaxP95Latency] = useState(450.0);
  const [owner, setOwner] = useState('Platform SRE Team');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.createService({
        name: name.trim(),
        description: description.trim() || undefined,
        repo_url: repoUrl.trim() || undefined,
        current_version: currentVersion.trim(),
        environment,
        health_check_endpoint: healthEndpoint.trim(),
        deployment_strategy: strategy,
        slo_target_availability: Number(sloTargetAvailability),
        slo_max_error_rate: Number(sloMaxErrorRate),
        slo_max_p95_latency: Number(sloMaxP95Latency),
        owner: owner.trim(),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-950/80 text-violet-400 border border-violet-800/60">
              <Server className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">Register Service</h2>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Identifier</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. quote-engine"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Stable Version</label>
              <input
                type="text"
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary role and domain responsibility..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deployment Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="CANARY">Canary</option>
                <option value="BLUE_GREEN">Blue/Green</option>
                <option value="ROLLING">Rolling Update</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Health Endpoint</label>
              <input
                type="text"
                value={healthEndpoint}
                onChange={(e) => setHealthEndpoint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Team Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>

          {/* SLO Configuration */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block">
              Reliability & SLO Targets
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Availability (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sloTargetAvailability}
                  onChange={(e) => setSloTargetAvailability(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Max Error Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sloMaxErrorRate}
                  onChange={(e) => setSloMaxErrorRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Max P95 Latency (ms)</label>
                <input
                  type="number"
                  step="10"
                  value={sloMaxP95Latency}
                  onChange={(e) => setSloMaxP95Latency(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  required
                />
              </div>
            </div>
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
              className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Server className="w-3.5 h-3.5" />
              {submitting ? 'Registering...' : 'Register Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
