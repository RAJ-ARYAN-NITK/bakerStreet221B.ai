"use client";

import { useState } from "react";
import {
  Users, Tag, Plus, X, ChevronRight,
  ChevronLeft, AlertTriangle, Shield, Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ── Types ─────────────────────────────────────────────────────── */

export interface Suspect {
  id: string;
  name: string;
  risk: "high" | "medium" | "low";
  notes: string;
  alibi?: string;
}

export interface Entity {
  id: string;
  label: string;
  type: "person" | "location" | "date" | "amount" | "other";
}

interface EvidencePanelProps {
  suspects: Suspect[];
  entities: Entity[];
  onAddSuspect: (s: Omit<Suspect, "id">) => void;
  onDeleteSuspect: (id: string) => void;
  onAddEntity: (e: Omit<Entity, "id">) => void;
  onDeleteEntity: (id: string) => void;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const riskIcon = (risk: Suspect["risk"]) => {
  if (risk === "high")   return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
  if (risk === "medium") return <Minus         className="w-3.5 h-3.5 text-amber-400" />;
  return                        <Shield        className="w-3.5 h-3.5 text-green-400" />;
};

const riskBadge = (risk: Suspect["risk"]) => {
  if (risk === "high")   return "bg-red-900/50 text-red-300 border-red-700/50";
  if (risk === "medium") return "bg-amber-900/50 text-amber-300 border-amber-700/50";
  return "bg-green-900/50 text-green-300 border-green-700/50";
};

const entityColor = (type: Entity["type"]) => {
  const map: Record<Entity["type"], string> = {
    person:   "bg-violet-900/40 text-violet-300 border-violet-700/40",
    location: "bg-blue-900/40 text-blue-300 border-blue-700/40",
    date:     "bg-orange-900/40 text-orange-300 border-orange-700/40",
    amount:   "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
    other:    "bg-slate-800 text-slate-300 border-slate-600",
  };
  return map[type];
};

/* ── Component ──────────────────────────────────────────────────── */

export function EvidencePanel({
  suspects,
  entities,
  onAddSuspect,
  onDeleteSuspect,
  onAddEntity,
  onDeleteEntity,
}: EvidencePanelProps) {
  const [open, setOpen]           = useState(true);
  const [tab, setTab]             = useState<"suspects" | "entities">("suspects");

  // suspect form
  const [sName, setSName]   = useState("");
  const [sRisk, setSRisk]   = useState<Suspect["risk"]>("medium");
  const [sNotes, setSNotes] = useState("");
  const [sAlibi, setSAlibi] = useState("");
  const [addingS, setAddingS] = useState(false);

  // entity form
  const [eLabel, setELabel] = useState("");
  const [eType, setEType]   = useState<Entity["type"]>("person");
  const [addingE, setAddingE] = useState(false);

  const submitSuspect = () => {
    if (!sName.trim()) return;
    onAddSuspect({ name: sName.trim(), risk: sRisk, notes: sNotes.trim(), alibi: sAlibi.trim() });
    setSName(""); setSRisk("medium"); setSNotes(""); setSAlibi("");
    setAddingS(false);
  };

  const submitEntity = () => {
    if (!eLabel.trim()) return;
    onAddEntity({ label: eLabel.trim(), type: eType });
    setELabel(""); setEType("person");
    setAddingE(false);
  };

  /* ── Collapsed toggle ────────────────────────────────────────── */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="
          flex flex-col items-center justify-center gap-3
          w-10 border-l border-amber-900/40 bg-slate-950/60
          py-6 text-amber-600 hover:text-amber-400
          hover:bg-amber-900/10 transition-all duration-150
        "
        title="Open Evidence Panel"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-xs font-semibold tracking-widest [writing-mode:vertical-rl]">
          EVIDENCE
        </span>
      </button>
    );
  }

  /* ── Open panel ──────────────────────────────────────────────── */
  return (
    <div className="w-72 border-l border-amber-900/40 bg-slate-950/60 backdrop-blur-sm flex flex-col shrink-0">

      {/* Panel header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-amber-900/30">
        <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
          Evidence Board
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-amber-700 hover:text-amber-400 transition-colors"
          title="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-amber-900/30">
        {(["suspects", "entities"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
              uppercase tracking-wider transition-colors
              ${tab === t
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-amber-800 hover:text-amber-500"
              }
            `}
          >
            {t === "suspects"
              ? <><Users className="w-3.5 h-3.5" /> Suspects</>
              : <><Tag   className="w-3.5 h-3.5" /> Entities</>
            }
          </button>
        ))}
      </div>

      {/* ── SUSPECTS TAB ──────────────────────────────────────────── */}
      {tab === "suspects" && (
        <div className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-2">
              {suspects.length === 0 && (
                <p className="text-xs text-amber-800 text-center py-8">
                  No suspects added yet.
                </p>
              )}

              {suspects.map((s) => (
                <div
                  key={s.id}
                  className="group p-3 rounded-xl bg-slate-900/70 border border-amber-900/30
                             hover:border-amber-700/50 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {riskIcon(s.risk)}
                      <span className="text-sm font-medium text-amber-100 truncate">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`text-xs border ${riskBadge(s.risk)}`}>
                        {s.risk}
                      </Badge>
                      <button
                        onClick={() => onDeleteSuspect(s.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500
                                   hover:text-red-300 transition-all p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {s.alibi && (
                    <p className="text-xs text-amber-700 mt-1.5">
                      Alibi: {s.alibi}
                    </p>
                  )}
                  {s.notes && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {s.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Add suspect form */}
          <div className="border-t border-amber-900/30 p-3">
            {addingS ? (
              <div className="space-y-2">
                <input
                  placeholder="Suspect name *"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 placeholder-amber-900
                             outline-none focus:border-amber-500"
                />
                <select
                  value={sRisk}
                  onChange={(e) => setSRisk(e.target.value as Suspect["risk"])}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 outline-none"
                >
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
                <input
                  placeholder="Alibi (optional)"
                  value={sAlibi}
                  onChange={(e) => setSAlibi(e.target.value)}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 placeholder-amber-900
                             outline-none focus:border-amber-500"
                />
                <textarea
                  placeholder="Notes (optional)"
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 placeholder-amber-900
                             outline-none focus:border-amber-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitSuspect}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-black text-xs
                               font-semibold py-2 rounded-lg transition-colors"
                  >
                    Add Suspect
                  </button>
                  <button
                    onClick={() => setAddingS(false)}
                    className="px-3 text-amber-700 hover:text-amber-400 text-xs
                               border border-amber-900/40 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingS(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2
                           text-xs text-amber-600 hover:text-amber-400
                           border border-dashed border-amber-900/50 hover:border-amber-600
                           rounded-xl transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Suspect
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ENTITIES TAB ──────────────────────────────────────────── */}
      {tab === "entities" && (
        <div className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="flex flex-wrap gap-2">
              {entities.length === 0 && (
                <p className="text-xs text-amber-800 text-center py-8 w-full">
                  No entities extracted yet.
                </p>
              )}

              {entities.map((e) => (
                <div
                  key={e.id}
                  className={`
                    group flex items-center gap-1.5 px-2.5 py-1.5
                    rounded-lg border text-xs font-medium
                    transition-all duration-150
                    ${entityColor(e.type)}
                  `}
                >
                  <span>{e.label}</span>
                  <span className="opacity-50 text-[10px]">{e.type}</span>
                  <button
                    onClick={() => onDeleteEntity(e.id)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5
                               hover:text-white transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Add entity form */}
          <div className="border-t border-amber-900/30 p-3">
            {addingE ? (
              <div className="space-y-2">
                <input
                  placeholder="Entity label *"
                  value={eLabel}
                  onChange={(e) => setELabel(e.target.value)}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 placeholder-amber-900
                             outline-none focus:border-amber-500"
                />
                <select
                  value={eType}
                  onChange={(e) => setEType(e.target.value as Entity["type"])}
                  className="w-full bg-slate-800 border border-amber-900/40 rounded-lg
                             px-3 py-2 text-sm text-amber-100 outline-none"
                >
                  <option value="person">Person</option>
                  <option value="location">Location</option>
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={submitEntity}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-black text-xs
                               font-semibold py-2 rounded-lg transition-colors"
                  >
                    Add Entity
                  </button>
                  <button
                    onClick={() => setAddingE(false)}
                    className="px-3 text-amber-700 hover:text-amber-400 text-xs
                               border border-amber-900/40 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingE(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2
                           text-xs text-amber-600 hover:text-amber-400
                           border border-dashed border-amber-900/50 hover:border-amber-600
                           rounded-xl transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entity
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}