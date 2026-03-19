

// "use client";

// import { useEffect, useState } from "react";

// interface CaseItem {
//   id: string;
//   title: string;
//   created_at: string;
// }

// interface Props {
//   activeCase: string | null;
//   setActiveCase: (id: string | null) => void; // 🔴 allow null when deleted
// }

// const BACKEND_URL = "http://localhost:8000";

// export function CaseSidebar({ activeCase, setActiveCase }: Props) {
//   const [cases, setCases] = useState<CaseItem[]>([]);

//   /* ---------------- FETCH + AUTO-SELECT CASE ---------------- */
//   useEffect(() => {
//     const init = async () => {
//       const res = await fetch(`${BACKEND_URL}/cases`);
//       const data: CaseItem[] = await res.json();

//       setCases(data);

//       // 1️⃣ Restore previously selected case
//       const saved = localStorage.getItem("active_case");
//       if (saved && data.some((c) => c.id === saved)) {
//         setActiveCase(saved);
//         return;
//       }

//       // 2️⃣ Auto-select first case if none saved
//       if (data.length > 0) {
//         setActiveCase(data[0].id);
//         localStorage.setItem("active_case", data[0].id);
//       }
//     };

//     init();
//   }, [setActiveCase]);

//   /* ---------------- CREATE NEW CASE ---------------- */
//   const createCase = async () => {
//     const res = await fetch(`${BACKEND_URL}/cases/new`, { method: "POST" });
//     const data = await res.json();

//     setActiveCase(data.case_id);
//     localStorage.setItem("active_case", data.case_id);

//     // refresh list
//     const res2 = await fetch(`${BACKEND_URL}/cases`);
//     const updated = await res2.json();
//     setCases(updated);
//   };

//   /* ---------------- DELETE CASE (NEW) ---------------- */
//   const deleteCase = async (id: string) => {
//     await fetch(`${BACKEND_URL}/cases/${id}`, { method: "DELETE" });

//     // if deleted case was active → reset UI
//     if (activeCase === id) {
//       setActiveCase(null);
//       localStorage.removeItem("active_case");
//     }

//     // refresh list
//     const res = await fetch(`${BACKEND_URL}/cases`);
//     const updated = await res.json();
//     setCases(updated);
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div className="w-64 border-r border-amber-900/40 p-4 space-y-3 overflow-y-auto">
//       {/* NEW CASE BUTTON */}
//       <button
//         onClick={createCase}
//         className="w-full bg-amber-600 hover:bg-amber-500 text-black px-3 py-2 rounded-lg"
//       >
//         + New Case
//       </button>

//       {/* CASE LIST */}
//       <div className="space-y-2">
//         {cases.map((c) => (
//           <div key={c.id} className="flex gap-2">
//             {/* SELECT CASE */}
//             <button
//               onClick={() => {
//                 setActiveCase(c.id);
//                 localStorage.setItem("active_case", c.id);
//               }}
//               className={`flex-1 text-left px-3 py-2 rounded-lg border transition ${
//                 activeCase === c.id
//                   ? "bg-amber-900/40 border-amber-500"
//                   : "border-amber-900/20 hover:bg-amber-900/20"
//               }`}
//             >
//               {c.title}
//             </button>

//             {/* DELETE BUTTON */}
//             <button
//               onClick={() => deleteCase(c.id)}
//               className="px-2 text-red-400 hover:text-red-300"
//               title="Delete case"
//             >
//               ✕
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, FolderOpen } from "lucide-react";

interface CaseItem {
  id: string;
  title: string;
  created_at: string;
}

interface Props {
  activeCase: string | null;
  setActiveCase: (id: string | null) => void;
}

const BACKEND_URL = "http://localhost:8000";

