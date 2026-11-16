import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { DemoScenariosModal } from '../components/DemoScenariosModal';
import { Environment, DashboardOverview } from '../types';
import { api } from '../services/api';

export const AppLayout: React.FC = () => {
  const [environment, setEnvironment] = useState<Environment>('production');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getDashboardOverview(environment);
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview metrics', err);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 8000);
    return () => clearInterval(interval);
  }, [environment]);

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
