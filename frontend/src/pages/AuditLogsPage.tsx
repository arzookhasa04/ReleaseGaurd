import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState('');

  const fetchLogs = async () => {
    try {
      const data = await api.getAuditLogs(search, undefined, targetType || undefined);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, [search, targetType]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Security & Operational Audit Trail</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            APPEND-ONLY IMMUTABLE
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically recorded actions across deployment state machines, automated rollbacks, and configuration changes.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, target ID, or notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Target:</span>
        </div>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Entities</option>
          <option value="DEPLOYMENT">Deployments</option>
          <option value="SERVICE">Services</option>
          <option value="INCIDENT">Incidents</option>
          <option value="CHAOS">Chaos Experiments</option>
        </select>

        <span className="ml-auto text-xs font-mono text-slate-500">
          Showing {logs.length} Audit Events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            Loading immutable audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No audit records matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 text-[11px]">
                      {log.actor}
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {log.target_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {log.outcome === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAILURE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-xs max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
