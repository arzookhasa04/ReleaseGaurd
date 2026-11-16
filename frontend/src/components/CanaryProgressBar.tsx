import React from 'react';

interface CanaryProgressBarProps {
  percentage: number;
  status: string;
}

export const CanaryProgressBar: React.FC<CanaryProgressBarProps> = ({ percentage, status }) => {
  const isRolledBack = status === 'ROLLED_BACK' || status === 'ROLLBACK';
  const isFailed = status === 'FAILED';
  const isPromoted = status === 'PROMOTED';
  const isPaused = status === 'PAUSED';

  let barColor = 'bg-cyan-500';
  if (isRolledBack) barColor = 'bg-violet-500';
  else if (isFailed) barColor = 'bg-rose-500';
  else if (isPromoted) barColor = 'bg-emerald-500';
  else if (isPaused) barColor = 'bg-amber-500';

  const stages = [5, 10, 25, 50, 100];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
        <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
          <span>Traffic Weight:</span>
          <span className="font-mono text-cyan-400 font-bold">{percentage}%</span>
        </span>
        <span className="text-[11px] text-slate-500">
          Baseline (vStable): {100 - percentage}%
        </span>
      </div>

      <div className="relative h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-500 rounded-full ${barColor} ${
            status === 'CANARY' || status === 'MONITORING' ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500 px-0.5">
        {stages.map((stg) => (
          <span
            key={stg}
            className={`transition-colors ${
              percentage >= stg ? 'text-slate-300 font-bold' : 'text-slate-600'
            }`}
          >
            {stg}%
          </span>
        ))}
      </div>
    </div>
  );
};
