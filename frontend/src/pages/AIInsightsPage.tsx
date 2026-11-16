import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Sparkles, ShieldCheck, Zap, AlertTriangle,
  Send, RefreshCw, Server, CheckCircle2, Terminal
} from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { PortfolioInsights, Service } from '../types';
import { api } from '../services/api';

export const AIInsightsPage: React.FC = () => {
  const [insightsData, setInsightsData] = useState<PortfolioInsights | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Workbench state
  const [testServiceId, setTestServiceId] = useState<string>('');
  const [testVersion, setTestVersion] = useState('v2.6.0-rc1');
  const [testCondition, setTestCondition] = useState('SLO Violation: HTTP 500 error rate spiked to 9.2% during canary cutover');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [insights, svcs] = await Promise.all([
        api.getPortfolioInsights(),
        api.getServices()
      ]);
      setInsightsData(insights);
      setServices(svcs);
      if (svcs.length > 0 && !testServiceId) {
        setTestServiceId(svcs[0].id);
      }
    } catch (err) {
      console.error('Failed to load AI insights', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunWorkbenchAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testServiceId) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await api.requestAIAnalysis({
        service_id: testServiceId,
        version: testVersion,
        triggering_condition: testCondition,
        observed_metrics: {
          error_rate: 9.2,
          p95_latency: 580.0,
          availability: 90.8,
          cpu_pct: 74.0,
          traffic_percentage: 10
        }
      });
      setAnalysisResult(result);
    } catch (err: any) {
      alert(`Analysis error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">AI Incident Analyst & Reliability Intelligence</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/70 text-violet-400 border border-violet-800/60">
            {insightsData?.engine_mode || 'EXPERT_DETERMINISTIC_LOCAL'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Automated root-cause analysis, blast radius estimation, and actionable remediation synthesizers.
        </p>
      </div>

      {/* Safety Policy Alert */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Safety Boundary Architecture: Deterministic Rules Control
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            ReleaseGuard AI adheres to strict SRE platform principles: AI is utilized strictly for post-incident telemetry analysis, log synthesis, and remediation guidance.
            <strong> AI models are strictly prohibited from independently initiating production rollbacks or altering live routing.</strong> Deterministic SLO safety gates retain exclusive authority over deployment transitions.
          </p>
        </div>
      </div>

      {/* Strategic Portfolio Insights */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Platform SRE Findings & Recommendations
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightsData?.insights.map((ins) => (
            <div
              key={ins.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    {ins.category}
                  </span>
                  <StatusBadge status={ins.impact} size="sm" />
                </div>

                <h3 className="text-xs font-bold text-white mb-2 leading-snug">
                  {ins.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {ins.finding}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-1">
                  Actionable SRE Recommendation:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {ins.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive AI Analysis Workbench */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              On-Demand Incident Analysis Workbench
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Model: {insightsData?.llm_model}
          </span>
        </div>

        <form onSubmit={handleRunWorkbenchAnalysis} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Service</label>
              <select
                value={testServiceId}
                onChange={(e) => setTestServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              >
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} ({svc.current_version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Release Candidate Version</label>
              <input
                type="text"
                value={testVersion}
                onChange={(e) => setTestVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Triggering Anomaly / SLO Breach Condition</label>
            <input
              type="text"
              value={testCondition}
              onChange={(e) => setTestCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={analyzing}
            className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{analyzing ? 'Synthesizing Diagnosis...' : 'Generate AI Root-Cause Analysis'}</span>
          </button>
        </form>

        {/* Workbench Result Box */}
        {analysisResult && (
          <div className="mt-4 p-5 rounded-lg bg-slate-950 border border-violet-900/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
              <span className="text-violet-400 font-bold uppercase tracking-wider">
                Synthesized Incident Investigation Report
              </span>
              <span className="text-cyan-400">
                Source: {analysisResult.source || 'Expert Heuristic Engine'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-1">
                  1. Executive Summary
                </span>
                <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {analysisResult.ai_summary}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-1">
                  2. Likely Technical Root Cause
                </span>
                <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {analysisResult.ai_root_cause}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold block mb-1">
                  3. Supporting Telemetry Evidence
                </span>
                <p className="text-cyan-300 font-mono text-[11px] leading-relaxed bg-cyan-950/20 p-2.5 rounded border border-cyan-900/40">
                  {analysisResult.ai_supporting_evidence}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono text-emerald-400 uppercase font-bold block mb-1">
                  4. Actionable Remediation Plan
                </span>
                <div className="text-slate-200 whitespace-pre-line leading-relaxed bg-emerald-950/20 p-2.5 rounded border border-emerald-900/40">
                  {analysisResult.ai_suggested_remediation}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-violet-400 uppercase font-bold block mb-1">
                  5. Architectural Prevention
                </span>
                <p className="text-slate-300 leading-relaxed bg-violet-950/20 p-2.5 rounded border border-violet-900/40">
                  {analysisResult.ai_prevention}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
