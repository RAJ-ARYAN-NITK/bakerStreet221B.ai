// "use client";

// import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Send, Mic, MicOff, Brain, User, Loader2, Paperclip } from "lucide-react";
// import ReactMarkdown from "react-markdown";

// interface Message {
//   id: string;
//   role: "user" | "agent";
//   content: string;
//   type: "text" | "analysis";
//   timestamp: string;
// }

// interface ChatInterfaceProps {
//   activeCase: string | null;
//   pendingMessage?: string | null;
//   onClearPendingMessage?: () => void;
//   onInvestigationsGenerated?: Dispatch<SetStateAction<string[]>>;
// }

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// // ─── localStorage helpers ────────────────────────────────────────────────────

// function saveMessages(caseId: string, msgs: Message[]) {
//   try {
//     localStorage.setItem(`messages_${caseId}`, JSON.stringify(msgs));
//   } catch {
//     // storage full – silently ignore
//   }
// }

// function loadMessages(caseId: string): Message[] {
//   try {
//     const raw = localStorage.getItem(`messages_${caseId}`);
//     return raw ? JSON.parse(raw) : [];
//   } catch {
//     return [];
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────

// export function ChatInterface({
//   activeCase,
//   pendingMessage,
//   onClearPendingMessage,
//   onInvestigationsGenerated,
// }: ChatInterfaceProps) {

//   const [mounted, setMounted]           = useState(false);
//   const [messages, setMessages]         = useState<Message[]>([]);
//   const [input, setInput]               = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [threadId, setThreadId]         = useState<string | null>(null);
//   const [isRecording, setIsRecording]   = useState(false);

//   const scrollRef    = useRef<HTMLDivElement>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // ─── helper: add messages + persist ─────────────────────────────────────────

//   const addMessages = (newMsgs: Message[], caseId: string) => {
//     setMessages(prev => {
//       const updated = [...prev, ...newMsgs];
//       saveMessages(caseId, updated);
//       return updated;
//     });
//   };

//   // ─── typewriter effect ───────────────────────────────────────────────────────

//   const typeMessage = (text: string, type: "text" | "analysis", caseId: string) => {
//     const id    = crypto.randomUUID();
//     const words = text.split(" ");
//     let index   = 0;

//     setMessages(prev => {
//       const updated = [
//         ...prev,
//         { id, role: "agent" as const, content: "", type, timestamp: new Date().toISOString() },
//       ];
//       saveMessages(caseId, updated);
//       return updated;
//     });

//     const interval = setInterval(() => {
//       index++;
//       const partial = words.slice(0, index).join(" ");

//       setMessages(prev => {
//         const updated = prev.map(m => m.id === id ? { ...m, content: partial } : m);
//         if (index >= words.length) saveMessages(caseId, updated);
//         return updated;
//       });

//       if (index >= words.length) clearInterval(interval);
//     }, 40);
//   };

//   // ─── load messages when case changes ────────────────────────────────────────

//   useEffect(() => {
//     setMounted(true);

//     if (!activeCase) {
//       setMessages([]);
//       return;
//     }

//     const cached = loadMessages(activeCase);
//     if (cached.length > 0) {
//       setMessages(cached);
//     } else {
//       const loadFromBackend = async () => {
//         try {
//           const res  = await fetch(`${BACKEND_URL}/messages/${activeCase}`);
//           const data = await res.json();
//           const msgs: Message[] = data.map((m: any) => ({
//             id:        crypto.randomUUID(),
//             role:      m.role,
//             content:   m.content,
//             type:      "text",
//             timestamp: m.created_at,
//           }));
//           setMessages(msgs);
//           saveMessages(activeCase, msgs);
//         } catch {
//           setMessages([]);
//         }
//       };
//       loadFromBackend();
//     }

//     const savedThread = localStorage.getItem(`thread_${activeCase}`);
//     if (savedThread) setThreadId(savedThread);

//   }, [activeCase]);

//   // ─── auto scroll ─────────────────────────────────────────────────────────────

//   useEffect(() => {
//     const el = scrollRef.current;
//     if (!el) return;
//     el.scrollTop = el.scrollHeight;
//   }, [messages]);

//   // ─── send message ─────────────────────────────────────────────────────────────

//   const handleSendMessage = async () => {
//     if (!input.trim() || isProcessing || !activeCase) return;

