import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, GitFork, Activity, 
  BarChart3, AlertOctagon, BrainCircuit, Flame,
  FileText, Settings
} from 'lucide-react';

interface SidebarProps {
  activeDeploymentsCount: number;
  activeIncidentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeDeploymentsCount,
  activeIncidentsCount
}) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/services', label: 'Services', icon: Server },
    { 
      to: '/deployments', 
      label: 'Deployments', 
      icon: GitFork,
      badge: activeDeploymentsCount > 0 ? activeDeploymentsCount : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
    },
    { to: '/slo', label: 'Reliability & SLOs', icon: Activity },
    { to: '/monitoring', label: 'Monitoring', icon: BarChart3 },
    { 
      to: '/incidents', 
      label: 'Incidents', 
      icon: AlertOctagon,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
    },
    { to: '/ai-insights', label: 'AI Insights', icon: BrainCircuit },
    { to: '/chaos-lab', label: 'Chaos Lab', icon: Flame },
    { to: '/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="p-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 px-4 pt-4">
        Platform Navigation
      </div>

      <nav className="flex-1 px-2.5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* SRE Reliability Status Footer */}
      <div className="p-3 m-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">SLO Safety Gate:</span>
          <span className="text-emerald-400 font-bold">ACTIVE</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Auto-Recovery:</span>
          <span className="text-cyan-400 font-bold">ENABLED</span>
        </div>
        <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-sans leading-tight">
          Deterministic reliability rules govern all canary traffic promotions.
        </div>
      </div>
    </aside>
  );
};
