"use client";

import React, { useEffect, useState } from "react";
import { Brain, FileText, MessageSquare, FolderPlus, X, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: FolderPlus,
    step: "①",
    title: "Create a Case",
    desc: "Click '+ New Case' in the sidebar to open a new investigation. Every case has its own isolated memory and document store.",
    color: "text-amber-400",
    border: "border-amber-700/50",
    bg: "bg-amber-900/20",
  },
  {
    icon: FileText,
    step: "②",
    title: "Upload Evidence",
    desc: "Click the 📎 paperclip to upload PDFs, DOCX, or TXT files. Sherlock will read them, index them, and generate investigation leads automatically.",
    color: "text-orange-400",
    border: "border-orange-700/50",
    bg: "bg-orange-900/20",
  },
  {
    icon: MessageSquare,
    step: "③",
    title: "Ask Sherlock",
    desc: "Type or speak your question. Sherlock will reason step-by-step — searching documents, the web, and running calculations to deduce the answer.",
    color: "text-yellow-400",
    border: "border-yellow-700/50",
    bg: "bg-yellow-900/20",
  },
];

export function WelcomeModal({ onDismiss }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        onClick={handleDismiss}
      />

      {/* Modal card */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border border-amber-800/40 bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 shadow-2xl shadow-amber-900/30 transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-amber-800 hover:text-amber-400 hover:bg-amber-900/30 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center px-8 pt-8 pb-6 border-b border-amber-900/30">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
              <Brain className="w-8 h-8 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-black" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-amber-100 mb-1">
            Welcome to BakerStreet221B
          </h1>
          <p className="text-amber-500 text-sm font-medium italic mb-2">
            "Elementary, my dear Watson."
          </p>
          <p className="text-amber-700 text-sm leading-relaxed max-w-sm">
            Your AI-powered investigation assistant — upload evidence, interrogate
            it, and let Sherlock deduce the truth.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
            How to begin your investigation
          </p>

          {STEPS.map(({ icon: Icon, step, title, desc, color, border, bg }) => (
            <div
              key={step}
              className={`flex items-start gap-3 rounded-xl border ${border} ${bg} px-4 py-3`}
            >
              <div className={`text-lg font-bold shrink-0 ${color} mt-0.5`}>
                {step}
              </div>
              <div>
                <div className={`flex items-center gap-1.5 font-semibold text-sm ${color} mb-0.5`}>
                  <Icon className="w-3.5 h-3.5" />
                  {title}
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tools row */}
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-amber-900/30 bg-slate-900/50 px-4 py-3">
            <p className="text-xs text-amber-700 mb-2 font-medium">Sherlock's toolset:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: "🔍", label: "Web Search", sub: "DuckDuckGo, real-time" },
                { icon: "🧮", label: "Calculator", sub: "Math & conversions" },
                { icon: "📄", label: "Document Search", sub: "Your uploaded files" },
                { icon: "🔊", label: "Text-to-Speech", sub: "Listen to answers" },
                { icon: "🎤", label: "Voice Input", sub: "Speak your question" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs bg-slate-800/60 border border-amber-900/20 rounded-lg px-2 py-1"
                >
                  <span>{icon}</span>
                  <div>
                    <p className="text-amber-300 font-medium leading-none">{label}</p>
                    <p className="text-amber-800 leading-none mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-black font-bold text-sm transition-all duration-200 shadow-lg shadow-amber-900/40 active:scale-[0.98]"
          >
            Begin Investigation
          </button>
          <p className="text-center text-xs text-amber-900 mt-2">
            This guide won't appear again
          </p>
        </div>
      </div>
    </div>
  );
}
