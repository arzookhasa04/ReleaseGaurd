import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['PROMOTED', 'HEALTHY', 'PASS', 'SUCCESS', 'RESOLVED'].includes(norm)) {
    styles = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
  } else if (['CANARY', 'MONITORING', 'TESTING', 'BUILDING'].includes(norm)) {
    styles = 'bg-cyan-950/70 text-cyan-400 border-cyan-800/60 animate-pulse';
  } else if (['PAUSED', 'DEGRADED', 'WARNING', 'WARN', 'INVESTIGATING', 'MEDIUM'].includes(norm)) {
    styles = 'bg-amber-950/70 text-amber-400 border-amber-800/60';
  } else if (['FAILED', 'BREACHED', 'EXHAUSTED', 'CRITICAL', 'HIGH', 'FAIL'].includes(norm)) {
    styles = 'bg-rose-950/70 text-rose-400 border-rose-800/60';
  } else if (['ROLLBACK', 'ROLLED_BACK'].includes(norm)) {
    styles = 'bg-violet-950/70 text-violet-400 border-violet-800/60';
  } else if (['UNKNOWN'].includes(norm)) {
    styles = 'bg-slate-800/80 text-slate-400 border-slate-700 border-dashed';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${styles} font-mono tracking-wider`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};
