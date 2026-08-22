import React, { useState } from 'react';
import {
  ShieldAlert, CheckCircle2, HeartPulse, Sparkles,
  Share2, MessageSquare, PhoneCall, AlertTriangle,
  Clock, Stethoscope, Check
} from 'lucide-react';
import { ActionPlan, WeatherInfo } from '../types';

interface AITriageCopilotProps {
  plan: ActionPlan;
  weather?: WeatherInfo;
  signals: string[];
}

export const AITriageCopilot: React.FC<AITriageCopilotProps> = ({ plan, weather, signals }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-7 space-y-6">
      
      {/* Header Directive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emergency-100 text-emergency-700 flex items-center justify-center shrink-0">
            <HeartPulse className="w-6 h-6 text-emergency-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Clinical Triage Directive
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emergency-50 text-emergency-700 border border-emergency-200">
                {plan.severity ? plan.severity.toUpperCase() : 'CRITICAL'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Immediate stabilization protocol &amp; trauma guidance
            </p>
          </div>
        </div>

        {/* Estimated Arrival / Response Time */}
        {plan.estimated_response_time && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold shrink-0 self-start sm:self-auto">
            <Clock className="w-4 h-4 text-brand-600" />
            <span>ETA: {plan.estimated_response_time}</span>
          </div>
        )}
      </div>

      {/* Primary Life-Saving Directive (Hero Action Box) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emergency-50 to-red-50/50 border border-emergency-200/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emergency-700">
          <ShieldAlert className="w-4 h-4" />
          <span>Priority 1: Immediate Life-Saving Action</span>
        </div>
        <p className="text-base sm:text-lg font-black text-slate-900 leading-snug">
          {plan.primary_action}
        </p>
        {plan.secondary_action && (
          <p className="text-xs sm:text-sm text-slate-600 font-medium pt-1 border-t border-emergency-100">
            <strong>Next Step: </strong>{plan.secondary_action}
          </p>
        )}
      </div>

      {/* Clinical Rationale & Routing Justification */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Stethoscope className="w-4 h-4 text-brand-600" />
          <span>Clinical Rationale</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {plan.reason}
        </p>
      </div>

      {/* Interactive First-Aid Stabilization Checklist */}
      {plan.first_aid_tips && plan.first_aid_tips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              First-Aid Action Checklist ({completedSteps.length}/{plan.first_aid_tips.length} Completed)
            </h4>
          </div>

          <div className="space-y-2">
            {plan.first_aid_tips.map((tip, idx) => {
              const isChecked = completedSteps.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs sm:text-sm leading-relaxed ${isChecked ? 'line-through opacity-75' : 'font-medium'}`}>
                    {tip}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Facility Highlight */}
      <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
            Recommended Emergency Destination
          </span>
          <h4 className="text-sm sm:text-base font-black text-slate-900">
            {plan.recommended_hospital}
          </h4>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-brand-700 border border-brand-200 self-start sm:self-auto shadow-sm">
          Apex Facility Matched
        </span>
      </div>

    </div>
  );
};
