import React from 'react';
import { LucideIcon, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'healthy' | 'warning' | 'danger' | 'info';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtext,
  icon: Icon,
  status = 'info',
  tooltip
}) => {
  let statusBorder = 'border-slate-800/80 hover:border-slate-700';
  let iconBg = 'bg-slate-800/70 text-slate-300';
  let valueColor = 'text-white';

  if (status === 'healthy') {
    statusBorder = 'border-emerald-900/40 hover:border-emerald-700/60';
    iconBg = 'bg-emerald-950/60 text-emerald-400';
    valueColor = 'text-emerald-400';
  } else if (status === 'warning') {
    statusBorder = 'border-amber-900/40 hover:border-amber-700/60';
    iconBg = 'bg-amber-950/60 text-amber-400';
    valueColor = 'text-amber-400';
  } else if (status === 'danger') {
    statusBorder = 'border-rose-900/40 hover:border-rose-700/60';
    iconBg = 'bg-rose-950/60 text-rose-400';
    valueColor = 'text-rose-400';
  } else if (status === 'info') {
    iconBg = 'bg-cyan-950/60 text-cyan-400';
  }

  return (
    <div className={`p-4 rounded-xl bg-slate-900/90 backdrop-blur-sm border ${statusBorder} transition-all duration-200 group`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          {title}
          {tooltip && (
            <span title={tooltip} className="cursor-help text-slate-500 hover:text-slate-300">
              <Info className="w-3.5 h-3.5" />
            </span>
          )}
        </span>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 font-sans truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
