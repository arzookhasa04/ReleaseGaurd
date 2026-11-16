import React, { useState, useEffect } from 'react';
import {
  AlertOctagon, CheckCircle2, ShieldAlert, BrainCircuit,
  Filter, Search, Clock, ArrowRight, UserCheck, ShieldCheck
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { Incident } from '../types';
import { api } from '../services/api';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents(statusFilter, severityFilter);
      setIncidents(data);
      if (selectedIncident) {
        const updated = data.find((i) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      } else if (data.length > 0) {
        setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 6000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      const updated = await api.updateIncident(selectedIncident.id, {
        status,
        notes: `Operator transitioned incident status to ${status}`
      });
      setSelectedIncident(updated);
      await fetchIncidents();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Incident Management & Root Cause</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">
            AUTO-CORRELATED WITH DEPLOYMENTS
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Automated incident detection for SLO breaches, unverified rollbacks, and AI-assisted technical diagnosis.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-rose-400" />
          <span>Status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
        >
          <option value="all">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono ml-2">
          <span>Severity:</span>
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <span className="ml-auto text-xs font-mono text-slate-500">
          {incidents.length} Records Found
        </span>
      </div>

      {/* Master-Detail Incident Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Incident List Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              Loading incident register...
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
              Zero incidents found matching filter.
            </div>
          ) : (
            incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-850 border-rose-500/80 shadow-md shadow-rose-950/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white font-mono">{inc.service_name}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={inc.severity} size="sm" />
                      <StatusBadge status={inc.status} size="sm" />
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                    {inc.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 font-mono truncate mb-2">
                    {inc.triggering_condition}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>{new Date(inc.created_at).toLocaleString()}</span>
                    {inc.deployment_version && (
                      <span className="text-cyan-400">rel: {inc.deployment_version}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Incident Detail & AI RCA (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5 sticky top-20">
              {/* Top Details */}
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                        {selectedIncident.service_name}
                      </span>
                      {selectedIncident.deployment_version && (
                        <span className="text-xs font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                          {selectedIncident.deployment_version}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">
                      {selectedIncident.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedIncident.severity} />
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400 mt-2 flex flex-wrap items-center gap-4">
                  <span>Incident ID: <code>{selectedIncident.id.slice(0, 8)}</code></span>
                  <span>Triggered: {new Date(selectedIncident.created_at).toLocaleString()}</span>
                  {selectedIncident.acknowledged_by && (
                    <span>Ack by: <strong className="text-slate-300">{selectedIncident.acknowledged_by}</strong></span>
                  )}
                  {selectedIncident.resolved_by && (
                    <span>Resolved by: <strong className="text-emerald-400">{selectedIncident.resolved_by}</strong></span>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-slate-800/60">
                  {selectedIncident.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus('INVESTIGATING')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Acknowledge (Investigating)</span>
                    </button>
                  )}
                  {selectedIncident.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Trigger Condition & Metrics Box */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider block font-bold">
                  SLO Trigger Condition
                </span>
                <p className="text-xs font-mono text-slate-200">
                  {selectedIncident.triggering_condition}
                </p>
                {selectedIncident.observed_metrics && (
                  <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-800/80">
                    Telemetry Snapshot: {selectedIncident.observed_metrics}
                  </div>
                )}
              </div>

              {/* AI Root Cause Analysis Section */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-violet-950 text-violet-400 border border-violet-800">
                      <BrainCircuit className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      AI Incident Investigation & Diagnosis
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    Confidence: {((selectedIncident.ai_confidence || 0.94) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 1. Summary */}
                {selectedIncident.ai_summary && (
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                      Executive Summary
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                      {selectedIncident.ai_summary}
                    </p>
                  </div>
                )}

                {/* 2. Root Cause & Supporting Evidence */}
                {selectedIncident.ai_root_cause && (
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                      Likely Root Cause
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                      {selectedIncident.ai_root_cause}
                    </p>
                  </div>
                )}

                {selectedIncident.ai_supporting_evidence && (
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                      Supporting Telemetry Evidence
                    </span>
                    <p className="text-xs text-cyan-300/90 font-mono leading-relaxed bg-cyan-950/20 p-3 rounded-lg border border-cyan-900/40">
                      {selectedIncident.ai_supporting_evidence}
                    </p>
                  </div>
                )}

                {/* 3. Impact Assessment */}
                {selectedIncident.ai_impact_assessment && (
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block font-semibold mb-1">
                      Impact & Blast Radius
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                      {selectedIncident.ai_impact_assessment}
                    </p>
                  </div>
                )}

                {/* 4. Suggested Remediation */}
                {selectedIncident.ai_suggested_remediation && (
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 block font-semibold mb-1">
                      Suggested Remediation Steps
                    </span>
                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/40">
                      {selectedIncident.ai_suggested_remediation}
                    </div>
                  </div>
                )}

                {/* 5. Prevention */}
                {selectedIncident.ai_prevention && (
                  <div>
                    <span className="text-[11px] font-mono text-violet-400 block font-semibold mb-1">
                      Strategic Prevention Recommendations
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-violet-950/20 p-3 rounded-lg border border-violet-900/40">
                      {selectedIncident.ai_prevention}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500 font-mono">
              Select an incident from the left column to inspect telemetry root-cause analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
