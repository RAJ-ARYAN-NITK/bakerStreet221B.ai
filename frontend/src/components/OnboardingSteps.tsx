"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, FolderPlus, FileText, MessageSquare, ChevronRight } from "lucide-react";

interface OnboardingStepsProps {
  hasCase: boolean;
  hasUploaded: boolean;
  hasChatted: boolean;
}

interface StepDef {
  icon: React.ElementType;
  label: string;
  hint: string;
  done: boolean;
}

export function OnboardingSteps({ hasCase, hasUploaded, hasChatted }: OnboardingStepsProps) {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const allDone = hasCase && hasUploaded && hasChatted;

  // Auto-hide 1.5s after all steps complete
  useEffect(() => {
    if (allDone && !dismissed) {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setDismissed(true), 500);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [allDone, dismissed]);

  if (dismissed) return null;

  const steps: StepDef[] = [
    {
      icon: FolderPlus,
      label: "Create Case",
      hint: "Click '+' in the sidebar",
      done: hasCase,
    },
    {
      icon: FileText,
      label: "Upload Evidence",
      hint: "Use the 📎 paperclip",
      done: hasUploaded,
    },
    {
      icon: MessageSquare,
      label: "Ask Sherlock",
      hint: "Type or speak a question",
      done: hasChatted,
    },
  ];

  return (
    <div
      className={`transition-all duration-500 overflow-hidden ${
        visible ? "max-h-24 opacity-100 mb-3" : "max-h-0 opacity-0 mb-0"
      }`}
    >
      <div className="border border-amber-900/30 bg-slate-900/70 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
        {/* Label */}
        <span className="text-xs text-amber-700 font-semibold uppercase tracking-widest shrink-0 mr-1 hidden sm:block">
          Getting started
        </span>

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isNext = !step.done && steps.slice(0, idx).every((s) => s.done);

          return (
            <React.Fragment key={step.label}>
              {/* Step pill */}
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                  step.done
                    ? "bg-green-900/30 border border-green-700/40 text-green-400"
                    : isNext
                    ? "bg-amber-900/40 border border-amber-600/50 text-amber-300 animate-pulse"
                    : "bg-slate-900/40 border border-amber-900/20 text-amber-800"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isNext ? "text-amber-400" : "text-amber-900"}`} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
                {!step.done && isNext && (
                  <span className="text-[10px] text-amber-600 hidden md:inline">
                    — {step.hint}
                  </span>
                )}
              </div>

              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                    steps[idx].done ? "text-amber-600" : "text-amber-900"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* All done message */}
        {allDone && (
          <span className="ml-auto text-xs text-green-500 font-medium hidden sm:inline animate-pulse">
            ✓ Investigation active — the game is afoot!
          </span>
        )}
      </div>
    </div>
  );
}
