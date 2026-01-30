"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Brain, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  type: "text" | "analysis";
  timestamp: Date;
}

interface ChatInterfaceProps {
  activeCase: string | null;
}

const BACKEND_URL = "http://localhost:8000";

export function ChatInterface({ activeCase }: ChatInterfaceProps) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---------------- Hydration-safe init ---------------- */
  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "agent",
        content: "Good evening. I am Sherlock Holmes. Present your mystery.",
        type: "text",
        timestamp: new Date(),
      },
    ]);
  }, []);

  /* ---------------- ChatGPT-style auto scroll ---------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  /* ---------------- SEND MESSAGE ---------------- */
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        type: "text",
        timestamp: new Date(),
      },
    ]);

    setIsProcessing(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          thread_id: threadId,
          case_id: activeCase,
        }),
      });

      const data = await res.json();
      if (data.thread_id) setThreadId(data.thread_id);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: data.response ?? "I deduce nothing of value.",
          type: "analysis",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: "My connection to the mind palace is severed.",
          type: "text",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-full min-h-0 bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50">
      <CardHeader className="border-b border-amber-900/30">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" />
          Detective Analysis Chamber
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {/* ---------------- Messages ---------------- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-6"
        >
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {m.role === "agent" && (
                  <Brain className="mr-3 mt-1 w-6 h-6 text-amber-500" />
                )}

                <div className="max-w-[75%] rounded-lg bg-slate-900/80 border border-amber-900/30 p-4">
                  {m.type === "analysis" && (
                    <Badge className="mb-2">Analysis</Badge>
                  )}
                  <p className="text-amber-100 whitespace-pre-wrap">
                    {m.content}
                  </p>
                  {mounted && (
                    <p className="mt-2 text-xs text-amber-700">
                      {m.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {m.role === "user" && (
                  <User className="ml-3 mt-1 w-6 h-6 text-slate-300" />
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-amber-300">
                <Loader2 className="animate-spin" />
                Sherlock is deducing…
              </div>
            )}
          </div>
        </div>

        {/* ---------------- INPUT BAR (FIXED) ---------------- */}
        {/* Input Bar */}
        <div className="border-t border-amber-900/30 bg-transparent px-4 py-3">
          <div className="mx-auto max-w-3xl flex items-center gap-3">

            {/* Mic Button */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-amber-400 hover:bg-amber-900/30 transition"
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Textarea ONLY (no blue container) */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Present your clues, Watson…"
              rows={1}
              className="
        flex-1 resize-none
        bg-transparent
        text-white
        placeholder:text-slate-400
        focus:outline-none
        leading-6
        py-2
      "
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isProcessing}
            />

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
              className="
        flex h-9 w-9 items-center justify-center
        rounded-md
        bg-amber-600
        text-black
        hover:bg-amber-500
        disabled:opacity-50
        transition
      "
            >
              <Send size={18} />
            </button>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}