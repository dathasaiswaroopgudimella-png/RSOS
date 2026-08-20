import React, { useState } from 'react';
import {
  Sparkles, CheckSquare, Square, AlertCircle, Clock,
  FileText, Copy, Check, Stethoscope, ShieldAlert, Zap
} from 'lucide-react';
import { ActionPlan, WeatherInfo } from '../types';

interface AITriageCopilotProps {
  plan: ActionPlan;
  weather?: WeatherInfo;
  signals: string[];
}

export const AITriageCopilot: React.FC<AITriageCopilotProps> = ({
  plan,
  weather,
  signals,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleCopyReport = () => {
    const reportText = `🚨 [ROADSOS EMERGENCY DISPATCH REPORT]\nPRIMARY ACTION: ${plan.primary_action}\nSECONDARY: ${plan.secondary_action}\nRECOMMENDED FACILITY: ${plan.recommended_hospital}\nESTIMATED TIME: ${plan.estimated_response_time}\nSEVERITY: ${plan.severity.toUpperCase()}\nSYMPTOMS: ${signals.join(', ') || 'Crash'}\nFIRST AID MEASURES:\n${plan.first_aid_tips.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full bg-obsidian-surface rounded-2xl border border-obsidian-border p-6 shadow-2xl space-y-6">
      
      {/* Top Banner: AI Clinical Engine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/40 flex items-center justify-center text-primary-light shadow-inner">
            <Sparkles className="w-5 h-5 text-primary-light" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Neural-Deterministic Triage Co-Pilot
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {plan.tier_used || 'OpenRouter DeepSeek V3'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time clinical reasoning &amp; patient stabilization instructions
            </p>
          </div>
        </div>

        {/* Severity Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/40">
            {plan.severity.toUpperCase()} PRIORITY
          </span>
        </div>
      </div>

      {/* Primary Directive Card (High Contrast) */}
      <div className="rounded-xl p-5 bg-gradient-to-r from-primary/20 via-slate-900 to-slate-900 border-l-4 border-primary border-y border-r border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-primary-light text-xs font-extrabold uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>Immediate Life-Saving Directive</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-white leading-snug">
          {plan.primary_action}
        </p>
        <p className="text-xs text-slate-300">
          <strong className="text-slate-200">Secondary step:</strong> {plan.secondary_action}
        </p>
      </div>

      {/* Clinical Reasoning Callout */}
      <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-1 text-xs leading-relaxed text-slate-300">
        <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          Clinical Matching Rationale:
        </span>
        <p>{plan.reason}</p>
      </div>

      {/* Interactive First Aid Checklist */}
      {plan.first_aid_tips && plan.first_aid_tips.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Stabilization Checklist (While Awaiting Help)</span>
            <span className="text-[11px] font-mono text-slate-400">
              {completedSteps.length} of {plan.first_aid_tips.length} Completed
            </span>
          </h4>

          <div className="space-y-2">
            {plan.first_aid_tips.map((tip, idx) => {
              const isChecked = completedSteps.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isChecked
                      ? 'bg-slate-950/80 border-slate-800 opacity-60 line-through text-slate-400'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="mt-0.5 text-primary-light shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{tip}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Copy Digital Dispatch Report Button */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Estimated Ambulance Transit: <strong className="text-white">{plan.estimated_response_time}</strong>
        </span>
        <button
          onClick={handleCopyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Report Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Copy Dispatch Report</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
