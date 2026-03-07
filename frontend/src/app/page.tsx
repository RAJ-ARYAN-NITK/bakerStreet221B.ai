// "use client";

// import { useState } from "react";

// export default function Home() {
//   const [messages, setMessages] = useState([
//     { role: "assistant", content: "I am Sherlock Holmes. State your mystery." },
//   ]);
//   const [input, setInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [threadId, setThreadId] = useState<string | null>(null);

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     // 1. Save the message before clearing input
//     const messageToSend = input.trim();
    
//     // 2. Add User Message to UI
//     const userMessage = { role: "user", content: messageToSend };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setIsLoading(true);

//     try {
//       // 3. Send to Python Backend
//       // CRITICAL: Must use absolute URL - Next.js intercepts relative URLs
//       // Hardcode the backend URL to ensure it's always absolute
//       const BACKEND_URL = "http://localhost:8000";
//       const fullUrl = `${BACKEND_URL}/chat`;
      
//       console.log("=== API Request Debug ===");
//       console.log("Backend URL (hardcoded):", BACKEND_URL);
//       console.log("Full URL:", fullUrl);
//       console.log("Request will go to:", fullUrl);
//       console.log("========================");
      
//       const response = await fetch(fullUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ 
//           message: messageToSend,
//           thread_id: threadId 
//         }),
//       });

//       console.log("Response status:", response.status);
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("Error response:", errorText);
//         throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
//       }

//       const data = await response.json();

//       // 4. Save thread_id for conversation persistence
//       if (data.thread_id) {
//         setThreadId(data.thread_id);
//       }

//       // 5. Add Sherlock's Response to UI
//       // Backend returns {"response": "...", "thread_id": "..."}
//       const botMessage = { role: "assistant", content: data.response || data.reply || data.message || "I deduce nothing." };
//       setMessages((prev) => [...prev, botMessage]);

//     } catch (error) {
//       console.error("Error:", error);
//       setMessages((prev) => [
//         ...prev,
//         { role: "assistant", content: "My connection to the mind palace is severed. (Check Backend)" },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
//       {/* Header */}
//       <header className="p-4 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
//         <h1 className="text-xl font-bold text-amber-500 tracking-wider">
//           BAKER STREET 221B
//         </h1>
//         <span className="text-xs text-gray-400">AI Detective</span>
//       </header>

//       {/* Chat Area */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.map((msg, index) => (
//           <div
//             key={index}
//             className={`flex ${
//               msg.role === "user" ? "justify-end" : "justify-start"
//             }`}
//           >
//             <div
//               className={`max-w-[80%] p-3 rounded-lg ${
//                 msg.role === "user"
//                   ? "bg-amber-600 text-white rounded-br-none"
//                   : "bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600"
//               }`}
//             >
//               {msg.content}
//             </div>
//           </div>
//         ))}
//         {isLoading && (
//           <div className="text-gray-500 text-sm animate-pulse">
//             Sherlock is deducing...
//           </div>
//         )}
//       </div>

//       {/* Input Area */}
//       <div className="p-4 bg-gray-800 border-t border-gray-700">
//         <div className="flex gap-2 max-w-3xl mx-auto">
//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//             placeholder="Describe your case..."
//             className="flex-1 bg-gray-900 border border-gray-600 text-white px-4 py-2 rounded-md focus:outline-none focus:border-amber-500 transition-colors"
//           />
//           <button
//             onClick={sendMessage}
//             disabled={isLoading}
//             className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
//           >
//             {isLoading ? "..." : "Consult"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// "use client";

// import { useState } from "react";

// import { Header } from "@/components/Header";
// import { CaseBoard } from "@/components/CaseBoard";
// import { ChatInterface } from "@/components/ChatInterface";

// export default function Home() {
//   const [activeCase, setActiveCase] = useState<string | null>(null);

//   return (
//     <div className="min-h-screen flex flex-col bg-background text-foreground">
//       {/* Global Header */}
//       <Header />

//       {/* Main Application Layout */}
//       <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        
//         {/* Left Panel — Case Board */}
//         <section className="lg:col-span-1">
//           <CaseBoard
//             activeCase={activeCase}
//             onCaseSelect={setActiveCase}
//           />
//         </section>

