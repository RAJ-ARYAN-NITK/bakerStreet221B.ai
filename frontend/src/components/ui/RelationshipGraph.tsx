"use client";

/**
 * RelationshipGraph.tsx — Feature 5: Suspect Relationship Graph
 *
 * A custom SVG force-directed graph with no external graph library.
 * Physics engine is hand-rolled (repulsion + spring forces + gravity + damping).
 * Uses React refs for the simulation state to avoid expensive re-renders.
 *
 * Node types:
 *   suspect  → amber  #f59e0b
 *   location → blue   #3b82f6
 *   event    → purple #a855f7
 *   other    → slate  #64748b
 *
 * Edges are drawn with thickness proportional to co-occurrence weight.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id:   string;
  name: string;
  type: "suspect" | "location" | "event" | "other";
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 360;
const H = 260;

const NODE_COLORS: Record<GraphNode["type"], string> = {
  suspect:  "#f59e0b",
  location: "#3b82f6",
  event:    "#a855f7",
  other:    "#64748b",
};

const REPULSION   = 4000;
const SPRING_LEN  = 110;
const SPRING_K    = 0.035;
const GRAVITY     = 0.009;
const DAMPING     = 0.87;
const TICK_MS     = 20; // ~50 fps

// ─── Component ────────────────────────────────────────────────────────────────

export function RelationshipGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  // Simulation runs entirely in refs — no setState per tick avoids 50 re-renders/sec
  const simRef   = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // We only setState every Nth tick to batch SVG updates
  const [renderNodes, setRenderNodes] = useState<SimNode[]>([]);
  const [hovered, setHovered]         = useState<string | null>(null);
  const tickCount = useRef(0);

  // Keep edges ref in sync
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Initialise new nodes when the `nodes` prop changes (new entities detected)
  useEffect(() => {
    const current = simRef.current;
    const next: SimNode[] = nodes.map((n, i) => {
      const existing = current.find((s) => s.id === n.id);
      if (existing) return existing;
      // Place new node on a circle so it doesn't spawn at 0,0
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI;
      const r     = 70 + Math.random() * 50;
      return {
        ...n,
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      };
    });
    simRef.current = next;
    setRenderNodes([...next]);
  }, [nodes]);

  // Physics simulation loop — runs independently of React render cycle
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const ns = simRef.current;
      if (ns.length === 0) return;

      // 1. Repulsion: every pair of nodes pushes apart
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x || 0.01;
          const dy = ns[j].y - ns[i].y || 0.01;
          const d2 = dx * dx + dy * dy;
          const d  = Math.sqrt(d2) || 0.01;
          const f  = REPULSION / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // 2. Spring forces: connected nodes attract toward SPRING_LEN distance
      for (const e of edgesRef.current) {
        const src = ns.find((n) => n.id === e.source);
        const tgt = ns.find((n) => n.id === e.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const stretch = d - SPRING_LEN;
        const k  = SPRING_K * Math.min(e.weight, 4);
        const fx = (dx / d) * stretch * k;
        const fy = (dy / d) * stretch * k;
        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      }

      // 3. Gravity: pull toward canvas centre
      for (const n of ns) {
        n.vx += (W / 2 - n.x) * GRAVITY;
        n.vy += (H / 2 - n.y) * GRAVITY;
        // Damping
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        // Integrate
        n.x = Math.max(22, Math.min(W - 22, n.x + n.vx));
        n.y = Math.max(22, Math.min(H - 22, n.y + n.vy));
      }

      // Re-render every 2 ticks (~25fps) to save React work
      tickCount.current++;
      if (tickCount.current % 2 === 0) {
        setRenderNodes([...ns]);
      }
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // Empty deps — one-time setup; edgesRef keeps edges current

  // ─── Empty state ────────────────────────────────────────────────────────────

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-2 text-amber-800 text-xs text-center">
        <span className="text-3xl">🕸️</span>
        <p>Chat with Sherlock to build the entity graph.</p>
        <p className="text-amber-900">
          Suspects, locations, and events detected in responses appear here as nodes.
        </p>
      </div>
    );
  }

  const nodeMap = new Map(renderNodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-2">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="rounded-lg border border-amber-900/20 bg-slate-950/60"
      >
        {/* ── Edges ── */}
        <g>
          {edges.map((e, i) => {
            const src = nodeMap.get(e.source);
            const tgt = nodeMap.get(e.target);
            if (!src || !tgt) return null;
            return (
              <line
                key={i}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="rgba(245,158,11,0.25)"
                strokeWidth={Math.min(e.weight * 0.8 + 0.5, 3.5)}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* ── Nodes ── */}
        <g>
          {renderNodes.map((n) => {
            const isHov = hovered === n.id;
            const r     = isHov ? 13 : 9;
            const color = NODE_COLORS[n.type];
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow on hover */}
                {isHov && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={18}
                    fill={color}
                    opacity={0.15}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={color}
                  opacity={0.85}
                  style={{ transition: "r 0.12s ease" }}
                />
                {/* Node label */}
                <text
                  x={n.x}
                  y={n.y + r + 10}
                  textAnchor="middle"
                  fontSize={isHov ? 10 : 8}
                  fill={isHov ? "#fef3c7" : "#92400e"}
                  style={{ pointerEvents: "none", transition: "font-size 0.12s" }}
                >
                  {n.name.length > 14 ? n.name.slice(0, 13) + "…" : n.name}
                </text>
                {/* Type indicator on hover */}
                {isHov && (
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fontSize={7}
                    fill="#1c1917"
                    fontWeight="bold"
                    style={{ pointerEvents: "none" }}
                  >
                    {n.type[0].toUpperCase()}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 text-xs text-amber-800">
        {(Object.entries(NODE_COLORS) as [GraphNode["type"], string][]).map(
          ([type, color]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: color, opacity: 0.85 }}
              />
              {type}
            </span>
          )
        )}
        <span className="ml-auto text-amber-900">
          {nodes.length} nodes · {edges.length} edges
        </span>
      </div>
    </div>
  );
}