//     const userText = input.trim();
//     setInput("");

//     const userMsg: Message = {
//       id:        crypto.randomUUID(),
//       role:      "user",
//       content:   userText,
//       type:      "text",
//       timestamp: new Date().toISOString(),
//     };

//     addMessages([userMsg], activeCase);
//     setIsProcessing(true);

//     try {
//       const res  = await fetch(`${BACKEND_URL}/chat`, {
//         method:  "POST",
//         headers: { "Content-Type": "application/json" },
//         body:    JSON.stringify({
//           message:   userText,
//           thread_id: threadId,
//           case_id:   activeCase,
//         }),
//       });

//       const data = await res.json();

//       if (data.thread_id && activeCase) {
//         setThreadId(data.thread_id);
//         localStorage.setItem(`thread_${activeCase}`, data.thread_id);
//       }

//       typeMessage(data.response ?? "I deduce nothing of value.", "text", activeCase);

//     } catch {
//       typeMessage("My connection to the mind palace is severed.", "text", activeCase);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   // ─── file upload ──────────────────────────────────────────────────────────────

//   const handleUploadClick = () => fileInputRef.current?.click();

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file || !activeCase) return;

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("case_id", activeCase);

//     try {
//       const res  = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: formData });
//       const data = await res.json();

//       const confirmMsg: Message = {
//         id:        crypto.randomUUID(),
//         role:      "agent",
//         content:   `📄 Document "${data.filename}" ingested (${data.chunks} chunks).\n\nSherlock Holmes is analyzing the evidence...`,
//         type:      "text",
//         timestamp: new Date().toISOString(),
//       };

//       addMessages([confirmMsg], activeCase);
//       setIsProcessing(true);

//       setTimeout(() => {
//         let analysisText = "";

//         if (Array.isArray(data.investigations) && data.investigations.length > 0) {
//           const questions = data.investigations.map((q: string) =>
//             q.replace(/[*]/g, "").replace(/question\s*\d+:/i, "").trim()
//           );
//           // ✅ markdown format so ReactMarkdown renders clean bullets
//           analysisText = `**Possible investigations detected:**\n\n${questions.map((q: string) => `- ${q}`).join("\n")}`;
//         } else {
//           analysisText = "Sherlock Holmes could not deduce investigations yet.";
//         }

//         typeMessage(analysisText, "analysis", activeCase);
//         setIsProcessing(false);
//       }, 1800);

//     } catch {
//       typeMessage("⚠️ Failed to upload document.", "text", activeCase);
//     }

//     e.target.value = "";
//   };

//   // ─── empty state ──────────────────────────────────────────────────────────────

//   if (!activeCase) {
//     return (
//       <div className="flex-1 flex items-center justify-center text-amber-400">
//         Select or create a case to begin.
//       </div>
//     );
//   }

//   // ─── UI ───────────────────────────────────────────────────────────────────────

//   return (
//     <Card className="flex flex-col h-full min-h-0 bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50">

//       <CardHeader className="border-b border-amber-900/30">
//         <CardTitle className="text-amber-100 flex items-center gap-2">
//           <Brain className="w-5 h-5 text-amber-500" />
//           Detective Analysis Chamber
//         </CardTitle>
//       </CardHeader>

//       <CardContent className="flex flex-col flex-1 min-h-0 p-0">

//         <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
//           <div className="mx-auto max-w-3xl space-y-6">

//             {messages.map((m) => (
//               <div
//                 key={m.id}
//                 className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
//               >
//                 {m.role === "agent" && (
//                   <Brain className="mr-3 mt-1 w-6 h-6 text-amber-500 shrink-0" />
//                 )}

//                 <div className="max-w-[75%] rounded-lg bg-slate-900/80 border border-amber-900/30 p-4">

//                   {m.type === "analysis" && (
//                     <Badge className="mb-2">Analysis</Badge>
//                   )}

