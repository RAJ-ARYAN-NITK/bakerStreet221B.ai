"use client";

import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Tag, Plus, Shield, X, Bot, Network } from "lucide-react";
import { RelationshipGraph, GraphEdge, GraphNode } from "./RelationshipGraph";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Suspect {
  id: string;
  name: string;
  threat: "high" | "medium" | "low";
  note?: string;
  autoDetected?: boolean;  // true = added by NER from agent response
}

export interface Entity {
  id: string;
  label: string;
  kind: "location" | "object" | "person" | "event" | "other";
  note?: string;
  autoDetected?: boolean;  // true = added by NER from agent response
}

interface EvidencePanelProps {
  suspects: Suspect[];
  entities: Entity[];
  onAddSuspect: (s: Omit<Suspect, "id">) => void;
  onDeleteSuspect: (id: string) => void;
  onAddEntity: (e: Omit<Entity, "id">) => void;
  onDeleteEntity: (id: string) => void;
  relationships: GraphEdge[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THREAT_STYLES: Record<Suspect["threat"], string> = {
  high:   "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low:    "bg-green-500/10 text-green-400 border-green-500/30",
};

const KIND_LABELS: Record<Entity["kind"], string> = {
  location: "📍 Location",
  object:   "🔍 Object",
  person:   "👤 Person",
  event:    "📅 Event",
  other:    "🗂 Other",
};

// ─── Sub-forms ───────────────────────────────────────────────────────────────

function AddSuspectForm({ onAdd, onCancel }: { onAdd: (s: Omit<Suspect, "id">) => void; onCancel: () => void }) {
  const [name,   setName]   = useState("");
  const [threat, setThreat] = useState<Suspect["threat"]>("medium");
  const [note,   setNote]   = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), threat, note: note.trim() || undefined });
    onCancel();
  };

  return (
    <div className="rounded-lg border border-amber-800/50 bg-slate-900/70 p-3 space-y-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Suspect name…"
        className="w-full bg-transparent border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-600 transition-colors"
      />
      <select
        value={threat}
        onChange={(e) => setThreat(e.target.value as Suspect["threat"])}
        className="w-full bg-slate-800 border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-200 outline-none focus:border-amber-600 transition-colors"
      >
        <option value="high">High threat</option>
        <option value="medium">Medium threat</option>
        <option value="low">Low threat</option>
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full bg-transparent border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-600 transition-colors"
      />
      <div className="flex gap-2">
        <button onClick={submit}   className="flex-1 text-xs py-1 rounded bg-amber-700/50 hover:bg-amber-600/60 text-amber-200 transition-colors">Add</button>
        <button onClick={onCancel} className="flex-1 text-xs py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-700 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function AddEntityForm({ onAdd, onCancel }: { onAdd: (e: Omit<Entity, "id">) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [kind,  setKind]  = useState<Entity["kind"]>("other");
  const [note,  setNote]  = useState("");

  const submit = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), kind, note: note.trim() || undefined });
    onCancel();
  };

  return (
    <div className="rounded-lg border border-amber-800/50 bg-slate-900/70 p-3 space-y-2">
      <input
        autoFocus
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Entity label…"
        className="w-full bg-transparent border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-600 transition-colors"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as Entity["kind"])}
        className="w-full bg-slate-800 border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-200 outline-none focus:border-amber-600 transition-colors"
      >
        <option value="location">Location</option>
        <option value="object">Object</option>
        <option value="person">Person</option>
        <option value="event">Event</option>
        <option value="other">Other</option>
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full bg-transparent border border-amber-900/40 rounded-md px-2 py-1.5 text-sm text-amber-100 placeholder-amber-800 outline-none focus:border-amber-600 transition-colors"
      />
      <div className="flex gap-2">
        <button onClick={submit}   className="flex-1 text-xs py-1 rounded bg-amber-700/50 hover:bg-amber-600/60 text-amber-200 transition-colors">Add</button>
        <button onClick={onCancel} className="flex-1 text-xs py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-700 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EvidencePanel({
  suspects,
  entities,
  onAddSuspect,
  onDeleteSuspect,
  onAddEntity,
  onDeleteEntity,
  relationships,
}: EvidencePanelProps) {
  const [addingSuspect, setAddingSuspect] = useState(false);
  const [addingEntity,  setAddingEntity]  = useState(false);
  const [tab, setTab] = useState<"suspects" | "entities" | "graph">("suspects");

  // Derive graph nodes from suspects and entities
  const nodes: GraphNode[] = [
    ...suspects.map((s) => ({ id: s.id, name: s.name, type: "suspect" as const })),
    ...entities.map((e) => ({
      id: e.id,
      name: e.label,
      type: (e.kind === "location" || e.kind === "event") ? e.kind : "other" as const,
    })),
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full rounded-xl border border-amber-900/40 bg-slate-950/60 backdrop-blur-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-amber-900/30">
        <Shield className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-amber-200 text-sm font-semibold tracking-wide uppercase flex-1">
          Evidence
        </span>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-amber-900/30">
        {(["suspects", "entities", "graph"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? "text-amber-300 border-b-2 border-amber-500 -mb-px"
                : "text-amber-800 hover:text-amber-600"
            }`}
          >
            {t === "suspects" && <Users className="w-3.5 h-3.5" />}
            {t === "entities" && <Tag className="w-3.5 h-3.5" />}
            {t === "graph" && <Network className="w-3.5 h-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "suspects" && suspects.length > 0 && (
              <span className="ml-0.5 px-1 py-0 text-[10px] rounded-full bg-amber-900/60 text-amber-400">
                {suspects.length}
              </span>
            )}
            {t === "entities" && entities.length > 0 && (
              <span className="ml-0.5 px-1 py-0 text-[10px] rounded-full bg-amber-900/60 text-amber-400">
                {entities.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3">

        {/* SUSPECTS TAB */}
        {tab === "suspects" && (
          <div className="space-y-2">
            {addingSuspect ? (
              <AddSuspectForm onAdd={onAddSuspect} onCancel={() => setAddingSuspect(false)} />
            ) : (
              <button
                onClick={() => setAddingSuspect(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-amber-900/50 hover:border-amber-700/60 text-amber-800 hover:text-amber-600 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add suspect
              </button>
            )}

            {suspects.length === 0 && !addingSuspect && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center border-2 border-dashed border-slate-800/60 rounded-xl">
                <Users className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500 font-medium">No suspects tracked yet.</p>
              </div>
            )}

            {suspects.map((s) => (
              <div
                key={s.id}
                className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                  s.autoDetected
                    ? "border-rose-900/30 bg-rose-950/20 hover:border-rose-800/50"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700/80"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-slate-200 truncate font-medium">{s.name}</p>
                    {s.autoDetected && (
                      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-medium border border-rose-500/30 bg-rose-500/10 text-rose-400 shrink-0 uppercase tracking-wider">
                        <Bot className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>
                  {s.note && <p className="text-xs text-slate-500 truncate">{s.note}</p>}
                  <span className={`inline-block text-[10px] px-2 py-0.5 font-medium rounded-full border uppercase tracking-wider ${THREAT_STYLES[s.threat]}`}>
                    {s.threat}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteSuspect(s.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-amber-900 hover:text-red-400 transition-all shrink-0"
                  title="Remove suspect"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ENTITIES TAB */}
        {tab === "entities" && (
          <div className="space-y-2">
            {addingEntity ? (
              <AddEntityForm onAdd={onAddEntity} onCancel={() => setAddingEntity(false)} />
            ) : (
              <button
                onClick={() => setAddingEntity(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-amber-900/50 hover:border-amber-700/60 text-amber-800 hover:text-amber-600 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add entity
              </button>
            )}

            {entities.length === 0 && !addingEntity && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center border-2 border-dashed border-slate-800/60 rounded-xl">
                <Tag className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500 font-medium">No entities tracked yet.</p>
              </div>
            )}

            {entities.map((e) => (
              <div
                key={e.id}
                className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                  e.autoDetected
                    ? "border-teal-900/30 bg-teal-950/20 hover:border-teal-800/50"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700/80"
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-slate-200 truncate font-medium">{e.label}</p>
                    {e.autoDetected && (
                      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-medium border border-teal-500/30 bg-teal-500/10 text-teal-400 shrink-0 uppercase tracking-wider">
                        <Bot className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>
                  {e.note && <p className="text-xs text-slate-500 truncate">{e.note}</p>}
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{KIND_LABELS[e.kind]}</span>
                </div>
                <button
                  onClick={() => onDeleteEntity(e.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-amber-900 hover:text-red-400 transition-all shrink-0"
                  title="Remove entity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* GRAPH TAB */}
        {tab === "graph" && (
          <div className="py-2">
            <RelationshipGraph nodes={nodes} edges={relationships} />
          </div>
        )}
      </ScrollArea>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-amber-900/30 text-xs text-amber-900">
        {suspects.length} suspect{suspects.length !== 1 ? "s" : ""} · {entities.length} {entities.length !== 1 ? "entities" : "entity"}
      </div>
    </aside>
  );
}
