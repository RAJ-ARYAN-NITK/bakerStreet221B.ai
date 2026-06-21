/**
 * lib/exportCase.ts — Feature 6: Case Export
 *
 * Two export formats:
 *   exportAsMarkdown(data) — instant, client-side Blob download
 *   exportAsPDF(data)      — jsPDF text-based PDF (no screenshot/html2canvas)
 *
 * The PDF is clean, structured text — not a page screenshot.
 * Both formats include: case header, all messages, suspects, entities, pills.
 */

import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportMessage {
  role:      "user" | "agent";
  content:   string;
  timestamp: string;
}

export interface ExportSuspect {
  name:   string;
  threat: string;
}

export interface ExportEntity {
  label: string;
  kind:  string;
}

export interface CaseExportData {
  caseName?:      string;
  caseId?:        string;
  messages:       ExportMessage[];
  suspects:       ExportSuspect[];
  entities:       ExportEntity[];
  investigations: string[];
}

// ─── Markdown Export ──────────────────────────────────────────────────────────

export function exportAsMarkdown(data: CaseExportData): void {
  const name = data.caseName || "Investigation";
  const ts   = new Date().toLocaleString();

  const lines: string[] = [
    `# 🔍 Case Investigation: ${name}`,
    ``,
    `> Exported from BakerStreet221B.ai · ${ts}`,
    ``,
    `---`,
    ``,
  ];

  // Investigation pills
  if (data.investigations.length > 0) {
    lines.push(`## 💡 Investigation Questions`);
    data.investigations.forEach((q) => lines.push(`- ${q}`));
    lines.push(``);
  }

  // Suspects
  if (data.suspects.length > 0) {
    lines.push(`## 🎯 Suspects`);
    lines.push(`| Name | Risk |`);
    lines.push(`|------|------|`);
    data.suspects.forEach((s) =>
      lines.push(`| ${s.name} | ${s.threat} |`)
    );
    lines.push(``);
  }

  // Entities
  if (data.entities.length > 0) {
    lines.push(`## 🗂️ Entities`);
    lines.push(`| Label | Type |`);
    lines.push(`|-------|------|`);
    data.entities.forEach((e) =>
      lines.push(`| ${e.label} | ${e.kind} |`)
    );
    lines.push(``);
  }

  // Conversation transcript
  lines.push(`## 💬 Conversation Transcript`);
  lines.push(``);

  data.messages.forEach((m) => {
    const role = m.role === "user" ? "👤 **You**" : "🔍 **Sherlock**";
    const time = new Date(m.timestamp).toLocaleTimeString();
    lines.push(`### ${role} · ${time}`);
    lines.push(``);
    lines.push(m.content);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });

  const content = lines.join("\n");
  const blob    = new Blob([content], { type: "text/markdown; charset=utf-8" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = `sherlock-case-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function exportAsPDF(data: CaseExportData): void {
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = 190; // usable width (A4 210 − 2×10mm margin)
  const MARGIN = 10;
  let y      = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const checkY = (needed: number) => {
    if (y + needed > 280) addPage();
  };

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setTextColor(180, 120, 20); // amber
  doc.text(`Case Investigation`, MARGIN, y);
  y += 9;

  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(data.caseName || "Untitled Case", MARGIN, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Exported ${new Date().toLocaleString()} · BakerStreet221B.ai`,
    MARGIN,
    y
  );
  y += 10;

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(180, 120, 20);
  doc.line(MARGIN, y, MARGIN + W, y);
  y += 8;

  // ── Investigation Questions ──────────────────────────────────────────────
  if (data.investigations.length > 0) {
    checkY(20);
    doc.setFontSize(13);
    doc.setTextColor(180, 120, 20);
    doc.text("Investigation Questions", MARGIN, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    data.investigations.forEach((q) => {
      const lines = doc.splitTextToSize(`• ${q}`, W);
      checkY(lines.length * 5 + 2);
      doc.text(lines, MARGIN, y);
      y += lines.length * 5 + 1;
    });
    y += 5;
  }

  // ── Suspects ─────────────────────────────────────────────────────────────
  if (data.suspects.length > 0) {
    checkY(20);
    doc.setFontSize(13);
    doc.setTextColor(180, 120, 20);
    doc.text("Suspects", MARGIN, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    data.suspects.forEach((s) => {
      checkY(6);
      doc.text(`• ${s.name}  [${s.threat} risk]`, MARGIN, y);
      y += 5;
    });
    y += 5;
  }

  // ── Entities ─────────────────────────────────────────────────────────────
  if (data.entities.length > 0) {
    checkY(20);
    doc.setFontSize(13);
    doc.setTextColor(180, 120, 20);
    doc.text("Entities", MARGIN, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    data.entities.forEach((e) => {
      checkY(6);
      doc.text(`• ${e.label}  (${e.kind})`, MARGIN, y);
      y += 5;
    });
    y += 5;
  }

  // ── Conversation ─────────────────────────────────────────────────────────
  checkY(20);
  doc.setFontSize(13);
  doc.setTextColor(180, 120, 20);
  doc.text("Conversation Transcript", MARGIN, y);
  y += 8;

  data.messages.forEach((m) => {
    const prefix  = m.role === "user" ? "You" : "Sherlock";
    const time    = new Date(m.timestamp).toLocaleTimeString();
    const heading = `${prefix}  ·  ${time}`;

    // Role heading
    checkY(10);
    doc.setFontSize(10);
    doc.setTextColor(m.role === "user" ? 120 : 180, m.role === "user" ? 80 : 120, 20);
    doc.text(heading, MARGIN, y);
    y += 6;

    // Strip markdown before PDF output
    const plain = m.content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^\s*[-*>]+\s/gm, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(plain, W);
    checkY(lines.length * 4.5 + 6);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.5 + 6;

    // Thin separator
    doc.setDrawColor(220, 200, 170);
    doc.line(MARGIN, y - 2, MARGIN + W, y - 2);
    y += 2;
  });

  doc.save(`sherlock-case-${Date.now()}.pdf`);
}