//                   {m.role === "user" ? (
//                     // ── User messages: plain text, no markdown needed ────────
//                     <p className="text-amber-100 whitespace-pre-wrap">
//                       {m.content}
//                     </p>
//                   ) : (
//                     // ── Agent messages: full markdown rendering ──────────────
//                     <div className="text-amber-100 prose prose-invert prose-amber max-w-none">
//                       <ReactMarkdown
//                         components={{
//                           ul: ({ node, ...props }) => (
//                             <ul className="list-disc list-inside space-y-1 my-2" {...props} />
//                           ),
//                           ol: ({ node, ...props }) => (
//                             <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
//                           ),
//                           li: ({ node, ...props }) => (
//                             <li className="text-amber-100" {...props} />
//                           ),
//                           p: ({ node, ...props }) => (
//                             <p className="text-amber-100 mb-2 last:mb-0" {...props} />
//                           ),
//                           strong: ({ node, ...props }) => (
//                             <strong className="text-amber-300 font-bold" {...props} />
//                           ),
//                           em: ({ node, ...props }) => (
//                             <em className="text-amber-200 italic" {...props} />
//                           ),
//                           code: ({ node, ...props }) => (
//                             <code className="bg-slate-800 text-amber-300 px-1 rounded text-sm" {...props} />
//                           ),
//                           h1: ({ node, ...props }) => (
//                             <h1 className="text-amber-200 font-bold text-lg mb-2" {...props} />
//                           ),
//                           h2: ({ node, ...props }) => (
//                             <h2 className="text-amber-200 font-bold text-base mb-2" {...props} />
//                           ),
//                           h3: ({ node, ...props }) => (
//                             <h3 className="text-amber-200 font-semibold mb-1" {...props} />
//                           ),
//                         }}
//                       >
//                         {m.content}
//                       </ReactMarkdown>
//                     </div>
//                   )}

//                   {mounted && (
//                     <p className="mt-2 text-xs text-amber-700">
//                       {new Date(m.timestamp).toLocaleTimeString()}
//                     </p>
//                   )}

//                 </div>

//                 {m.role === "user" && (
//                   <User className="ml-3 mt-1 w-6 h-6 text-slate-300 shrink-0" />
//                 )}

//               </div>
//             ))}

//             {isProcessing && (
//               <div className="flex items-center gap-2 text-amber-300">
//                 <Loader2 className="animate-spin" />
//                 Sherlock is deducing…
//               </div>
//             )}

//           </div>
//         </div>

//         <div className="border-t border-amber-900/30 px-4 py-3 flex gap-2">

//           <button
//             onClick={handleUploadClick}
//             className="text-amber-400 hover:bg-amber-900/30 p-2 rounded"
//           >
//             <Paperclip size={18} />
//           </button>

//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileChange}
//             className="hidden"
//           />

//           <button
//             onClick={() => setIsRecording(!isRecording)}
//             className="text-amber-400 hover:bg-amber-900/30 p-2 rounded"
//           >
//             {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
//           </button>

//           <input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
//             className="flex-1 bg-transparent border border-amber-900/30 rounded-lg px-3 py-2 text-white"
//             placeholder="Ask Sherlock..."
//           />

//           <button
//             onClick={handleSendMessage}
//             className="bg-amber-600 hover:bg-amber-500 text-black px-4 rounded-lg"
//           >
//             <Send size={16} />
//           </button>

//         </div>

//       </CardContent>
//     </Card>
//   );
// }

"use client";

import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Brain, User, Loader2, Paperclip, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  type: "text" | "analysis";
  timestamp: string;
}

