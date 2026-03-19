'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AudioLines, Image, MapPin, Users, Clock } from 'lucide-react';

const BACKEND_URL = "http://localhost:8000"; // ⭐ NEW

interface Clue {
  id: string;
  type: 'text' | 'audio' | 'image';
  content: string;
  timestamp: string;
  location?: string;
}

interface CaseItem { // ⭐ NEW
  id: string;
  title: string;
  created_at: string;
}

interface CaseBoardProps {
  activeCase: string | null;
  onCaseSelect: (caseId: string) => void;
}

export function CaseBoard({ activeCase, onCaseSelect }: CaseBoardProps) {

  const [cases, setCases] = useState<CaseItem[]>([]); // ⭐ NEW

  const [clues] = useState<Clue[]>([
    {
      id: '1',
      type: 'text',
      content: 'Footprints found near the crime scene, size 11 boots',
      timestamp: '2 hours ago',
      location: 'Baker Street, London'
    },
    {
      id: '2',
      type: 'audio',
      content: 'Witness testimony recording - Mrs. Hudson',
      timestamp: '1 hour ago',
      location: '221B Baker Street'
    },
    {
      id: '3',
      type: 'text',
      content: 'Cigar ash analysis: rare Turkish tobacco',
      timestamp: '45 minutes ago',
      location: 'Scotland Yard Lab'
    }
  ]);

  const suspects = [
    { name: 'Professor Moriarty', status: 'high', alibi: 'Unverified' },
    { name: 'Colonel Moran', status: 'medium', alibi: 'Partial' },
    { name: 'Irene Adler', status: 'low', alibi: 'Confirmed' }
  ];

  // ⭐ NEW — fetch cases from backend
  const fetchCases = async () => {
    const res = await fetch(`${BACKEND_URL}/cases`);
    const data = await res.json();
    setCases(data);
  };

  // ⭐ NEW — create new case
  const createCase = async () => {
    const res = await fetch(`${BACKEND_URL}/cases/new`, { method: "POST" });
    const data = await res.json();

    onCaseSelect(data.case_id); // ⭐ CRITICAL FIX
    localStorage.setItem("active_case", data.case_id);

    fetchCases();
  };

  // ⭐ NEW — load cases + restore active case
  useEffect(() => {
    fetchCases();

    const saved = localStorage.getItem("active_case");
    if (saved) onCaseSelect(saved);
  }, []);

  const getClueIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'audio': return <AudioLines className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'medium': return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'low': return 'bg-green-900/50 text-green-300 border-green-700';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-4">

      {/* ⭐ NEW — CASE SELECTOR UI */}
      <Card className="bg-linear-to-br from-amber-950/40 to-slate-900/40 border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-amber-100">Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">

          <button
            onClick={createCase}
            className="w-full bg-amber-600 hover:bg-amber-500 text-black px-3 py-2 rounded-lg"
          >
            + New Case
          </button>

          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onCaseSelect(c.id); // ⭐ CRITICAL FIX
                localStorage.setItem("active_case", c.id);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg border ${
                activeCase === c.id
                  ? "bg-amber-900/40 border-amber-500"
                  : "border-amber-900/20 hover:bg-amber-900/20"
              }`}
            >
              {c.title}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ORIGINAL STATIC UI BELOW (unchanged) */}
      {/* -------------------------------------- */}

      <Card className="bg-linear-to-br from-amber-950/40 to-slate-900/40 border-amber-900/50">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Case Evidence
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="clues" className="w-full">

            <TabsList className="w-full grid grid-cols-2 bg-slate-900/50 border-b border-amber-900/30">
              <TabsTrigger value="clues">Evidence</TabsTrigger>
              <TabsTrigger value="suspects">Suspects</TabsTrigger>
            </TabsList>

            <TabsContent value="clues" className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {clues.map((clue) => (
                  <div key={clue.id} className="p-3 bg-slate-900/50 border border-amber-900/30 rounded-lg mb-2">
                    <div className="flex gap-3">
                      {getClueIcon(clue.type)}
                      <div>
                        <p className="text-sm text-amber-100">{clue.content}</p>
                        <p className="text-xs text-amber-700">{clue.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="suspects" className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                {suspects.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-900/50 border border-amber-900/30 rounded-lg mb-2 flex justify-between">
                    <span className="text-amber-100">{s.name}</span>
                    <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}