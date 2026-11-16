import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Search, Bell, Sparkles, Terminal, 
  Layers, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Environment } from '../types';

interface NavbarProps {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  activeIncidentsCount: number;
  isSimulated: boolean;
  onOpenDemoModal: () => void;
  onTriggerTick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  environment,
  onEnvironmentChange,
  activeIncidentsCount,
  isSimulated,
  onOpenDemoModal,
  onTriggerTick
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
      {/* Workspace & Env Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">ReleaseGuard AI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-950/80 text-violet-400 border border-violet-800/60">
                v1.0-PROD
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span>workspace:</span>
              <span className="text-slate-300">insurance-core</span>
            </div>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {/* Environment Selector */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['all', 'production', 'staging', 'development'] as Environment[]).map((env) => (
            <button
              key={env}
              onClick={() => onEnvironmentChange(env)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                environment === env
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {env === 'all' ? 'All Envs' : env.charAt(0).toUpperCase() + env.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services, tags, or versions (Enter to search)..."
            className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-cyan-500/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors font-sans"
          />
        </div>
      </form>

      {/* Quick Action Badges & Scenarios */}
      <div className="flex items-center gap-2.5">
        {/* Simulator / K8s Status Indicator */}
        <div
          title={
            isSimulated
              ? 'Operating in High-Fidelity Deterministic Simulator Mode (No live Kubernetes cluster attached)'
              : 'Connected to Live Kubernetes Cluster with active ServiceMesh'
          }
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
            isSimulated
              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSimulated ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          <span>{isSimulated ? 'MODE: SIMULATOR DUAL' : 'MODE: K8S LIVE'}</span>
        </div>

        {/* Telemetry Manual Refresh Tick */}
        <button
          onClick={onTriggerTick}
          title="Tick Telemetry Synthesizer"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Demo Scenarios Modal Launcher */}
        <button
          onClick={onOpenDemoModal}
          className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span className="hidden sm:inline">Demo Scenarios</span>
        </button>

        {/* Incident Alert Bell */}
        <button
          onClick={() => navigate('/incidents')}
          className="relative p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title={`${activeIncidentsCount} active incidents`}
        >
          <Bell className="w-4 h-4" />
          {activeIncidentsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {activeIncidentsCount}
            </span>
          )}
        </button>

        {/* SRE Profile Badge */}
        <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
            SR
          </div>
        </div>
      </div>
    </header>
  );
};