interface ChatInterfaceProps {
  activeCase: string | null;
  pendingMessage?: string | null;
  onClearPendingMessage?: () => void;
  onInvestigationsGenerated?: Dispatch<SetStateAction<string[]>>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function saveMessages(caseId: string, msgs: Message[]) {
  try {
    localStorage.setItem(`messages_${caseId}`, JSON.stringify(msgs));
  } catch {}
}

function loadMessages(caseId: string): Message[] {
  try {
    const raw = localStorage.getItem(`messages_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function ChatInterface({
  activeCase,
  pendingMessage,
  onClearPendingMessage,
  onInvestigationsGenerated,
}: ChatInterfaceProps) {

  const [mounted, setMounted]           = useState(false);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId]         = useState<string | null>(null);
  const [isRecording, setIsRecording]   = useState(false);

  // ── Mobile drawer state ──────────────────────────────────────────────────────
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef     = useRef<HTMLInputElement | null>(null);

  // ─── helpers ─────────────────────────────────────────────────────────────────

  const addMessages = (newMsgs: Message[], caseId: string) => {
    setMessages(prev => {
      const updated = [...prev, ...newMsgs];
      saveMessages(caseId, updated);
      return updated;
    });
  };

  const typeMessage = (text: string, type: "text" | "analysis", caseId: string) => {
    const id    = crypto.randomUUID();
    const words = text.split(" ");
    let index   = 0;

    setMessages(prev => {
      const updated = [
        ...prev,
        { id, role: "agent" as const, content: "", type, timestamp: new Date().toISOString() },
      ];
      saveMessages(caseId, updated);
      return updated;
    });

    const interval = setInterval(() => {
      index++;
      const partial = words.slice(0, index).join(" ");
      setMessages(prev => {
        const updated = prev.map(m => m.id === id ? { ...m, content: partial } : m);
        if (index >= words.length) saveMessages(caseId, updated);
        return updated;
      });
      if (index >= words.length) clearInterval(interval);
    }, 40);
  };

  // ─── load messages ───────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    if (!activeCase) { setMessages([]); return; }

    const cached = loadMessages(activeCase);
    if (cached.length > 0) {
      setMessages(cached);
    } else {
      (async () => {
        try {
          const res  = await fetch(`${BACKEND_URL}/messages/${activeCase}`);
          const data = await res.json();
          const msgs: Message[] = data.map((m: any) => ({
            id: crypto.randomUUID(), role: m.role,
            content: m.content, type: "text", timestamp: m.created_at,
          }));
          setMessages(msgs);
          saveMessages(activeCase, msgs);
        } catch { setMessages([]); }
      })();
    }

    const savedThread = localStorage.getItem(`thread_${activeCase}`);
    if (savedThread) setThreadId(savedThread);
  }, [activeCase]);

  // ─── pending message (from investigation pills) ───────────────────────────────

  useEffect(() => {
    if (!pendingMessage || !activeCase) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user",
      content: pendingMessage, type: "text",
      timestamp: new Date().toISOString(),
    };

    addMessages([userMsg], activeCase);
    setIsProcessing(true);

    fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: pendingMessage, thread_id: threadId, case_id: activeCase }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.thread_id) {
          setThreadId(data.thread_id);
          localStorage.setItem(`thread_${activeCase}`, data.thread_id);
        }
        typeMessage(data.response ?? "I deduce nothing of value.", "text", activeCase);
      })
      .catch(() => typeMessage("My connection to the mind palace is severed.", "text", activeCase))
      .finally(() => { setIsProcessing(false); onClearPendingMessage?.(); });
  }, [pendingMessage]);

  // ─── auto scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ─── send message ─────────────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing || !activeCase) return;
    const userText = input.trim();
    setInput("");

    // on mobile — blur keyboard after sending
    inputRef.current?.blur();

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user",
      content: userText, type: "text",
      timestamp: new Date().toISOString(),
    };

    addMessages([userMsg], activeCase);
    setIsProcessing(true);

    try {
      const res  = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, thread_id: threadId, case_id: activeCase }),
      });
      const data = await res.json();
      if (data.thread_id) {
        setThreadId(data.thread_id);
        localStorage.setItem(`thread_${activeCase}`, data.thread_id);
      }
      typeMessage(data.response ?? "I deduce nothing of value.", "text", activeCase);
    } catch {
      typeMessage("My connection to the mind palace is severed.", "text", activeCase);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── file upload ──────────────────────────────────────────────────────────────

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("case_id", activeCase);

    try {
      const res  = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();

      addMessages([{
        id: crypto.randomUUID(), role: "agent",
        content: `📄 Document "${data.filename}" ingested (${data.chunks} chunks).\n\nSherlock Holmes is analyzing the evidence...`,
        type: "text", timestamp: new Date().toISOString(),
      }], activeCase);

      setIsProcessing(true);

      setTimeout(() => {
        let analysisText = "";
        let cleanQuestions: string[] = [];

        if (Array.isArray(data.investigations) && data.investigations.length > 0) {
          cleanQuestions = data.investigations.map((q: string) =>
            q.replace(/[*]/g, "").replace(/question\s*\d+:/i, "").trim()
          );
          analysisText = `**Possible investigations detected:**\n\n${cleanQuestions.map((q: string) => `- ${q}`).join("\n")}`;
        } else {
          analysisText = "Sherlock Holmes could not deduce investigations yet.";
        }

        typeMessage(analysisText, "analysis", activeCase);
        onInvestigationsGenerated?.(cleanQuestions);
        setIsProcessing(false);
      }, 1800);
    } catch {
      typeMessage("⚠️ Failed to upload document.", "text", activeCase);
    }

    e.target.value = "";
  };

  // ─── empty state ──────────────────────────────────────────────────────────────

  if (!activeCase) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-amber-400 px-4 text-center">
        <Brain className="w-12 h-12 text-amber-600" />
        <p className="text-lg font-medium">Select or create a case to begin.</p>
        <p className="text-sm text-amber-700">Upload documents and interrogate the evidence.</p>
      </div>
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────────────────

  return (
    <Card className="flex flex-col h-full min-h-0 bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50">

      {/* Header */}
      <CardHeader className="border-b border-amber-900/30 px-3 sm:px-6 py-3">
        <CardTitle className="text-amber-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-sm sm:text-base">Detective Analysis Chamber</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
          <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">

            {messages.length === 0 && (
              <div className="text-center text-amber-700 text-sm py-8">
                Upload a document or ask Sherlock a question to begin.
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Agent icon — hidden on very small screens */}
                {m.role === "agent" && (
                  <Brain className="hidden sm:block mt-1 w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
                )}

                <div className={`
                  rounded-xl sm:rounded-lg border p-3 sm:p-4
                  ${m.role === "user"
                    ? "max-w-[85%] sm:max-w-[75%] bg-amber-900/30 border-amber-700/50"
                    : "max-w-[90%] sm:max-w-[80%] bg-slate-900/80 border-amber-900/30"
                  }
                `}>

                  {m.type === "analysis" && (
                    <Badge className="mb-2 text-xs">Analysis</Badge>
                  )}

                  {m.role === "user" ? (
                    <p className="text-amber-100 text-sm sm:text-base whitespace-pre-wrap">
                      {m.content}
                    </p>
                  ) : (
                    <div className="text-amber-100 prose prose-invert prose-amber max-w-none text-sm sm:text-base">
                      <ReactMarkdown
                        components={{
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-amber-100" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-amber-100 mb-2 last:mb-0" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="text-amber-300 font-bold" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="text-amber-200 italic" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-slate-800 text-amber-300 px-1 rounded text-xs sm:text-sm" {...props} />
                          ),
                          h1: ({ node, ...props }) => (
                            <h1 className="text-amber-200 font-bold text-base sm:text-lg mb-2" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-amber-200 font-bold text-sm sm:text-base mb-2" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-amber-200 font-semibold mb-1" {...props} />
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {mounted && (
                    <p className="mt-1.5 text-xs text-amber-700">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {m.role === "user" && (
                  <User className="hidden sm:block mt-1 w-5 h-5 sm:w-6 sm:h-6 text-slate-300 shrink-0" />
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-amber-300 text-sm">
                <Loader2 className="animate-spin w-4 h-4" />
                Sherlock is deducing…
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-amber-900/30 px-2 sm:px-4 py-2 sm:py-3 flex gap-1.5 sm:gap-2 items-center">

          <button
            onClick={handleUploadClick}
            className="text-amber-400 hover:bg-amber-900/30 p-2 rounded-lg shrink-0 transition-colors"
            title="Upload document"
          >
            <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.txt"
          />

          <button
            onClick={() => setIsRecording(!isRecording)}
            className="text-amber-400 hover:bg-amber-900/30 p-2 rounded-lg shrink-0 transition-colors"
            title="Voice input"
          >
            {isRecording
              ? <MicOff size={16} className="sm:w-[18px] sm:h-[18px]" />
              : <Mic    size={16} className="sm:w-[18px] sm:h-[18px]" />
            }
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendMessage(); }}
            className="
              flex-1 min-w-0
              bg-transparent border border-amber-900/30
              rounded-lg px-3 py-2
              text-white text-sm sm:text-base
              placeholder-amber-800
              outline-none focus:border-amber-600
              transition-colors
            "
            placeholder="Ask Sherlock..."
          />

          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !input.trim()}
            className="
              bg-amber-600 hover:bg-amber-500
              disabled:opacity-40 disabled:cursor-not-allowed
              text-black px-3 sm:px-4 py-2 rounded-lg
              shrink-0 transition-colors
            "
            title="Send"
          >
            <Send size={16} className="sm:w-[16px] sm:h-[16px]" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}