//         {/* Right Panel — Chat Interface (BACKEND CONNECTED) */}
//         <section className="lg:col-span-2">
//           <ChatInterface activeCase={activeCase} />
//         </section>

//       </main>
//     </div>
//   );
// }

// 'use client';

// import React, { useState } from 'react';
// import { CaseBoard } from '@/components/CaseBoard';
// import { ChatInterface } from '@/components/ChatInterface';
// import { Header } from '@/components/Header';

// export default function Home() {
//   const [activeCase, setActiveCase] = useState<string | null>(null);

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 relative overflow-hidden">
//       {/* Victorian Background Pattern */}
//       <div className="absolute inset-0 opacity-10">
//         <div className="absolute inset-0" style={{
//           backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
//         }}/>
//       </div>

//       <div className="relative z-10">
//         <Header />
        
//         <div className="container mx-auto px-4 py-6">
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Left Sidebar - Case Board */}
//             <div className="lg:col-span-1">
//               <CaseBoard activeCase={activeCase} onCaseSelect={setActiveCase} />
//             </div>

//             {/* Main Chat Interface */}
//             <section className="lg:col-span-2 flex flex-col min-h-0">
//               <ChatInterface activeCase={activeCase} />
//             </section>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// 'use client';

// import React, { useState } from 'react';
// import { CaseBoard } from '@/components/CaseBoard';
// import { ChatInterface } from '@/components/ChatInterface';
// import { Header } from '@/components/Header';

// export default function Home() {
//   const [activeCase, setActiveCase] = useState<string | null>(null);

//   return (
//     <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">
//       {/* Background */}
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

//         {/* 🔒 Height-locked content */}
//         <div className="flex-1 overflow-hidden px-4 py-6">
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
//             <div className="lg:col-span-1 overflow-hidden">
//               <CaseBoard activeCase={activeCase} onCaseSelect={setActiveCase} />
//             </div>

//             <section className="lg:col-span-2 flex flex-col overflow-hidden min-h-0">
//               <ChatInterface activeCase={activeCase} />
//             </section>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// 'use client';

// import React, { useState } from 'react';
// import { CaseBoard } from '@/components/CaseBoard';
// import { ChatInterface } from '@/components/ChatInterface';
// import { Header } from '@/components/Header';

// export default function Home() {
//   // 🔴 THIS STATE IS CORRECT — keep it
//   const [activeCase, setActiveCase] = useState<string | null>(null);

//   return (
//     <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">
      
//       {/* Background */}
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

//         {/* 🔴 IMPORTANT: content must allow children to grow */}
//         <div className="flex-1 overflow-hidden px-4 py-6">
          
//           {/* 🔴 CHANGE 1: ensure grid takes full height */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
            
//             {/* LEFT PANEL */}
//             <div className="lg:col-span-1 overflow-hidden min-h-0">
              
//               {/* 🔴 CHANGE 2: prop name must match CaseBoard */}
//               <CaseBoard
//                 activeCase={activeCase}
//                 onCaseSelect={setActiveCase}   // ← THIS drives chat visibility
//               />
//             </div>

//             {/* RIGHT CHAT PANEL */}
//             <section className="lg:col-span-2 flex flex-col overflow-hidden min-h-0">
              
//               {/* 🔴 CHANGE 3: ensure ChatInterface fills height */}
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

import React, { useState } from 'react';
import { CaseSidebar } from '@/components/ui/CaseSidebar';   // ✅ REAL sidebar
// /Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/frontend/src/components/ui/CaseSidebar.tsx
import { ChatInterface } from '@/components/ChatInterface';
import { Header } from '@/components/Header';

export default function Home() {
  // ✅ controls which investigation is open
  const [activeCase, setActiveCase] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-slate-900 via-amber-950 to-slate-900 overflow-hidden">
      
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,...")`,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <Header />

        {/* Main content */}
        <div className="flex-1 overflow-hidden px-4 py-6">
          
          {/* ✅ 2-column layout (sidebar + chat) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
            
            {/* LEFT — REAL CASE SIDEBAR */}
            <div className="lg:col-span-1 min-h-0">
              <CaseSidebar
                activeCase={activeCase}
                setActiveCase={setActiveCase}
              />
            </div>

            {/* RIGHT — CHAT */}
            <section className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0">
                <ChatInterface activeCase={activeCase} />
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}