export function CaseSidebar({ activeCase, setActiveCase }: Props) {
  const [cases, setCases]       = useState<CaseItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState("");

  /* ── fetch cases ──────────────────────────────────────────────── */
  const fetchCases = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/cases`);
      const data: CaseItem[] = await res.json();
      setCases(data);
      return data;
    } catch {
      return [];
    }
  };

  /* ── init ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const data = await fetchCases();
      const saved = localStorage.getItem("active_case");
      if (saved && data.some((c) => c.id === saved)) {
        setActiveCase(saved);
        return;
      }
      if (data.length > 0) {
        setActiveCase(data[0].id);
        localStorage.setItem("active_case", data[0].id);
      }
    };
    init();
  }, []);

  /* ── create case ──────────────────────────────────────────────── */
  const createCase = async () => {
    const res  = await fetch(`${BACKEND_URL}/cases/new`, { method: "POST" });
    const data = await res.json();
    setActiveCase(data.case_id);
    localStorage.setItem("active_case", data.case_id);
    await fetchCases();
    // immediately enter rename mode for the new case
    setEditingId(data.case_id);
    setEditName("New Investigation");
  };

  /* ── delete case ──────────────────────────────────────────────── */
  const deleteCase = async (id: string) => {
    await fetch(`${BACKEND_URL}/cases/${id}`, { method: "DELETE" });
    if (activeCase === id) {
      setActiveCase(null);
      localStorage.removeItem("active_case");
    }
    await fetchCases();
  };

  /* ── rename case ──────────────────────────────────────────────── */
  const commitRename = async (id: string) => {
    const name = editName.trim() || "New Investigation";
    try {
      await fetch(`${BACKEND_URL}/cases/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: name }),
      });
    } catch {
      // optimistic — update locally even if backend not wired yet
    }
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: name } : c))
    );
    setEditingId(null);
  };

  /* ── UI ───────────────────────────────────────────────────────── */
  return (
    <div className="w-64 min-h-full border-r border-amber-900/40 flex flex-col bg-slate-950/60 backdrop-blur-sm">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-amber-900/30">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">
            Investigations
          </span>
        </div>

        {/* New Case Button */}
        <button
          onClick={createCase}
          className="
            w-full flex items-center justify-center gap-2
            bg-amber-600 hover:bg-amber-400 active:bg-amber-700
            text-black font-semibold text-sm
            px-3 py-2.5 rounded-xl
            transition-all duration-150 shadow-md hover:shadow-amber-500/30
          "
        >
          <Plus className="w-4 h-4" />
          New Case
        </button>
      </div>

      {/* Case List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {cases.length === 0 && (
          <p className="text-xs text-amber-800 text-center py-6 px-2">
            No investigations yet. Create one to begin.
          </p>
        )}

        {cases.map((c) => (
          <div
            key={c.id}
            className={`
              group flex items-center gap-1.5 rounded-xl border transition-all duration-150
              ${activeCase === c.id
                ? "bg-amber-900/50 border-amber-500/70 shadow-sm shadow-amber-900/40"
                : "border-transparent hover:bg-amber-900/25 hover:border-amber-800/50"
              }
            `}
          >
            {/* Case name / rename input */}
            {editingId === c.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => commitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(c.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="
                  flex-1 bg-slate-800 border border-amber-500 rounded-lg
                  px-2 py-1.5 text-sm text-amber-100 outline-none
                  min-w-0
                "
              />
            ) : (
              <button
                onClick={() => {
                  setActiveCase(c.id);
                  localStorage.setItem("active_case", c.id);
                }}
                onDoubleClick={() => {
                  setEditingId(c.id);
                  setEditName(c.title);
                }}
                title="Double-click to rename"
                className="
                  flex-1 text-left px-3 py-2.5 text-sm min-w-0
                  text-amber-100 truncate
                "
              >
                {/* Active indicator dot */}
                {activeCase === c.id && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 mb-0.5" />
                )}
                {c.title}
              </button>
            )}

            {/* Delete button — visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteCase(c.id);
              }}
              title="Delete case"
              className="
                opacity-0 group-hover:opacity-100
                p-1.5 mr-1 rounded-lg shrink-0
                text-red-500 hover:text-red-300 hover:bg-red-900/30
                transition-all duration-150
              "
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-amber-900/30">
        <p className="text-xs text-amber-900 text-center">
          Double-click to rename
        </p>
      </div>
    </div>
  );
}