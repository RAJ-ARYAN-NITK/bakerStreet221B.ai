// 'use client';

// import React, { useState, useCallback } from 'react';
// import { CaseSidebar } from '@/components/ui/CaseSidebar';
// import { ChatInterface } from '@/components/ChatInterface';
// import { Header } from '@/components/Header';
// import { EvidencePanel, Suspect, Entity } from '@/components/ui/EvidencePanel';

// export default function Home() {

//   const [activeCase, setActiveCase]         = useState<string | null>(null);
//   const [investigations, setInvestigations] = useState<string[]>([]);
//   const [pendingMessage, setPendingMessage] = useState<string | null>(null);
//   const [suspects, setSuspects]             = useState<Suspect[]>([]);
//   const [entities, setEntities]             = useState<Entity[]>([]);

//   // ── Evidence panel handlers ──────────────────────────────────────
//   const addSuspect    = (s: Omit<Suspect, "id">) =>
//     setSuspects((prev) => [...prev, { ...s, id: crypto.randomUUID() }]);
//   const deleteSuspect = (id: string) =>
//     setSuspects((prev) => prev.filter((s) => s.id !== id));
//   const addEntity     = (e: Omit<Entity, "id">) =>
//     setEntities((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
//   const deleteEntity  = (id: string) =>
//     setEntities((prev) => prev.filter((e) => e.id !== id));

//   // ── Question pill click → auto-send ─────────────────────────────
//   const handleQuestionClick = useCallback((question: string) => {
//     setPendingMessage(question);
//   }, []);

//   const clearPendingMessage = useCallback(() => {
//     setPendingMessage(null);
//   }, []);

//   return (
//     <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">

//       {/* ── Background texture (your original) ── */}
//       <div className="absolute inset-0 opacity-10 pointer-events-none">
//         <div
//           className="absolute inset-0"
//           style={{
//             backgroundImage: `url("data:image/svg+xml,...")`,
//           }}
//         />
//       </div>

//       <div className="relative z-10 flex flex-col h-full overflow-hidden">

//         {/* ── Header (your original) ── */}
//         <Header />

//         {/* ── Main 3-column layout ── */}
//         <div className="flex flex-1 overflow-hidden">

//           {/* LEFT — Case Sidebar */}
//           <CaseSidebar
//             activeCase={activeCase}
//             setActiveCase={(id) => {
//               setActiveCase(id);
//               setInvestigations([]); // clear pills on case switch
//             }}
//           />

//           {/* CENTER — Investigation pills + Chat */}
//           <div className="flex flex-col flex-1 min-w-0 min-h-0 px-4 py-6">

//             {/* Investigation question pills */}
//             {investigations.length > 0 && (
//               <div className="border border-amber-900/30 bg-slate-900/60 rounded-xl px-4 py-3 mb-4">
//                 <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-2">
//                   Click to investigate →
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                   {investigations.map((q, i) => (
//                     <button
//                       key={i}
//                       onClick={() => handleQuestionClick(q)}
//                       title={q}
//                       className="
//                         text-xs text-amber-200 bg-amber-900/30 border border-amber-800/50
//                         hover:bg-amber-700/40 hover:border-amber-500 hover:text-amber-100
//                         px-3 py-1.5 rounded-full transition-all duration-150
//                         text-left max-w-xs truncate
//                       "
//                     >
//                       {q}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Chat */}
//             <div className="flex-1 min-h-0">
//               <ChatInterface
//                 activeCase={activeCase}
//                 pendingMessage={pendingMessage}
//                 onClearPendingMessage={clearPendingMessage}
//                 onInvestigationsGenerated={setInvestigations}
//               />
//             </div>
//           </div>

//           {/* RIGHT — Evidence & Suspects Panel */}
//           <div className="py-6 pr-4">
//             <EvidencePanel
//               suspects={suspects}
//               entities={entities}
//               onAddSuspect={addSuspect}
//               onDeleteSuspect={deleteSuspect}
//               onAddEntity={addEntity}
//               onDeleteEntity={deleteEntity}
//             />
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import React, { useState, useCallback } from 'react';
import { CaseSidebar } from '@/components/ui/CaseSidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { Header } from '@/components/Header';
import { EvidencePanel, Suspect, Entity } from '@/components/ui/EvidencePanel';
import { FolderOpen, MessageSquare, Shield } from 'lucide-react';

export default function Home() {

  const [activeCase, setActiveCase]         = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suspects, setSuspects]             = useState<Suspect[]>([]);
  const [entities, setEntities]             = useState<Entity[]>([]);
  const [mobileTab, setMobileTab] = useState<"cases" | "chat" | "evidence">("chat");

  const addSuspect    = (s: Omit<Suspect, "id">) =>
    setSuspects((prev) => [...prev, { ...s, id: crypto.randomUUID() }]);
  const deleteSuspect = (id: string) =>
    setSuspects((prev) => prev.filter((s) => s.id !== id));
  const addEntity     = (e: Omit<Entity, "id">) =>
    setEntities((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  const deleteEntity  = (id: string) =>
    setEntities((prev) => prev.filter((e) => e.id !== id));

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

      <div className="relative z-10 flex flex-col h-full overflow-hidden">

        <Header />

        {/* DESKTOP — original unchanged layout */}
        <div className="hidden sm:flex flex-1 overflow-hidden">

          <CaseSidebar
            activeCase={activeCase}
            setActiveCase={(id) => { setActiveCase(id); setInvestigations([]); }}
          />

          <div className="flex flex-col flex-1 min-w-0 min-h-0 px-4 py-6">
            <InvestigationPills />
            <div className="flex-1 min-h-0">
              <ChatInterface
                activeCase={activeCase}
                pendingMessage={pendingMessage}
                onClearPendingMessage={clearPendingMessage}
                onInvestigationsGenerated={setInvestigations}
              />
            </div>
          </div>

          <div className="py-6 pr-4">
            <EvidencePanel
              suspects={suspects}
              entities={entities}
              onAddSuspect={addSuspect}
              onDeleteSuspect={deleteSuspect}
              onAddEntity={addEntity}
              onDeleteEntity={deleteEntity}
            />
          </div>

        </div>

        {/* MOBILE — tabbed layout */}
        <div className="flex sm:hidden flex-1 overflow-hidden">

          {mobileTab === "cases" && (
            <div className="flex-1 overflow-y-auto p-3">
              <CaseSidebar
                activeCase={activeCase}
                setActiveCase={(id) => { setActiveCase(id); setInvestigations([]); setMobileTab("chat"); }}
              />
            </div>
          )}

          {mobileTab === "chat" && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-2 py-3">
              <InvestigationPills />
              <div className="flex-1 min-h-0">
                <ChatInterface
                  activeCase={activeCase}
                  pendingMessage={pendingMessage}
                  onClearPendingMessage={clearPendingMessage}
                  onInvestigationsGenerated={setInvestigations}
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