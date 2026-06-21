"use client";

/**
 * AuthModal.tsx — Feature 7: Optional Sign-In
 *
 * Shows a glassmorphic login/register dialog.
 * Auth is OPTIONAL — users can dismiss and continue as guest.
 * On successful login/register the JWT is stored via setToken().
 */

import React, { useState, useCallback } from "react";
import { LogIn, UserPlus, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { BACKEND_URL, setToken } from "@/lib/api";

interface AuthModalProps {
  onSuccess: (email: string) => void;
}

type Tab = "login" | "register";

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [tab, setTab]           = useState<Tab>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
        const res = await fetch(`${BACKEND_URL}${endpoint}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: email.trim(), password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "Something went wrong. Please try again.");
          return;
        }

        setToken(data.access_token);
        localStorage.setItem('sherlock_email', data.email);
        onSuccess(data.email);
      } catch {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    },
    [tab, email, password, onSuccess]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800/60 bg-slate-900/95 shadow-2xl shadow-slate-950/50 p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3">
            <Shield className="w-7 h-7 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">BakerStreet221B.ai</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your investigation dashboard
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border border-slate-800/60 rounded-lg overflow-hidden mb-6">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-slate-800/80 text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="watson@bakerstreet.co.uk"
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 6 characters"
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === "login" ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading
              ? "Please wait…"
              : tab === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
