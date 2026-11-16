import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Server, Plus, Search, Shield, ArrowUpRight,
  Trash2, Edit3, Rocket, Activity, AlertOctagon, GitFork
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { NewServiceModal } from '../components/NewServiceModal';
import { NewDeploymentModal } from '../components/NewDeploymentModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Service, Environment } from '../types';
import { api } from '../services/api';

export const ServicesPage: React.FC = () => {
  const { environment, refreshOverview } = useOutletContext<{ environment: Environment; refreshOverview: () => void }>();
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [deployServiceId, setDeployServiceId] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const data = await api.getServices(environment, search);
      setServices(data);
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [environment, search]);

  const handleDeleteService = async () => {
    if (!deleteServiceId) return;
    try {
      await api.deleteService(deleteServiceId);
      setDeleteServiceId(null);
      fetchServices();
      refreshOverview();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Service Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered microservices, health check telemetry, deployment strategies, and active SLO boundaries.
          </p>
        </div>

        <button
          onClick={() => setIsNewServiceOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Service</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter services by name, tag, or owner..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Showing {services.length} services
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-xs font-mono">
          <Activity className="w-5 h-5 text-violet-400 animate-spin mr-2" />
          Loading service catalog...
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl p-8">
          <Server className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Services Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No microservices match your current filter. Register a new service or adjust environment filters.
          </p>
          <button
            onClick={() => setIsNewServiceOpen(true)}
            className="mt-4 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
          >
            Register Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white font-mono">{svc.name}</h3>
                      <StatusBadge status={svc.health_status} size="sm" />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Current Stable: <span className="text-cyan-400 font-bold">{svc.current_version}</span>
                      <span className="mx-2 text-slate-600">•</span>
                      <span className="uppercase text-slate-400">{svc.environment}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDeployServiceId(svc.id)}
                      title="Trigger Deployment"
                      className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 border border-cyan-800/60 transition-colors"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteServiceId(svc.id)}
                      title="Delete Service"
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {svc.description || 'Enterprise microservice under automated SLO reliability control.'}
                </p>

                {/* SLO Target Badges */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono mb-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Avail</span>
                    <span className="text-emerald-400 font-bold">{svc.slo_target_availability}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Max Error</span>
                    <span className="text-cyan-400 font-bold">{svc.slo_max_error_rate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">P95 Latency</span>
                    <span className="text-violet-400 font-bold">{svc.slo_max_p95_latency}ms</span>
                  </div>
                </div>
              </div>

              {/* Footer info & CTA */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>Strategy: <strong className="text-slate-300 font-sans">{svc.deployment_strategy}</strong></span>
                  <span>Owner: <strong className="text-slate-300 font-sans">{svc.owner}</strong></span>
                </div>

                <button
                  onClick={() => navigate(`/services/${svc.id}`)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>Details & Telemetry</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <NewServiceModal
        isOpen={isNewServiceOpen}
        onClose={() => setIsNewServiceOpen(false)}
        onCreated={() => {
          fetchServices();
          refreshOverview();
        }}
      />

      <NewDeploymentModal
        isOpen={deployServiceId !== null}
        services={services}
        defaultServiceId={deployServiceId || undefined}
        onClose={() => setDeployServiceId(null)}
        onCreated={(depId) => {
          refreshOverview();
          navigate(`/deployments/${depId}`);
        }}
      />

      <ConfirmationModal
        isOpen={deleteServiceId !== null}
        title="Confirm Service Deletion"
        message="Are you sure you want to delete this service? All related telemetry snapshots, SLO records, and deployment histories will be permanently removed."
        confirmLabel="Delete Service"
        isDestructive={true}
        onConfirm={handleDeleteService}
        onCancel={() => setDeleteServiceId(null)}
      />
    </div>
  );
};
