"use client";

import React, {
  useState, useRef, useEffect, useCallback, Dispatch, SetStateAction,
} from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Mic, MicOff, Brain, User, Loader2, Paperclip, Wrench, Volume2, VolumeX,
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

export interface DetectedEntities {
  suspects: string[];   // names detected as people
  entities: { label: string; kind: "location" | "object" | "person" | "event" | "other" }[];
}

interface ChatInterfaceProps {
  activeCase:                string | null;
  pendingMessage?:           string | null;
  onClearPendingMessage?:    () => void;
  onInvestigationsGenerated?: Dispatch<SetStateAction<string[]>>;
  onEntitiesDetected?:       (detected: DetectedEntities) => void;
  onFirstUpload?:            () => void;
  onFirstMessage?:           () => void;
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

// ─── NER (Named Entity Recognition) ──────────────────────────────────────────
// Lightweight client-side heuristic NER — no API, no ML model needed.

const KNOWN_LOCATIONS = new Set([
  "baker street", "scotland yard", "westminster", "london", "victoria",
  "whitechapel", "paddington", "oxford", "cambridge", "buckingham palace",
  "the thames", "trafalgar square", "downing street", "fleet street",
  "east india", "afghanistan", "watson", "moriarty",
]);

const TITLE_PREFIXES = [
  "mr", "mrs", "ms", "miss", "dr", "sir", "lord", "lady",
  "colonel", "colonel", "professor", "inspector", "sergeant",
  "captain", "major", "general", "agent", "detective",
];

function extractEntities(text: string): DetectedEntities {
  const suspects: string[] = [];
  const entities: DetectedEntities["entities"] = [];
  const seen = new Set<string>();

  // Strip markdown symbols
  const clean = text.replace(/[*_`#>\[\]()]/g, " ");

  // ── People: "Title Firstname Lastname" or two consecutive Title-Case words
  const titlePattern = new RegExp(
    `(?:${TITLE_PREFIXES.join("|")})\\.?\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = titlePattern.exec(clean)) !== null) {
    const name = m[1].trim();
    if (name.length > 2 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      suspects.push(name);
    }
  }

  // ── Two consecutive Capitalised words (likely proper nouns / person names)
  const properNounPattern = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g;
  while ((m = properNounPattern.exec(clean)) !== null) {
    const full = `${m[1]} ${m[2]}`;
    const lower = full.toLowerCase();
    if (!seen.has(lower) && !["The Game", "The Web", "Let Me"].includes(full)) {
      seen.add(lower);
      // Heuristic: if looks like a location keyword → location, else suspect
      if (KNOWN_LOCATIONS.has(m[1].toLowerCase()) || KNOWN_LOCATIONS.has(m[2].toLowerCase())) {
        entities.push({ label: full, kind: "location" });
      } else {
        suspects.push(full);
      }
    }
  }

  // ── Known locations (single word)
  KNOWN_LOCATIONS.forEach((loc) => {
    const regex = new RegExp(`\\b${loc}\\b`, "i");
    if (regex.test(clean) && !seen.has(loc)) {
      seen.add(loc);
      // Title-case it
      const label = loc.replace(/\b\w/g, (c) => c.toUpperCase());
      entities.push({ label, kind: "location" });
    }
  });

  // ── Date patterns  e.g. "January 15" / "15th March" / "1892"
  const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b1[6-9]\d{2}\b/g;
  while ((m = datePattern.exec(clean)) !== null) {
    const label = m[0].trim();
    if (!seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      entities.push({ label, kind: "event" });
    }
  }

  // Deduplicate: remove from suspects if already in entities
  const entityLabels = new Set(entities.map((e) => e.label.toLowerCase()));
  const filteredSuspects = suspects.filter((s) => !entityLabels.has(s.toLowerCase()));

  return {
    suspects: filteredSuspects.slice(0, 8),   // max 8 suspects per response
    entities: entities.slice(0, 10),          // max 10 entities per response
  };
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*>]+\s/gm, "")
    .replace(/\n{2,}/g, ". ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInterface({
  activeCase,
  pendingMessage,
  onClearPendingMessage,
  onInvestigationsGenerated,
  onEntitiesDetected,
  onFirstUpload,
  onFirstMessage,
}: ChatInterfaceProps) {
  const [mounted, setMounted]           = useState(false);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId]         = useState<string | null>(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // TTS state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [ttsSupported, setTtsSupported]   = useState(false);

  const scrollRef      = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const inputRef       = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Typewriter queue ─────────────────────────────────────────────────────
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
      const chars = typewriterQueue.current.splice(0, 2).join("");
      typewriterText.current += chars;
      const snapshot = typewriterText.current;
      setMessages(prev =>
        prev.map(m => m.id === typewriterMsgId.current ? { ...m, content: snapshot } : m)
      );
    }, 18);
  };

  const stopTypewriter = (activeCaseId: string) => {
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
        saveMessages(activeCaseId, updated);
        return updated;
      });
    }
    typewriterMsgId.current = null;
  };

  // ─── Mount ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
    setTtsSupported(!!window.speechSynthesis);

    return () => {
      abortControllerRef.current?.abort();
      if (typewriterTimer.current) clearInterval(typewriterTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── Load messages when case changes ────────────────────────────────────────

  useEffect(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);

    if (!activeCase) { setMessages([]); setThreadId(null); return; }

    const savedThread = localStorage.getItem(`thread_${activeCase}`);
    setThreadId(savedThread || null);

    const cached = loadMessages(activeCase);
    if (cached.length > 0) {
      setMessages(cached);
    } else if (savedThread) {
      setMessages([]);

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
          if (err.name !== "AbortError") setMessages([]);
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

  // ─── TTS ─────────────────────────────────────────────────────────────────────

  const speakMessage = useCallback((text: string, msgId: string) => {
    if (!ttsSupported) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.lang  = "en-GB";
    utterance.rate  = 0.88;
    utterance.pitch = 0.82;

    // Pick the best British male voice available
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const british = voices.find(v => v.lang === "en-GB" && /daniel|george|male/i.test(v.name))
        ?? voices.find(v => v.lang === "en-GB")
        ?? voices.find(v => v.lang.startsWith("en"))
        ?? voices[0];
      if (british) utterance.voice = british;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      pickVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    utterance.onend   = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMsgId, ttsSupported]);

  // ─── SSE streaming send ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing || !activeCase) return;
    setInput("");
    inputRef.current?.blur();

    // Fire onboarding callback on first message
    onFirstMessage?.();

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user",
      content: text.trim(), type: "text",
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => {
      const updated = [...prev, userMsg];
      saveMessages(activeCase, updated);
      return updated;
    });
    setIsProcessing(true);

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

      const newThread = res.headers.get("X-Thread-Id");
      if (newThread) {
        setThreadId(newThread);
        localStorage.setItem(`thread_${activeCase}`, newThread);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

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
              typewriterQueue.current.push(...event.content.split(""));
            } else if (event.type === "tool") {
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, tool: `🔍 ${event.name.replace(/_/g, " ")}` } : m
                )
              );
            } else if (event.type === "tool_result") {
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
              setMessages(prev =>
                prev.map(m =>
                  m.id === agentId ? { ...m, tool: undefined } : m
                )
              );
            }
          } catch {}
        }
      }

      await new Promise<void>(resolve => {
        const checkDone = setInterval(() => {
          if (typewriterQueue.current.length === 0) {
            clearInterval(checkDone);
            resolve();
          }
        }, 20);
      });
      stopTypewriter(activeCase);

      // ── NER: extract entities from final agent response ──────────────────
      setMessages(prev => {
        const finalMsg = prev.find(m => m.id === agentId);
        if (finalMsg?.content && onEntitiesDetected) {
          const detected = extractEntities(finalMsg.content);
          if (detected.suspects.length > 0 || detected.entities.length > 0) {
            // Defer to avoid state update during render
            setTimeout(() => onEntitiesDetected(detected), 0);
          }
        }
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
          // NER on fallback too
          if (onEntitiesDetected) {
            const detected = extractEntities(fallbackContent);
            if (detected.suspects.length > 0 || detected.entities.length > 0) {
              setTimeout(() => onEntitiesDetected(detected), 0);
            }
          }
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
  }, [activeCase, threadId, isProcessing, onEntitiesDetected, onFirstMessage]);

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
      setInput(prev => {
        if (prev.trim()) setTimeout(() => inputRef.current?.focus(), 50);
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

    // Fire onboarding callback on first upload
    onFirstUpload?.();

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

                  {/* Footer row: timestamp + TTS button */}
                  {mounted && (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-xs text-amber-700">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </p>

                      {/* TTS button — only on completed agent messages */}
                      {m.role === "agent" && m.content && ttsSupported && (
                        <button
                          onClick={() => speakMessage(m.content, m.id)}
                          title={speakingMsgId === m.id ? "Stop speaking" : "Read aloud (British voice)"}
                          className={`p-1 rounded-md transition-all duration-200 ${
                            speakingMsgId === m.id
                              ? "text-amber-400 bg-amber-900/40 animate-pulse"
                              : "text-amber-800 hover:text-amber-500 hover:bg-amber-900/30"
                          }`}
                        >
                          {speakingMsgId === m.id
                            ? <VolumeX className="w-3 h-3" />
                            : <Volume2 className="w-3 h-3" />
                          }
                        </button>
                      )}
                    </div>
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
            title="Upload document (PDF, DOCX, TXT)"
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

          {/* Mic button */}
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