import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { DemoScenariosModal } from '../components/DemoScenariosModal';
import { Environment, DashboardOverview } from '../types';
import { api } from '../services/api';

export const AppLayout: React.FC = () => {
  const [environment, setEnvironment] = useState<Environment>('production');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isBackendWakingUp, setIsBackendWakingUp] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await api.getDashboardOverview(environment);
      setOverview(data);
      setIsBackendWakingUp(false);
    } catch (err) {
      console.warn('Backend connection pending or waking up...', err);
      setIsBackendWakingUp(true);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, isBackendWakingUp ? 4000 : 8000);
    return () => clearInterval(interval);
  }, [environment, isBackendWakingUp]);

  const handleTriggerTick = async () => {
    try {
      await api.triggerTelemetryTick();
      await fetchOverview();
    } catch (err) {
      console.error('Telemetry tick failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Cold-start notification banner for Render free tier */}
      {isBackendWakingUp && (
        <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Connecting to backend... Render Free Tier spins down on idle; initial wake-up takes ~30-45s. Reconnecting automatically.</span>
          </div>
          <span className="font-mono text-[10px] bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60 text-amber-300">
            CONNECTING
          </span>
        </div>
      )}

      <Navbar
        environment={environment}
        onEnvironmentChange={setEnvironment}
        activeIncidentsCount={overview?.active_incidents_count || 0}
        isSimulated={overview?.is_simulated_infrastructure ?? true}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
        onTriggerTick={handleTriggerTick}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeDeploymentsCount={overview?.active_deployments || 0}
          activeIncidentsCount={overview?.active_incidents_count || 0}
        />

        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          <Outlet context={{ environment, refreshOverview: fetchOverview }} />
        </main>
      </div>

      <DemoScenariosModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onScenarioTriggered={fetchOverview}
      />
    </div>
  );
};
