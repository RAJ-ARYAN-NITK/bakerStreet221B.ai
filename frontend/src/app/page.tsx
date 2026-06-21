'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CaseSidebar } from '@/components/ui/CaseSidebar';
import { ChatInterface, DetectedEntities } from '@/components/ChatInterface';
import { Header } from '@/components/Header';
import { EvidencePanel, Suspect, Entity } from '@/components/ui/EvidencePanel';
import { WelcomeModal } from '@/components/WelcomeModal';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import { FolderOpen, MessageSquare, Shield } from 'lucide-react';
import { exportAsMarkdown, exportAsPDF, CaseExportData } from '@/lib/exportCase';
import { GraphEdge } from '@/components/ui/RelationshipGraph';

// ─── Onboarding localStorage keys ─────────────────────────────────────────────
const KEY_WELCOMED    = "sherlock_welcomed";
const KEY_UPLOADED    = (id: string) => `sherlock_uploaded_${id}`;
const KEY_CHATTED     = (id: string) => `sherlock_chatted_${id}`;

export default function Home() {

  const [activeCase, setActiveCase]         = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suspects, setSuspects]             = useState<Suspect[]>([]);
  const [entities, setEntities]             = useState<Entity[]>([]);
  const [relationships, setRelationships]   = useState<GraphEdge[]>([]);
  const [mobileTab, setMobileTab]           = useState<"cases" | "chat" | "evidence">("chat");

  // ─── Onboarding state ────────────────────────────────────────────────────────
  const [showWelcome, setShowWelcome]   = useState(false);
  const [hasUploaded, setHasUploaded]   = useState(false);
  const [hasChatted, setHasChatted]     = useState(false);

  // ─── On mount: check if first visit ──────────────────────────────────────────
  useEffect(() => {
    const welcomed = localStorage.getItem(KEY_WELCOMED);
    if (!welcomed) setShowWelcome(true);

    const saved = localStorage.getItem("lastActiveCase");
    if (saved) {
      setActiveCase(saved);
      const savedInv = localStorage.getItem(`investigations_${saved}`);
      setInvestigations(savedInv ? JSON.parse(savedInv) : []);
      setHasUploaded(!!localStorage.getItem(KEY_UPLOADED(saved)));
      setHasChatted(!!localStorage.getItem(KEY_CHATTED(saved)));
    }
  }, []);

  // ─── Case management ─────────────────────────────────────────────────────────
  const handleSetActiveCase = (id: string | null) => {
    setActiveCase(id);
    setSuspects([]);
    setEntities([]);
    if (id) {
      localStorage.setItem("lastActiveCase", id);
      const savedInv = localStorage.getItem(`investigations_${id}`);
      setInvestigations(savedInv ? JSON.parse(savedInv) : []);
      setHasUploaded(!!localStorage.getItem(KEY_UPLOADED(id)));
      setHasChatted(!!localStorage.getItem(KEY_CHATTED(id)));
    } else {
      localStorage.removeItem("lastActiveCase");
      setInvestigations([]);
      setHasUploaded(false);
      setHasChatted(false);
    }
  };

  // ─── Evidence management ──────────────────────────────────────────────────────
  const addSuspect    = (s: Omit<Suspect, "id">) =>
    setSuspects((prev) => {
      // Deduplicate by name (case-insensitive)
      if (prev.some(p => p.name.toLowerCase() === s.name.toLowerCase())) return prev;
      return [...prev, { ...s, id: crypto.randomUUID() }];
    });
  const deleteSuspect = (id: string) =>
    setSuspects((prev) => prev.filter((s) => s.id !== id));
  const addEntity     = (e: Omit<Entity, "id">) =>
    setEntities((prev) => {
      // Deduplicate by label (case-insensitive)
      if (prev.some(p => p.label.toLowerCase() === e.label.toLowerCase())) return prev;
      return [...prev, { ...e, id: crypto.randomUUID() }];
    });
  const deleteEntity  = (id: string) =>
    setEntities((prev) => prev.filter((e) => e.id !== id));

  // ─── NER callback: auto-populate Evidence Panel ───────────────────────────────
  const handleEntitiesDetected = useCallback((detected: DetectedEntities) => {
    detected.suspects.forEach((name) => {
      addSuspect({ name, threat: "medium", autoDetected: true });
    });
    detected.entities.forEach(({ label, kind }) => {
      addEntity({ label, kind, autoDetected: true });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute co-occurrence relationships whenever suspects/entities update
  useEffect(() => {
    if (!activeCase) {
      setRelationships([]);
      return;
    }
    try {
      const rawMsgs = localStorage.getItem(`messages_${activeCase}`);
      if (!rawMsgs) return;
      const msgs = JSON.parse(rawMsgs);
      
      // All known entity names (suspects + entities) mapped to their IDs
      const nameToId = new Map<string, string>();
      suspects.forEach(s => nameToId.set(s.name.toLowerCase(), s.id));
      entities.forEach(e => nameToId.set(e.label.toLowerCase(), e.id));

      const edgeMap = new Map<string, GraphEdge>();

      msgs.forEach((msg: any) => {
        if (msg.role !== "agent" || !msg.content) return;
        const text = msg.content.toLowerCase();
        
        // Find which known entities appear in this message
        const presentIds: string[] = [];
        for (const [name, id] of nameToId.entries()) {
          if (text.includes(name)) presentIds.push(id);
        }

        // Add an edge for every pair present in the same message
        for (let i = 0; i < presentIds.length; i++) {
          for (let j = i + 1; j < presentIds.length; j++) {
            const id1 = presentIds[i];
            const id2 = presentIds[j];
            const key = id1 < id2 ? `${id1}::${id2}` : `${id2}::${id1}`;
            const existing = edgeMap.get(key);
            if (existing) {
              existing.weight += 1;
            } else {
              edgeMap.set(key, { source: id1, target: id2, weight: 1 });
            }
          }
        }
      });

      setRelationships(Array.from(edgeMap.values()));
    } catch (e) {
      // ignore parse errors
    }
  }, [activeCase, suspects, entities]);

  // ─── Export handlers ────────────────────────────────────────────────────────
  const handleExport = useCallback((format: "markdown" | "pdf") => {
    if (!activeCase) return;
    try {
      const rawMsgs = localStorage.getItem(`messages_${activeCase}`);
      const msgs = rawMsgs ? JSON.parse(rawMsgs) : [];
      const data: CaseExportData = {
        caseName: "Case " + activeCase.slice(0, 8),
        caseId: activeCase,
        messages: msgs,
        suspects,
        entities,
        investigations
      };
      if (format === "markdown") {
        exportAsMarkdown(data);
      } else {
        exportAsPDF(data);
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  }, [activeCase, suspects, entities, investigations]);

  // ─── Onboarding callbacks ─────────────────────────────────────────────────────
  const handleFirstUpload = useCallback(() => {
    if (!activeCase || hasUploaded) return;
    setHasUploaded(true);
    localStorage.setItem(KEY_UPLOADED(activeCase), "1");
  }, [activeCase, hasUploaded]);

  const handleFirstMessage = useCallback(() => {
    if (!activeCase || hasChatted) return;
    setHasChatted(true);
    localStorage.setItem(KEY_CHATTED(activeCase), "1");
  }, [activeCase, hasChatted]);

  const handleWelcomeDismiss = () => {
    localStorage.setItem(KEY_WELCOMED, "1");
    setShowWelcome(false);
  };

  // ─── Investigation pills ──────────────────────────────────────────────────────
  const handleQuestionClick = useCallback((question: string) => {
    setPendingMessage(question);
    setMobileTab("chat");
  }, []);

  const clearPendingMessage = useCallback(() => setPendingMessage(null), []);

  const InvestigationPills = () => (
    <>
      {investigations.length > 0 && (
        <div className="border border-amber-900/30 bg-slate-900/60 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-2">
            Click to investigate →
          </p>
          <div className="flex flex-wrap gap-2">
            {investigations.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuestionClick(q)}
                title={q}
                className="text-xs text-amber-200 bg-amber-900/30 border border-amber-800/50 hover:bg-amber-700/40 hover:border-amber-500 hover:text-amber-100 px-3 py-1.5 rounded-full transition-all duration-150 text-left max-w-xs truncate"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,...")` }} />
      </div>

      {/* Welcome modal — shown only on first visit */}
      {showWelcome && <WelcomeModal onDismiss={handleWelcomeDismiss} />}

      <div className="relative z-10 flex flex-col h-full overflow-hidden">

        <Header />

        {/* DESKTOP layout */}
        <div className="hidden sm:flex flex-1 overflow-hidden">

          <CaseSidebar
            activeCase={activeCase}
            setActiveCase={handleSetActiveCase}
          />

          <div className="flex flex-col flex-1 min-w-0 min-h-0 px-4 py-4">

            {/* Onboarding step tracker */}
            <OnboardingSteps
              hasCase={!!activeCase}
              hasUploaded={hasUploaded}
              hasChatted={hasChatted}
            />

            <InvestigationPills />

            <div className="flex-1 min-h-0">
              <ChatInterface
                activeCase={activeCase}
                pendingMessage={pendingMessage}
                onClearPendingMessage={clearPendingMessage}
                onInvestigationsGenerated={(invs) => {
                  setInvestigations(invs);
                  if (activeCase) {
                    localStorage.setItem(`investigations_${activeCase}`, JSON.stringify(invs));
                  }
                }}
                onEntitiesDetected={handleEntitiesDetected}
                onFirstUpload={handleFirstUpload}
                onFirstMessage={handleFirstMessage}
                onExport={handleExport}
              />
            </div>
          </div>

          <div className="py-4 pr-4">
            <EvidencePanel
              suspects={suspects}
              entities={entities}
              onAddSuspect={addSuspect}
              onDeleteSuspect={deleteSuspect}
              onAddEntity={addEntity}
              onDeleteEntity={deleteEntity}
              relationships={relationships}
            />
          </div>

        </div>

        {/* MOBILE layout */}
        <div className="flex sm:hidden flex-1 overflow-hidden">

          {mobileTab === "cases" && (
            <div className="flex-1 overflow-y-auto p-3">
              <CaseSidebar
                activeCase={activeCase}
                setActiveCase={(id) => { handleSetActiveCase(id); setMobileTab("chat"); }}
              />
            </div>
          )}

          {mobileTab === "chat" && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-2 py-3">
              <OnboardingSteps
                hasCase={!!activeCase}
                hasUploaded={hasUploaded}
                hasChatted={hasChatted}
              />
              <InvestigationPills />
              <div className="flex-1 min-h-0">
                <ChatInterface
                  activeCase={activeCase}
                  pendingMessage={pendingMessage}
                  onClearPendingMessage={clearPendingMessage}
                  onInvestigationsGenerated={(invs) => {
                    setInvestigations(invs);
                    if (activeCase) {
                      localStorage.setItem(`investigations_${activeCase}`, JSON.stringify(invs));
                    }
                  }}
                  onEntitiesDetected={handleEntitiesDetected}
                  onFirstUpload={handleFirstUpload}
                  onFirstMessage={handleFirstMessage}
                  onExport={handleExport}
                />
              </div>
            </div>
          )}

          {mobileTab === "evidence" && (
            <div className="flex-1 overflow-y-auto">
              <EvidencePanel
                suspects={suspects}
                entities={entities}
                onAddSuspect={addSuspect}
                onDeleteSuspect={deleteSuspect}
                onAddEntity={addEntity}
                onDeleteEntity={deleteEntity}
                relationships={relationships}
              />
            </div>
          )}

        </div>

        {/* Mobile bottom nav */}
        <div className="flex sm:hidden border-t border-amber-900/40 bg-slate-950/90 shrink-0">
          {([
            { id: "cases",    label: "Cases",    Icon: FolderOpen    },
            { id: "chat",     label: "Chat",     Icon: MessageSquare },
            { id: "evidence", label: "Evidence", Icon: Shield        },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                mobileTab === id
                  ? "text-amber-400 border-t-2 border-amber-500 -mt-px"
                  : "text-amber-800 hover:text-amber-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}