// "use client";

// import { useState, useRef, useEffect } from "react";
// import { Send, Mic, Sparkles } from "lucide-react"; // Ensure lucide-react is installed

// export default function ChatInterface() {
//   const [messages, setMessages] = useState<any[]>([
//     { role: "assistant", content: "The game is afoot. State your mystery." }
//   ]);
//   const [input, setInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   // NEW: State to hold the session ID
//   const [threadId, setThreadId] = useState<string | null>(null);

//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   useEffect(() => scrollToBottom(), [messages]);

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     const userMsg = { role: "user", content: input };
//     setMessages((prev) => [...prev, userMsg]);
//     setInput("");
//     setIsLoading(true);

//     try {
//       // Ensure we use absolute URL with fallback
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000";
//       const baseUrl = apiUrl.startsWith("http") ? apiUrl : `http://${apiUrl}`;
//       const fullUrl = `${baseUrl.replace(/\/$/, "")}/chat`;

//       const response = await fetch(fullUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ 
//             message: input,
//             thread_id: threadId // <--- SEND THE ID
//         }),
//       });

//       const data = await response.json();

//       // <--- SAVE THE ID (Sherlock gave us a case number)
//       if (data.thread_id) {
//           setThreadId(data.thread_id);
//       }

//       const botMsg = { role: "assistant", content: data.response };
//       setMessages((prev) => [...prev, botMsg]);

//     } catch (error) {
//       console.error(error);
//       setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to server." }]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-[80vh] w-full max-w-4xl mx-auto border border-gray-700 rounded-xl bg-gray-900 overflow-hidden shadow-2xl">
//       {/* Messages Area */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-4">
//         {messages.map((msg, index) => (
//           <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
//             <div className={`max-w-[80%] p-4 rounded-lg ${
//                 msg.role === "user" ? "bg-amber-700 text-white" : "bg-gray-800 text-gray-200 border border-gray-700"
//             }`}>
//               {msg.content}
//             </div>
//           </div>
//         ))}
//         {isLoading && <div className="text-amber-500 animate-pulse flex items-center gap-2"><Sparkles size={16}/> Sherlock is thinking...</div>}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input Area */}
//       <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2">
//         <input
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//           placeholder="Type your message..."
//           className="flex-1 bg-gray-900 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-amber-500"
//         />
//         <button onClick={sendMessage} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg transition">
//           <Send size={20} />
//         </button>
//       </div>
//     </div>
//   );
// }

// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { Badge } from '@/components/ui/badge';
// import { Send, Mic, MicOff, Paperclip, Brain, User, Volume2, Loader2 } from 'lucide-react';

// interface Message {
//   id: string;
//   role: 'user' | 'agent';
//   content: string;
//   type: 'text' | 'audio' | 'analysis';
//   timestamp: Date;
//   audioUrl?: string;
// }

// interface ChatInterfaceProps {
//   activeCase: string | null;
// }

// export function ChatInterface({ activeCase }: ChatInterfaceProps) {
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: '1',
//       role: 'agent',
//       content: 'Good evening. I am Sherlock, your multimodal detective agent. I see we have a most intriguing case at hand - The Hound of Baskerville Mystery. Please present your clues, whether in text or audio format, and I shall apply my powers of deduction to unravel this enigma.',
//       type: 'text',
//       timestamp: new Date(Date.now() - 300000)
//     }
//   ]);
//   const [input, setInput] = useState('');
//   const [isRecording, setIsRecording] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [messages]);

//   const handleSendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage: Message = {
//       id: Date.now().toString(),
//       role: 'user',
//       content: input,
//       type: 'text',
//       timestamp: new Date()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInput('');
//     setIsProcessing(true);

