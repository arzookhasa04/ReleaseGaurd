import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { DeploymentDetailPage } from './pages/DeploymentDetailPage';
import { SLOPage } from './pages/SLOPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { ChaosLabPage } from './pages/ChaosLabPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route path="deployments" element={<DeploymentsPage />} />
          <Route path="deployments/:id" element={<DeploymentDetailPage />} />
          <Route path="slo" element={<SLOPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="ai-insights" element={<AIInsightsPage />} />
          <Route path="chaos-lab" element={<ChaosLabPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
