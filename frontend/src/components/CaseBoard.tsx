'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AudioLines, Image, MapPin, Users, Clock } from 'lucide-react';

interface Clue {
  id: string;
  type: 'text' | 'audio' | 'image';
  content: string;
  timestamp: string;
  location?: string;
}

interface CaseBoardProps {
  activeCase: string | null;
  onCaseSelect: (caseId: string) => void;
}

export function CaseBoard({ activeCase, onCaseSelect }: CaseBoardProps) {
  const [clues, setClues] = useState<Clue[]>([
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

  const getClueIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'audio':
        return <AudioLines className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'bg-red-900/50 text-red-300 border-red-700';
      case 'medium':
        return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'low':
        return 'bg-green-900/50 text-green-300 border-green-700';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Case Status Card */}
      <Card className="bg-linear-to-br from-amber-950/40 to-slate-900/40 border-amber-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Case File #42
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-amber-700">Current Investigation</p>
              <p className="text-amber-200">The Hound of Baskerville Mystery</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-amber-300">Opened: January 1, 2026</span>
            </div>
            <Badge className="bg-amber-900/50 text-amber-300 border-amber-700">
              Active Investigation
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Clues and Suspects Tabs */}
      <Card className="bg-linear-to-br from-amber-950/40 to-slate-900/40 border-amber-900/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs defaultValue="clues" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-slate-900/50 border-b border-amber-900/30">
              <TabsTrigger value="clues" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-100">
                Evidence
              </TabsTrigger>
              <TabsTrigger value="suspects" className="data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-100">
                Suspects
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clues" className="p-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {clues.map((clue) => (
                    <div
                      key={clue.id}
                      className="p-3 bg-slate-900/50 border border-amber-900/30 rounded-lg hover:border-amber-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-amber-500">
                          {getClueIcon(clue.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm text-amber-100">{clue.content}</p>
                          <div className="flex items-center gap-3 text-xs text-amber-700">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {clue.timestamp}
                            </span>
                            {clue.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {clue.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="suspects" className="p-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {suspects.map((suspect, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/50 border border-amber-900/30 rounded-lg hover:border-amber-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-amber-500 mt-1" />
                          <div className="space-y-1">
                            <p className="text-amber-100">{suspect.name}</p>
                            <p className="text-xs text-amber-700">Alibi: {suspect.alibi}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(suspect.status)}>
                          {suspect.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}