//     // Simulate agent processing
//     setTimeout(() => {
//       const agentResponse: Message = {
//         id: (Date.now() + 1).toString(),
//         role: 'agent',
//         content: `Fascinating. Let me analyze this clue using my ReAct reasoning framework...\n\n**Observation:** ${input}\n\n**Thought:** This detail is particularly illuminating. Cross-referencing with known patterns in the case file...\n\n**Action:** I shall investigate the correlation between this evidence and the suspect timeline.\n\n**Reflection:** The probability of this being coincidental is exceedingly low. I deduce this points to a deliberate pattern of behavior.`,
//         type: 'analysis',
//         timestamp: new Date()
//       };
//       setMessages(prev => [...prev, agentResponse]);
//       setIsProcessing(false);
//     }, 2000);
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   const toggleRecording = () => {
//     if (!isRecording) {
//       // Start recording
//       setIsRecording(true);
//       // In a real implementation, you would start audio recording here
//     } else {
//       // Stop recording
//       setIsRecording(false);
//       setIsProcessing(true);

//       // Simulate audio processing
//       setTimeout(() => {
//         const audioMessage: Message = {
//           id: Date.now().toString(),
//           role: 'user',
//           content: '[Audio Clue Uploaded]',
//           type: 'audio',
//           timestamp: new Date(),
//           audioUrl: 'mock-audio-url'
//         };
//         setMessages(prev => [...prev, audioMessage]);

//         setTimeout(() => {
//           const agentResponse: Message = {
//             id: (Date.now() + 1).toString(),
//             role: 'agent',
//             content: `Excellent. I have analyzed your audio recording. My multimodal processing capabilities have extracted the following:\n\n**Audio Analysis:**\n• Voice pattern suggests emotional distress\n• Background noise indicates urban environment\n• Timestamp correlates with incident window\n\n**Deduction:** This testimony provides a crucial alibi verification. The witness account is consistent with physical evidence found at the scene.`,
//             type: 'analysis',
//             timestamp: new Date()
//           };
//           setMessages(prev => [...prev, agentResponse]);
//           setIsProcessing(false);
//         }, 2500);
//       }, 1000);
//     }
//   };

//   return (
//     <Card className="bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50 backdrop-blur-sm h-[calc(100vh-200px)] flex flex-col">
//       <CardHeader className="border-b border-amber-900/30">
//         <CardTitle className="text-amber-100 flex items-center gap-2">
//           <Brain className="w-5 h-5 text-amber-500" />
//           Detective Analysis Chamber
//         </CardTitle>
//         <p className="text-sm text-amber-700">ReAct Reasoning Engine Active</p>
//       </CardHeader>

//       <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
//         {/* Messages Area */}
//         <ScrollArea className="flex-1 p-6">
//           <div ref={scrollRef} className="space-y-4">
//             {messages.map((message) => (
//               <div
//                 key={message.id}
//                 className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
//               >
//                 {message.role === 'agent' && (
//                   <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-600 to-amber-800 flex items-center justify-center shrink-0 mt-1">
//                     <Brain className="w-4 h-4 text-amber-100" />
//                   </div>
//                 )}

//                 <div
//                   className={`max-w-[80%] rounded-lg p-4 ${
//                     message.role === 'user'
//                       ? 'bg-slate-800/80 border border-slate-700'
//                       : message.type === 'analysis'
//                       ? 'bg-linear-to-br from-amber-950/60 to-slate-900/60 border border-amber-800/50'
//                       : 'bg-slate-900/80 border border-amber-900/30'
//                   }`}
//                 >
//                   {message.type === 'audio' && (
//                     <div className="flex items-center gap-2 mb-2">
//                       <Volume2 className="w-4 h-4 text-amber-500" />
//                       <Badge variant="outline" className="text-xs border-amber-700 text-amber-300">
//                         Audio Clue
//                       </Badge>
//                     </div>
//                   )}

//                   {message.type === 'analysis' && (
//                     <div className="flex items-center gap-2 mb-3">
//                       <Brain className="w-4 h-4 text-amber-500" />
//                       <Badge variant="outline" className="text-xs border-amber-700 text-amber-300">
//                         ReAct Analysis
//                       </Badge>
//                     </div>
//                   )}

//                   <p className="text-amber-100 whitespace-pre-wrap leading-relaxed">
//                     {message.content}
//                   </p>

//                   <p className="text-xs text-amber-700 mt-2">
//                     {message.timestamp.toLocaleTimeString()}
//                   </p>
//                 </div>

//                 {message.role === 'user' && (
//                   <div className="w-8 h-8 rounded-full bg-linear-to-br from-slate-700 to-slate-800 flex items-center justify-center shrink-0 mt-1">
//                     <User className="w-4 h-4 text-slate-300" />
//                   </div>
//                 )}
//               </div>
//             ))}

//             {isProcessing && (
//               <div className="flex gap-3 justify-start">
//                 <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-600 to-amber-800 flex items-center justify-center shrink-0">
//                   <Brain className="w-4 h-4 text-amber-100" />
//                 </div>
//                 <div className="bg-slate-900/80 border border-amber-900/30 rounded-lg p-4">
//                   <div className="flex items-center gap-2">
//                     <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
//                     <span className="text-amber-300 text-sm">Analyzing clues...</span>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </ScrollArea>

//         {/* Input Area */}
//         <div className="border-t border-amber-900/30 p-4 bg-slate-900/40">
//           <div className="space-y-3">
//             {/* Recording Indicator */}
//             {isRecording && (
//               <div className="flex items-center gap-2 text-red-400 animate-pulse">
//                 <div className="w-2 h-2 bg-red-500 rounded-full" />
//                 <span className="text-sm">Recording audio clue...</span>
//               </div>
//             )}

//             <div className="flex gap-2">
//               <Textarea
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={handleKeyPress}
//                 placeholder="Present your clues here, Watson... (text or attach audio evidence)"
//                 className="flex-1 bg-slate-900/60 border-amber-900/30 text-amber-100 placeholder:text-amber-800 resize-none min-h-[60px]"
//                 disabled={isRecording || isProcessing}
//               />
//             </div>

//             <div className="flex items-center justify-between gap-2">
//               <div className="flex gap-2">
//                 <Button
//                   variant="outline"
//                   size="icon"
//                   onClick={toggleRecording}
//                   className={`border-amber-900/50 ${
//                     isRecording
//                       ? 'bg-red-900/50 hover:bg-red-900/70 text-red-300'
//                       : 'bg-slate-900/50 hover:bg-slate-800/50 text-amber-400'
//                   }`}
//                 >
//                   {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
//                 </Button>

//                 <Button
//                   variant="outline"
//                   size="icon"
//                   className="bg-slate-900/50 border-amber-900/50 hover:bg-slate-800/50 text-amber-400"
//                 >
//                   <Paperclip className="w-4 h-4" />
//                 </Button>
//               </div>

//               <Button
//                 onClick={handleSendMessage}
//                 disabled={!input.trim() || isProcessing}
//                 className="bg-linear-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-100"
//               >
//                 <Send className="w-4 h-4 mr-2" />
//                 Send
//               </Button>
//             </div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// "use client";


// import React, { useState, useRef, useEffect } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import {
//   Send,
//   Mic,
//   MicOff,
//   Paperclip,
//   Brain,
//   User,
//   Volume2,
//   Loader2,
// } from "lucide-react";

// interface Message {
//   id: string;
//   role: "user" | "agent";
//   content: string;
//   type: "text" | "audio" | "analysis";
//   timestamp: Date;
//   audioUrl?: string;
// }

// interface ChatInterfaceProps {
//   activeCase: string | null;
// }

// const BACKEND_URL = "http://localhost:8000";

// export function ChatInterface({ activeCase }: ChatInterfaceProps) {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);




//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: crypto.randomUUID(),
//       role: "agent",
//       content:
//         "Good evening. I am Sherlock Holmes. Present your mystery.",
//       type: "text",
//       timestamp: new Date(),
//     },
//   ]);

//   const [input, setInput] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [threadId, setThreadId] = useState<string | null>(null);
//   const [isRecording, setIsRecording] = useState(false);

//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     scrollRef.current?.scrollTo({
//       top: scrollRef.current.scrollHeight,
//       behavior: "smooth",
//     });
//   }, [messages]);

//   /* -------------------- SEND MESSAGE -------------------- */
//   const handleSendMessage = async () => {
//     if (!input.trim()) return;

//     const userText = input.trim();

//     const userMessage: Message = {
//       id: crypto.randomUUID(),
//       role: "user",
//       content: userText,
//       type: "text",
//       timestamp: new Date(),
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setIsProcessing(true);

//     try {
//       const response = await fetch(`${BACKEND_URL}/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           message: userText,
//           thread_id: threadId,
//           case_id: activeCase,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`Backend error ${response.status}`);
//       }

//       const data = await response.json();

//       if (data.thread_id) {
//         setThreadId(data.thread_id);
//       }

//       const agentMessage: Message = {
//         id: crypto.randomUUID(),
//         role: "agent",
//         content:
//           data.response ||
//           data.reply ||
//           "I deduce nothing of value.",
//         type: data.type ?? "analysis",
//         timestamp: new Date(),
//       };

//       setMessages((prev) => [...prev, agentMessage]);
//     } catch (err) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: crypto.randomUUID(),
//           role: "agent",
//           content:
//             "My connection to the mind palace is severed. Verify the backend.",
//           type: "text",
//           timestamp: new Date(),
//         },
//       ]);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   const toggleRecording = () => {
//     setIsRecording((prev) => !prev);
//   };

//   /* -------------------- UI -------------------- */
//   return (
//     <Card className="bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50 flex flex-col h-full min-h-[75vh]">
//       <CardHeader className="border-b border-amber-900/30">
//         <CardTitle className="text-amber-100 flex items-center gap-2">
//           <Brain className="w-5 h-5 text-amber-500" />
//           Detective Analysis Chamber
//         </CardTitle>
//       </CardHeader>

//       <CardContent className="flex-1 p-0 overflow-hidden">
//         <ScrollArea className="flex-1 p-6">
//           <div ref={scrollRef} className="space-y-4">
//             {messages.map((message) => (
//               <div
//                 key={message.id}
//                 className={`flex gap-3 ${
//                   message.role === "user"
//                     ? "justify-end"
//                     : "justify-start"
//                 }`}
//               >
//                 {message.role === "agent" && (
//                   <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center">
//                     <Brain className="w-4 h-4 text-white" />
//                   </div>
//                 )}

//                 <div className="max-w-[80%] rounded-lg p-4 bg-slate-900/80 border border-amber-900/30">
//                   {message.type === "analysis" && (
//                     <Badge className="mb-2">Analysis</Badge>
//                   )}
//                   <p className="whitespace-pre-wrap text-amber-100">
//                     {message.content}
//                   </p>
//                   {mounted && (<p className="text-xs text-amber-700 mt-2">
//                     {message.timestamp.toLocaleTimeString()}
//                   </p> )}
//                 </div>

//                 {message.role === "user" && (
//                   <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
//                     <User className="w-4 h-4 text-white" />
//                   </div>
//                 )}
//               </div>
//             ))}

//             {isProcessing && (
//               <div className="flex gap-3">
//                 <Loader2 className="animate-spin text-amber-500" />
//                 <span className="text-amber-300">
//                   Sherlock is deducing…
//                 </span>
//               </div>
//             )}
//           </div>
//         </ScrollArea>

//         <div className="border-t border-amber-900/30 p-4">
//           <Textarea
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={handleKeyPress}
//             placeholder="Present your clues, Watson…"
//             disabled={isProcessing || isRecording}
//           />

//           <div className="flex justify-between mt-2">
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={toggleRecording}
//             >
//               {isRecording ? <MicOff /> : <Mic />}
//             </Button>

//             <Button
//               onClick={handleSendMessage}
//               disabled={isProcessing || !input.trim()}
//             >
//               <Send className="mr-2 w-4 h-4" />
//               Send
//             </Button>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
// import { Send, Mic, MicOff, Brain, User, Loader2 } from "lucide-react";

// interface Message {
//   id: string;
//   role: "user" | "agent";
//   content: string;
//   type: "text" | "analysis";
//   timestamp: Date;
// }

// interface ChatInterfaceProps {
//   activeCase: string | null;
// }

// const BACKEND_URL = "http://localhost:8000";

// export function ChatInterface({ activeCase }: ChatInterfaceProps) {
//   const [mounted, setMounted] = useState(false);
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: crypto.randomUUID(),
//       role: "agent",
//       content: "Good evening. I am Sherlock Holmes. Present your mystery.",
//       type: "text",
//       timestamp: new Date(),
//     },
//   ]);

//   const [input, setInput] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [threadId, setThreadId] = useState<string | null>(null);
//   const [isRecording, setIsRecording] = useState(false);

//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => setMounted(true), []);

//   /* ✅ Correct auto-scroll (ChatGPT style) */
//   useEffect(() => {
//     const el = scrollRef.current;
//     if (!el) return;

//     const nearBottom =
//       el.scrollHeight - el.scrollTop - el.clientHeight < 120;

//     if (nearBottom) {
//       requestAnimationFrame(() => {
//         el.scrollTop = el.scrollHeight;
//       });
//     }
//   }, [messages]);

//   /* ---------------- SEND MESSAGE ---------------- */
//   const handleSendMessage = async () => {
//     if (!input.trim()) return;

//     const userText = input.trim();
//     setInput("");

//     setMessages((prev) => [
//       ...prev,
//       {
//         id: crypto.randomUUID(),
//         role: "user",
//         content: userText,
//         type: "text",
//         timestamp: new Date(),
//       },
//     ]);

//     setIsProcessing(true);

//     try {
//       const res = await fetch(`${BACKEND_URL}/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           message: userText,
//           thread_id: threadId,
//           case_id: activeCase,
//         }),
//       });

//       const data = await res.json();
//       if (data.thread_id) setThreadId(data.thread_id);

//       setMessages((prev) => [
//         ...prev,
//         {
//           id: crypto.randomUUID(),
//           role: "agent",
//           content: data.response ?? "I deduce nothing of value.",
//           type: "analysis",
//           timestamp: new Date(),
//         },
//       ]);
//     } catch {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: crypto.randomUUID(),
//           role: "agent",
//           content: "My connection to the mind palace is severed.",
//           type: "text",
//           timestamp: new Date(),
//         },
//       ]);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <Card className="flex flex-col h-full min-h-0 bg-linear-to-br from-slate-900/40 to-amber-950/40 border-amber-900/50">
//       <CardHeader className="border-b border-amber-900/30">
//         <CardTitle className="text-amber-100 flex items-center gap-2">
//           <Brain className="w-5 h-5 text-amber-500" />
//           Detective Analysis Chamber
//         </CardTitle>
//       </CardHeader>

//       <CardContent className="flex flex-col flex-1 min-h-0 p-0">
//         {/* ✅ REAL scroll container */}
//         <div
//           ref={scrollRef}
//           className="flex-1 overflow-y-auto px-8 py-6"
//         >
//           <div className="mx-auto max-w-3xl space-y-6">
//             {messages.map((m) => (
//               <div
//                 key={m.id}
//                 className={`flex ${
//                   m.role === "user" ? "justify-end" : "justify-start"
//                 }`}
//               >
//                 {m.role === "agent" && (
//                   <Brain className="mr-3 mt-1 w-6 h-6 text-amber-500" />
//                 )}

//                 <div className="max-w-[75%] rounded-lg bg-slate-900/80 border border-amber-900/30 p-4">
//                   {m.type === "analysis" && (
//                     <Badge className="mb-2">Analysis</Badge>
//                   )}
//                   <p className="text-amber-100 whitespace-pre-wrap">
//                     {m.content}
//                   </p>
//                   {mounted && (
//                     <p className="mt-2 text-xs text-amber-700">
//                       {m.timestamp.toLocaleTimeString()}
//                     </p>
//                   )}
//                 </div>

//                 {m.role === "user" && (
//                   <User className="ml-3 mt-1 w-6 h-6 text-slate-300" />
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

//         {/* Input (pinned) */}
//         <div className="border-t border-amber-900/30 p-4">
//           <Textarea
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder="Present your clues, Watson…"
//             disabled={isProcessing || isRecording}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleSendMessage();
//               }
//             }}
//           />

//           <div className="mt-3 flex justify-between">
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => setIsRecording(!isRecording)}
//             >
//               {isRecording ? <MicOff /> : <Mic />}
//             </Button>

//             <Button onClick={handleSendMessage} disabled={!input.trim()}>
//               <Send className="mr-2 w-4 h-4" />
//               Send
//             </Button>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

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