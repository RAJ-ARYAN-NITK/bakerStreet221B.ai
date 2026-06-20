"use client";

import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  Plus,
  Trash2,
  FolderSearch,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Case {
  id: string;
  title: string;
  createdAt: string; // ISO string
}

export interface CaseSidebarProps {
  activeCase: string | null;
  setActiveCase: (id: string | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "sherlock_cases";

function loadCases(): Case[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCases(cases: Case[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {}
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CaseSidebar({ activeCase, setActiveCase }: CaseSidebarProps) {
  const [cases, setCases]         = useState<Case[]>([]);
  const [mounted, setMounted]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  // ── Hydrate from localStorage once on mount ──────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setCases(loadCases());
  }, []);

  // ── Create new case ──────────────────────────────────────────────────────────
  const handleCreate = () => {
    const title = newTitle.trim() || `Case #${cases.length + 1}`;
    const newCase: Case = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCase, ...cases];
    setCases(updated);
    saveCases(updated);
    setActiveCase(newCase.id);
    setNewTitle("");
    setCreating(false);
  };

  // ── Delete a case ────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    const updated = cases.filter((c) => c.id !== id);
    setCases(updated);
    saveCases(updated);
    // Remove associated localStorage data
    try {
      localStorage.removeItem(`messages_${id}`);
      localStorage.removeItem(`thread_${id}`);
    } catch {}
    if (activeCase === id) setActiveCase(null);
    setDeleteId(null);
  };

  // ── Keyboard: submit on Enter, cancel on Escape ──────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  handleCreate();
    if (e.key === "Escape") { setCreating(false); setNewTitle(""); }
  };

  // ── SSR guard ────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <aside className="w-64 shrink-0 flex flex-col border-r border-amber-900/30 bg-slate-950/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-amber-900/30">
          <FolderSearch className="w-4 h-4 text-amber-500" />
          <span className="text-amber-200 text-sm font-semibold tracking-wide uppercase">
            Case Files
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-amber-900/30 bg-slate-950/60 backdrop-blur-sm">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-amber-900/30">
        <div className="flex items-center gap-2">
          <FolderSearch className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-200 text-sm font-semibold tracking-wide uppercase">
            Case Files
          </span>
        </div>
        <button
          onClick={() => { setCreating(true); setTimeout(() => document.getElementById("case-title-input")?.focus(), 50); }}
          title="Open new case"
          className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/30 p-1 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* ── New case input ─────────────────────────────────────────────────── */}
      {creating && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 border border-amber-700/60 rounded-lg bg-slate-900/80 px-2 py-1.5 focus-within:border-amber-500 transition-colors">
            <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <input
              id="case-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Case name…"
              className="flex-1 min-w-0 bg-transparent text-amber-100 text-sm placeholder-amber-800 outline-none"
            />
            <button
              onClick={() => { setCreating(false); setNewTitle(""); }}
              className="text-amber-800 hover:text-amber-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2 mt-1.5 px-0.5">
            <button
              onClick={handleCreate}
              className="flex-1 text-xs py-1 rounded-md bg-amber-700/50 hover:bg-amber-600/60 text-amber-200 transition-colors"
            >
              Open
            </button>
            <button
              onClick={() => { setCreating(false); setNewTitle(""); }}
              className="flex-1 text-xs py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Case list ──────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 px-2 py-2">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
            <FolderOpen className="w-8 h-8 text-amber-900" />
            <p className="text-xs text-amber-800 leading-relaxed">
              No cases open yet.<br />
              Press <span className="text-amber-600 font-semibold">+</span> to start a new investigation.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {cases.map((c) => {
              const isActive   = c.id === activeCase;
              const isDeleting = c.id === deleteId;

              return (
                <li key={c.id}>
                  {isDeleting ? (
                    /* ── Confirm delete ─────────────────────────────────────── */
                    <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 space-y-1.5">
                      <p className="text-xs text-red-300">Delete this case?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="flex-1 text-xs py-0.5 rounded bg-red-800/60 hover:bg-red-700/70 text-red-200 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 text-xs py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-700 transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal case row ────────────────────────────────────── */
                    <button
                      onClick={() => setActiveCase(c.id)}
                      className={`
                        group w-full flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-all duration-150
                        ${isActive
                          ? "bg-amber-900/40 border border-amber-700/60 shadow-sm shadow-amber-950"
                          : "border border-transparent hover:bg-slate-900/60 hover:border-amber-900/30"
                        }
                      `}
                    >
                      <FolderOpen
                        className={`mt-0.5 w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-amber-400" : "text-amber-700 group-hover:text-amber-500"
                        }`}
                      />

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className={`text-sm leading-snug truncate font-medium ${
                          isActive ? "text-amber-100" : "text-amber-300 group-hover:text-amber-200"
                        }`}>
                          {c.title}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-amber-800">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          {formatDate(c.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-amber-500" />
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          title="Delete case"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setDeleteId(c.id); } }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-amber-900 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-amber-900/30 text-xs text-amber-900">
        {cases.length} {cases.length === 1 ? "case" : "cases"} on record
      </div>
    </aside>
  );
}
