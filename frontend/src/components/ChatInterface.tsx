"use client";

import React, {
  useState, useRef, useEffect, useCallback, Dispatch, SetStateAction,
} from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Mic, MicOff, Brain, User, Loader2, Paperclip, Wrench,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:        string;
  role:      "user" | "agent";
  content:   string;
  type:      "text" | "analysis";
  timestamp: string;
  tool?:     string;   // name of tool being used, shown as a badge
}

interface ChatInterfaceProps {
  activeCase:               string | null;
  pendingMessage?:          string | null;
  onClearPendingMessage?:   () => void;
  onInvestigationsGenerated?: Dispatch<SetStateAction<string[]>>;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function saveMessages(caseId: string, msgs: Message[]) {
  try { localStorage.setItem(`messages_${caseId}`, JSON.stringify(msgs)); } catch {}
}
function loadMessages(caseId: string): Message[] {
  try {
    const raw = localStorage.getItem(`messages_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Web Speech API types ─────────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [voiceSupported, setVoiceSupported] = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef     = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Typewriter queue ─────────────────────────────────────────────────────
  // Chars buffered from SSE tokens, drained one-by-one on an interval
  const typewriterQueue = useRef<string[]>([]);
  const typewriterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const typewriterText  = useRef<string>("");
  const typewriterMsgId = useRef<string | null>(null);

  const startTypewriter = (agentId: string) => {
    typewriterMsgId.current = agentId;
    typewriterText.current  = "";
    typewriterQueue.current = [];
    if (typewriterTimer.current) clearInterval(typewriterTimer.current);

    typewriterTimer.current = setInterval(() => {
      if (typewriterQueue.current.length === 0) return;
      // Drain up to 2 chars per tick for a natural feel
      const chars = typewriterQueue.current.splice(0, 2).join("");
      typewriterText.current += chars;
      const snapshot = typewriterText.current;
      setMessages(prev =>
        prev.map(m => m.id === typewriterMsgId.current ? { ...m, content: snapshot } : m)
      );
    }, 18); // ~55 chars/sec — feels like Claude/ChatGPT
  };

  const stopTypewriter = (activeCase: string) => {
    // Flush remaining queue immediately
    if (typewriterTimer.current) {
      clearInterval(typewriterTimer.current);
      typewriterTimer.current = null;
    }
    if (typewriterQueue.current.length > 0) {
      typewriterText.current += typewriterQueue.current.join("");
      typewriterQueue.current = [];
      const snapshot = typewriterText.current;
      const id = typewriterMsgId.current;
      setMessages(prev => {
        const updated = prev.map(m => m.id === id ? { ...m, content: snapshot } : m);
        saveMessages(activeCase, updated);
        return updated;
      });
    }
    typewriterMsgId.current = null;
  };

  // ─── Mount ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    // Detect Web Speech API support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);

    return () => {
      abortControllerRef.current?.abort();
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);
    };
  }, []);

  // ─── Load messages when case changes ────────────────────────────────────────

  useEffect(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);

    if (!activeCase) { setMessages([]); setThreadId(null); return; }

    const savedThread = localStorage.getItem(`thread_${activeCase}`);
    setThreadId(savedThread || null);

    const cached = loadMessages(activeCase);
    if (cached.length > 0) {
      setMessages(cached);
    } else if (savedThread) {
      setMessages([]); // Clear immediately while loading

      const controller = new AbortController();
      abortControllerRef.current = controller;

      (async () => {
        try {
          const res  = await fetch(`${BACKEND_URL}/chat/history/${savedThread}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("Failed to load history");
          const data = await res.json();
          
          if (controller.signal.aborted) return;

          const msgs: Message[] = (data.messages ?? []).map((m: any) => ({
            id: crypto.randomUUID(), role: m.role,
            content: m.content, type: m.type ?? "text",
            timestamp: m.timestamp ?? new Date().toISOString(),
          }));
          setMessages(msgs);
          saveMessages(activeCase, msgs);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            setMessages([]);
          }
        }
      })();
    } else {
      setMessages([]);
    }
  }, [activeCase]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ─── Pending message from investigation pills ────────────────────────────────

  useEffect(() => {
    if (!pendingMessage || !activeCase) return;
    sendMessage(pendingMessage);
    onClearPendingMessage?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  // ─── SSE streaming send ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing || !activeCase) return;
    setInput("");
    inputRef.current?.blur();

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user",
      content: text.trim(), type: "text",
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setMessages(prev => {
      const updated = [...prev, userMsg];
      saveMessages(activeCase, updated);
      return updated;
    });
    setIsProcessing(true);

    // Create streaming agent message placeholder
    const agentId = crypto.randomUUID();
    const agentMsg: Message = {
      id: agentId, role: "agent", content: "", type: "text",
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, agentMsg]);

    const t_id = threadId || undefined;

    try {
      const res = await fetch(`${BACKEND_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:   text.trim(),
          thread_id: t_id,
          case_id:   activeCase,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      // Read the new thread_id from response header immediately
      const newThread = res.headers.get("X-Thread-Id");
      if (newThread) {
        setThreadId(newThread);
        localStorage.setItem(`thread_${activeCase}`, newThread);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      // Start the typewriter animator for this message
      startTypewriter(agentId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "token") {
              // Push every character onto the typewriter queue
              typewriterQueue.current.push(...event.content.split(""));
            } else if (event.type === "tool") {
              // Show which tool is being called
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, tool: `🔍 ${event.name.replace(/_/g, " ")}` } : m
                )
              );
            } else if (event.type === "tool_result") {
              // Tool completed — update badge
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, tool: `✓ ${event.name.replace(/_/g, " ")}` } : m
                )
              );
            } else if (event.type === "error") {
              stopTypewriter(activeCase);
              const errText = `⚠️ Error: ${event.message}`;
              setMessages(prev =>
                prev.map(m => m.id === agentId ? { ...m, content: errText } : m)
              );
            } else if (event.type === "done") {
              if (event.thread_id && !newThread) {
                setThreadId(event.thread_id);
                localStorage.setItem(`thread_${activeCase}`, event.thread_id);
              }
              // Clear tool badge on completion
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, tool: undefined } : m
                )
              );
            }
          } catch {}
        }
      }

      // Wait for the typewriter to finish draining, then stop it
      await new Promise<void>(resolve => {
        const checkDone = setInterval(() => {
          if (typewriterQueue.current.length === 0) {
            clearInterval(checkDone);
            resolve();
          }
        }, 20);
      });
      stopTypewriter(activeCase);

      // Persist final state
      setMessages(prev => {
        saveMessages(activeCase, prev);
        return prev;
      });

    } catch (err: any) {
      if (err.name === "AbortError") return;
      // SSE failed — fall back to regular JSON endpoint
      try {
        const res  = await fetch(`${BACKEND_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), thread_id: t_id, case_id: activeCase }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Chat failed");
        const data = await res.json();
        
        if (controller.signal.aborted) return;

        if (data.thread_id) {
          setThreadId(data.thread_id);
          localStorage.setItem(`thread_${activeCase}`, data.thread_id);
        }
        const fallbackContent = data.response ?? "I could not reach a deduction.";
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === agentId ? { ...m, content: fallbackContent } : m
          );
          saveMessages(activeCase, updated);
          return updated;
        });
      } catch (fallbackErr: any) {
        if (fallbackErr.name === "AbortError") return;
        setMessages(prev =>
          prev.map(m =>
            m.id === agentId
              ? { ...m, content: "My connection to the mind palace is severed." }
              : m
          )
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase, threadId, isProcessing]);

  // ─── Voice input via Web Speech API ─────────────────────────────────────────

  const toggleRecording = useCallback(() => {
    if (!voiceSupported) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = "en-US";

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      // Auto-send if transcript has content
      setInput(prev => {
        if (prev.trim()) {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        return prev;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, voiceSupported]);

  // ─── File upload ──────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("case_id", activeCase);
    if (threadId) formData.append("thread_id", threadId);

    const ingestMsg: Message = {
      id: crypto.randomUUID(), role: "agent",
      content: `📄 Ingesting **"${file.name}"** — Sherlock is analyzing the evidence…`,
      type: "text", timestamp: new Date().toISOString(),
    };
    setMessages(prev => { const u = [...prev, ingestMsg]; saveMessages(activeCase, u); return u; });
    setIsProcessing(true);

    try {
      const res  = await fetch(`${BACKEND_URL}/upload`, { 
        method: "POST", 
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      if (controller.signal.aborted) return;

      // Update thread_id if returned
      if (data.thread_id && !threadId) {
        setThreadId(data.thread_id);
        localStorage.setItem(`thread_${activeCase}`, data.thread_id);
      }

      const successMsg: Message = {
        id: crypto.randomUUID(), role: "agent",
        content: `📄 **"${data.filename}"** ingested — ${data.chunks} chunks indexed.`,
        type: "text", timestamp: new Date().toISOString(),
      };

      const cleanQuestions: string[] = (data.investigations ?? []).map((q: string) =>
        q.replace(/[*]/g, "").replace(/question\s*\d+:/i, "").trim()
      );

      const analysisText =
        cleanQuestions.length > 0
          ? `**Investigation leads detected:**\n\n${cleanQuestions.map(q => `- ${q}`).join("\n")}`
          : "Evidence ingested. Ask Sherlock questions about it.";

      const analysisMsg: Message = {
        id: crypto.randomUUID(), role: "agent",
        content: analysisText, type: "analysis",
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => {
        const updated = [...prev, successMsg, analysisMsg];
        saveMessages(activeCase, updated);
        return updated;
      });
      onInvestigationsGenerated?.(cleanQuestions);

    } catch (err: any) {
      if (err.name === "AbortError") return;
      const errMsg: Message = {
        id: crypto.randomUUID(), role: "agent",
        content: "⚠️ Failed to upload document.", type: "text",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (!controller.signal.aborted) {
        setIsProcessing(false);
        e.target.value = "";
      }
    }
  };

  // ─── Empty state ─────────────────────────────────────────────────────────────

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
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500 shrink-0" />
          <span className="text-sm sm:text-base">Detective Analysis Chamber</span>
          <span className="ml-auto text-xs text-amber-700 font-normal hidden sm:block">
            Tools: 🔍 Search · 🧮 Calculator · 📄 Docs
          </span>
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

                  {/* Tool-use indicator */}
                  {m.tool && (
                    <div className={`flex items-center gap-1.5 mb-2 text-xs ${m.tool.startsWith("✓") ? "text-green-500" : "text-amber-600 animate-pulse"}`}>
                      <Wrench className="w-3 h-3" />
                      <span>{m.tool.startsWith("✓") || m.tool.startsWith("🔍") ? m.tool : `Using: ${m.tool}`}</span>
                    </div>
                  )}

                  {m.role === "user" ? (
                    <p className="text-amber-100 text-sm sm:text-base whitespace-pre-wrap">
                      {m.content}
                    </p>
                  ) : (
                    <div className="text-amber-100 prose prose-invert prose-amber max-w-none text-sm sm:text-base">
                      {m.content ? (
                        <ReactMarkdown
                          components={{
                            ul:     ({ node, ...p }) => <ul className="list-disc list-inside space-y-1 my-2" {...p} />,
                            ol:     ({ node, ...p }) => <ol className="list-decimal list-inside space-y-1 my-2" {...p} />,
                            li:     ({ node, ...p }) => <li className="text-amber-100" {...p} />,
                            p:      ({ node, ...p }) => <p className="text-amber-100 mb-2 last:mb-0" {...p} />,
                            strong: ({ node, ...p }) => <strong className="text-amber-300 font-bold" {...p} />,
                            em:     ({ node, ...p }) => <em className="text-amber-200 italic" {...p} />,
                            code:   ({ node, ...p }) => <code className="bg-slate-800 text-amber-300 px-1 rounded text-xs sm:text-sm" {...p} />,
                            h1:     ({ node, ...p }) => <h1 className="text-amber-200 font-bold text-base sm:text-lg mb-2" {...p} />,
                            h2:     ({ node, ...p }) => <h2 className="text-amber-200 font-bold text-sm sm:text-base mb-2" {...p} />,
                            h3:     ({ node, ...p }) => <h3 className="text-amber-200 font-semibold mb-1" {...p} />,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      ) : (
                        <span className="inline-flex gap-1 text-amber-700">
                          <span className="animate-bounce [animation-delay:-0.3s]">●</span>
                          <span className="animate-bounce [animation-delay:-0.15s]">●</span>
                          <span className="animate-bounce">●</span>
                        </span>
                      )}
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

            {isProcessing && messages[messages.length - 1]?.role !== "agent" && (
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
            onClick={() => fileInputRef.current?.click()}
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

          {/* Mic button — real voice if supported, dimmed stub if not */}
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-lg shrink-0 transition-colors ${
              isRecording
                ? "bg-red-600/40 text-red-300 animate-pulse"
                : voiceSupported
                  ? "text-amber-400 hover:bg-amber-900/30"
                  : "text-amber-900 cursor-not-allowed"
            }`}
            title={
              !voiceSupported ? "Voice not supported in this browser"
              : isRecording    ? "Click to stop recording"
              :                  "Click to speak"
            }
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) sendMessage(input); }}
            className="
              flex-1 min-w-0
              bg-transparent border border-amber-900/30
              rounded-lg px-3 py-2
              text-white text-sm sm:text-base
              placeholder-amber-800
              outline-none focus:border-amber-600
              transition-colors
            "
            placeholder={isRecording ? "Listening…" : "Ask Sherlock…"}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={isProcessing || !input.trim()}
            className="
              bg-amber-600 hover:bg-amber-500
              disabled:opacity-40 disabled:cursor-not-allowed
              text-black px-3 sm:px-4 py-2 rounded-lg
              shrink-0 transition-colors
            "
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}