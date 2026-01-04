'use client';

import React from 'react';
import { Search, Brain, Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-amber-900/50 bg-linear-to-r from-slate-900/95 via-amber-950/95 to-slate-900/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-10 h-10 text-amber-500" />
              <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h1 className="text-amber-100 tracking-wide flex items-center gap-2">
                Sherlock ReAct Detective Agent
                <Brain className="w-5 h-5 text-amber-500" />
              </h1>
              <p className="text-amber-700 text-sm">Elementary, my dear Watson - Multimodal AI Mystery Solver</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm text-amber-300/70">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Agent Active</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}