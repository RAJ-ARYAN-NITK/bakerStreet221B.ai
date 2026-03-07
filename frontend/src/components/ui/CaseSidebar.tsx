// "use client";

// import { useEffect, useState } from "react";

// interface CaseItem {
//   id: string;
//   title: string;
//   created_at: string;
// }

// interface Props {
//   activeCase: string | null;
//   setActiveCase: (id: string) => void;
// }

// const BACKEND_URL = "http://localhost:8000";

// export function CaseSidebar({ activeCase, setActiveCase }: Props) {
//   const [cases, setCases] = useState<CaseItem[]>([]);

//   const fetchCases = async () => {
//     const res = await fetch(`${BACKEND_URL}/cases`);
//     const data = await res.json();
//     setCases(data);
//   };

//   const createCase = async () => {
//     const res = await fetch(`${BACKEND_URL}/cases/new`, { method: "POST" });
//     const data = await res.json();

//     setActiveCase(data.case_id);
//     localStorage.setItem("active_case", data.case_id);

//     await fetchCases();
//   };

//   useEffect(() => {
//     fetchCases();

//     const saved = localStorage.getItem("active_case");
//     if (saved) setActiveCase(saved);
//   }, []);

//   return (
//     <div className="w-64 border-r border-amber-900/40 p-4 space-y-3">
//       <button
//         onClick={createCase}
//         className="w-full bg-amber-600 hover:bg-amber-500 text-black px-3 py-2 rounded-lg"
//       >
//         + New Case
//       </button>

//       <div className="space-y-2">
//         {cases.map((c) => (
//           <button
//             key={c.id}
//             onClick={() => {
//               setActiveCase(c.id);
//               localStorage.setItem("active_case", c.id);
//             }}
//             className={`w-full text-left px-3 py-2 rounded-lg border ${
//               activeCase === c.id
//                 ? "bg-amber-900/40 border-amber-500"
//                 : "border-amber-900/20 hover:bg-amber-900/20"
//             }`}
//           >
//             {c.title}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useEffect, useState } from "react";

// interface CaseItem {
//   id: string;
//   title: string;
//   created_at: string;
// }

// interface Props {
//   activeCase: string | null;
//   setActiveCase: (id: string) => void;
// }

// const BACKEND_URL = "http://localhost:8000";

// export function CaseSidebar({ activeCase, setActiveCase }: Props) {
//   const [cases, setCases] = useState<CaseItem[]>([]);

//   /* ---------------- FETCH + AUTO-SELECT CASE (PHASE 5 FIX) ---------------- */
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

//       // 2️⃣ Auto-select first case if none saved (CRITICAL FIX)
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

//   /* ---------------- UI ---------------- */
//   return (
//     <div className="w-64 border-r border-amber-900/40 p-4 space-y-3">
//       <button
//         onClick={createCase}
//         className="w-full bg-amber-600 hover:bg-amber-500 text-black px-3 py-2 rounded-lg"
//       >
//         + New Case
//       </button>

//       <div className="space-y-2">
//         {cases.map((c) => (
//           <button
//             key={c.id}
//             onClick={() => {
//               setActiveCase(c.id);
//               localStorage.setItem("active_case", c.id);
//             }}
//             className={`w-full text-left px-3 py-2 rounded-lg border transition ${
//               activeCase === c.id
//                 ? "bg-amber-900/40 border-amber-500"
//                 : "border-amber-900/20 hover:bg-amber-900/20"
//             }`}
//           >
//             {c.title}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";

interface CaseItem {
  id: string;
  title: string;
  created_at: string;
}

interface Props {
  activeCase: string | null;
  setActiveCase: (id: string | null) => void; // 🔴 allow null when deleted
}

const BACKEND_URL = "http://localhost:8000";

export function CaseSidebar({ activeCase, setActiveCase }: Props) {
  const [cases, setCases] = useState<CaseItem[]>([]);

  /* ---------------- FETCH + AUTO-SELECT CASE ---------------- */
  useEffect(() => {
    const init = async () => {
      const res = await fetch(`${BACKEND_URL}/cases`);
      const data: CaseItem[] = await res.json();

      setCases(data);

      // 1️⃣ Restore previously selected case
      const saved = localStorage.getItem("active_case");
      if (saved && data.some((c) => c.id === saved)) {
        setActiveCase(saved);
        return;
      }

      // 2️⃣ Auto-select first case if none saved
      if (data.length > 0) {
        setActiveCase(data[0].id);
        localStorage.setItem("active_case", data[0].id);
      }
    };

    init();
  }, [setActiveCase]);

  /* ---------------- CREATE NEW CASE ---------------- */
  const createCase = async () => {
    const res = await fetch(`${BACKEND_URL}/cases/new`, { method: "POST" });
    const data = await res.json();

    setActiveCase(data.case_id);
    localStorage.setItem("active_case", data.case_id);

    // refresh list
    const res2 = await fetch(`${BACKEND_URL}/cases`);
    const updated = await res2.json();
    setCases(updated);
  };

  /* ---------------- DELETE CASE (NEW) ---------------- */
  const deleteCase = async (id: string) => {
    await fetch(`${BACKEND_URL}/cases/${id}`, { method: "DELETE" });

    // if deleted case was active → reset UI
    if (activeCase === id) {
      setActiveCase(null);
      localStorage.removeItem("active_case");
    }

    // refresh list
    const res = await fetch(`${BACKEND_URL}/cases`);
    const updated = await res.json();
    setCases(updated);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="w-64 border-r border-amber-900/40 p-4 space-y-3 overflow-y-auto">
      {/* NEW CASE BUTTON */}
      <button
        onClick={createCase}
        className="w-full bg-amber-600 hover:bg-amber-500 text-black px-3 py-2 rounded-lg"
      >
        + New Case
      </button>

      {/* CASE LIST */}
      <div className="space-y-2">
        {cases.map((c) => (
          <div key={c.id} className="flex gap-2">
            {/* SELECT CASE */}
            <button
              onClick={() => {
                setActiveCase(c.id);
                localStorage.setItem("active_case", c.id);
              }}
              className={`flex-1 text-left px-3 py-2 rounded-lg border transition ${
                activeCase === c.id
                  ? "bg-amber-900/40 border-amber-500"
                  : "border-amber-900/20 hover:bg-amber-900/20"
              }`}
            >
              {c.title}
            </button>

            {/* DELETE BUTTON */}
            <button
              onClick={() => deleteCase(c.id)}
              className="px-2 text-red-400 hover:text-red-300"
              title="Delete case"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}