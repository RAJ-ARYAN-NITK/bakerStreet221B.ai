
// 'use client';

// import React, { useState } from 'react';
// import { CaseSidebar } from '@/components/ui/CaseSidebar';   // ✅ REAL sidebar
// // /Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/frontend/src/components/ui/CaseSidebar.tsx
// import { ChatInterface } from '@/components/ChatInterface';
// import { Header } from '@/components/Header';

// export default function Home() {
//   // ✅ controls which investigation is open
//   const [activeCase, setActiveCase] = useState<string | null>(null);

//   return (
//     <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">
      
//       {/* Background texture */}
//       <div className="absolute inset-0 opacity-10 pointer-events-none">
//         <div
//           className="absolute inset-0"
//           style={{
//             backgroundImage: `url("data:image/svg+xml,...")`,
//           }}
//         />
//       </div>

//       <div className="relative z-10 flex flex-col h-full overflow-hidden">
//         <Header />

//         {/* Main content */}
//         <div className="flex-1 overflow-hidden px-4 py-6">
          
//           {/* ✅ 2-column layout (sidebar + chat) */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
            
//             {/* LEFT — REAL CASE SIDEBAR */}
//             <div className="lg:col-span-1 min-h-0">
//               <CaseSidebar
//                 activeCase={activeCase}
//                 setActiveCase={setActiveCase}
//               />
//             </div>

//             {/* RIGHT — CHAT */}
//             <section className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
//               <div className="flex-1 min-h-0">
//                 <ChatInterface activeCase={activeCase} />
//               </div>
//             </section>

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

export default function Home() {

  const [activeCase, setActiveCase]         = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suspects, setSuspects]             = useState<Suspect[]>([]);
  const [entities, setEntities]             = useState<Entity[]>([]);

  // ── Evidence panel handlers ──────────────────────────────────────
  const addSuspect    = (s: Omit<Suspect, "id">) =>
    setSuspects((prev) => [...prev, { ...s, id: crypto.randomUUID() }]);
  const deleteSuspect = (id: string) =>
    setSuspects((prev) => prev.filter((s) => s.id !== id));
  const addEntity     = (e: Omit<Entity, "id">) =>
    setEntities((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  const deleteEntity  = (id: string) =>
    setEntities((prev) => prev.filter((e) => e.id !== id));

  // ── Question pill click → auto-send ─────────────────────────────
  const handleQuestionClick = useCallback((question: string) => {
    setPendingMessage(question);
  }, []);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">

      {/* ── Background texture (your original) ── */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,...")`,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-hidden">

        {/* ── Header (your original) ── */}
        <Header />

        {/* ── Main 3-column layout ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Case Sidebar */}
          <CaseSidebar
            activeCase={activeCase}
            setActiveCase={(id) => {
              setActiveCase(id);
              setInvestigations([]); // clear pills on case switch
            }}
          />

          {/* CENTER — Investigation pills + Chat */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 px-4 py-6">

            {/* Investigation question pills */}
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
                      className="
                        text-xs text-amber-200 bg-amber-900/30 border border-amber-800/50
                        hover:bg-amber-700/40 hover:border-amber-500 hover:text-amber-100
                        px-3 py-1.5 rounded-full transition-all duration-150
                        text-left max-w-xs truncate
                      "
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatInterface
                activeCase={activeCase}
                pendingMessage={pendingMessage}
                onClearPendingMessage={clearPendingMessage}
                onInvestigationsGenerated={setInvestigations}
              />
            </div>
          </div>

          {/* RIGHT — Evidence & Suspects Panel */}
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
      </div>
    </div>
  );
}
