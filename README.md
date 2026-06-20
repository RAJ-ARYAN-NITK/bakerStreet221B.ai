# 🔍 BakerStreet221B.ai — Sherlock ReAct Detective Agent

> *"Elementary, my dear Watson — Multimodal AI Mystery Solver"*

A full-stack AI detective application powered by a **LangGraph ReAct agent** running **Google Gemini 2.5 Flash**, wrapped in a cinematic Sherlock Holmes–themed UI. Upload documents, interrogate evidence, search the web, and let the world's greatest consulting detective reason through your case — step by step, tool by tool.

---

## 🎯 Purpose of this Project

BakerStreet221B.ai was built to demonstrate **agentic AI reasoning in action** — showing how a Large Language Model, combined with a graph-based orchestration layer, can autonomously:

1. **Decide** which tool to call next based on context
2. **Observe** the tool's result
3. **Reason** about what it learned
4. **Repeat** until it reaches a confident conclusion

Unlike a simple chatbot, this agent is *not* just answering from training data. It actively searches the web, runs calculations, and searches through uploaded case files — all orchestrated transparently so the user can watch every tool invocation in real time.

---

## 🗺️ System Architecture Overview

```mermaid
graph TB
    classDef frontend fill:#92400e,stroke:#d97706,color:#fef3c7,rx:8
    classDef backend fill:#1e293b,stroke:#475569,color:#e2e8f0,rx:8
    classDef agent fill:#065f46,stroke:#10b981,color:#d1fae5,rx:8
    classDef db fill:#312e81,stroke:#818cf8,color:#e0e7ff,rx:8
    classDef external fill:#7c2d12,stroke:#f97316,color:#fed7aa,rx:8

    subgraph FE["🖥️  Frontend  (Next.js 16 · TypeScript · Tailwind)"]
        H["🔍 Header\nAgent status indicator"]
        CS["📁 CaseSidebar\nCase management"]
        CI["💬 ChatInterface\nSSE streaming · Typewriter"]
        IP["💡 InvestigationPills\nOne-click question starters"]
        EP["🧾 EvidencePanel\nSuspects · Entities tracker"]
    end

    subgraph BE["⚙️  Backend  (FastAPI · Python 3.13)"]
        MA["🚀 main.py\nLifespan · CORS · Routes"]
        CA["📡 chat.py\nPOST /chat\nPOST /chat/stream (SSE)\nGET  /chat/history"]
        UA["📎 upload.py\nPOST /upload\nPDF · TXT · DOCX ingestion"]
    end

    subgraph AG["🧠  ReAct Agent  (LangGraph)"]
        GR["graph.py\ncreate_react_agent()"]
        PR["prompts.py\nSherlock system prompt"]
        ST["state.py\nAgentState schema"]
        TO["tools.py\n🔍 web_search\n🧮 calculator\n📄 document_search"]
    end

    DB[("🗄️  PostgreSQL 5433\nLangGraph Checkpointer\nConversation memory")]:::db
    DDG["🌐 DuckDuckGo\nWeb Search API"]:::external
    GEM["✨ Gemini 2.5 Flash\nGoogle AI API"]:::external

    H & CS & IP & EP --> CI
    CI -->|"POST /chat/stream\nJSON body"| CA
    CI -->|"POST /upload\nmultipart/form-data"| UA
    CA --> GR
    UA --> GR
    GR --> PR
    GR --> ST
    GR --> TO
    GR <-->|"astream_events()\nSSE frames"| CA
    GR <-->|"Checkpoint read/write"| DB
    TO -->|"DDGS().text()"| DDG
    GR <-->|"LLM calls"| GEM

    class H,CS,CI,IP,EP frontend
    class MA,CA,UA backend
    class GR,PR,ST,TO agent
```

---

## 🔄 ReAct Agent Flow (Reasoning + Acting)

The core of BakerStreet221B.ai is a **ReAct (Reason + Act)** loop. The LLM doesn't just answer — it thinks, picks a tool, observes the result, and thinks again. Here's how it works:

```mermaid
flowchart TD
    classDef think fill:#065f46,stroke:#34d399,color:#d1fae5
    classDef act fill:#7c2d12,stroke:#fb923c,color:#fed7aa
    classDef observe fill:#1e1b4b,stroke:#a78bfa,color:#ede9fe
    classDef decide fill:#1c1917,stroke:#d97706,color:#fef3c7
    classDef done fill:#14532d,stroke:#4ade80,color:#dcfce7
    classDef user fill:#0f172a,stroke:#38bdf8,color:#e0f2fe

    U(["👤 User sends message\nor clicks Investigation Pill"]):::user
    --> THINK["🧠 THINK\nSherlock reasons about\nthe question using the\nSystem Prompt context"]:::think

    THINK --> DECIDE{{"🤔 Does Sherlock\nneed more info?"}}:::decide

    DECIDE -->|"Yes — needs web info"| WS["🔍 ACT: web_search\nQuery DuckDuckGo\n5 results returned"]:::act
    DECIDE -->|"Yes — needs calculation"| CALC["🧮 ACT: calculator\nnumexpr safe eval\nmath result returned"]:::act
    DECIDE -->|"Yes — needs docs"| DS["📄 ACT: document_search\nKeyword-scored chunk\nretrieval from case store"]:::act
    DECIDE -->|"No — sufficient context"| ANS["✅ FINAL ANSWER\nSherlock synthesises\nall gathered evidence"]:::done

    WS --> OBS1["👁️ OBSERVE\nParse search results\nUpdate internal state"]:::observe
    CALC --> OBS2["👁️ OBSERVE\nNumeric result received\nUpdate internal state"]:::observe
    DS --> OBS3["👁️ OBSERVE\nDocument excerpts received\nUpdate internal state"]:::observe

    OBS1 & OBS2 & OBS3 --> THINK2["🧠 THINK AGAIN\nIntegrate new evidence\nDecide next step"]:::think
    THINK2 --> DECIDE

    ANS --> STREAM["📡 Token streaming\nvia Server-Sent Events\nto frontend in real-time"]:::user
```

---

## 📡 Real-Time Streaming & Tool Visibility

The user always knows exactly what the agent is doing. The SSE stream emits typed events:

```mermaid
sequenceDiagram
    participant U as 👤 User (Browser)
    participant FE as 🖥️ ChatInterface.tsx
    participant BE as ⚙️ chat.py /chat/stream
    participant AG as 🧠 LangGraph Agent
    participant LLM as ✨ Gemini 2.5 Flash
    participant TL as 🔧 Tool

    U->>FE: Send message / click pill
    FE->>BE: POST /chat/stream (JSON)
    BE->>AG: astream_events(messages, config)
    AG->>LLM: Invoke with system prompt + history

    Note over FE: 🔵 Thinking dots shown (●●●)

    LLM-->>AG: Tool call decision
    AG->>TL: Execute tool(input)

    AG-->>BE: on_tool_start event
    BE-->>FE: data: {"type":"tool","name":"web_search","input":"..."}
    FE-->>U: 🔍 Wrench icon + "web search" badge (amber pulse)

    TL-->>AG: Tool result
    AG-->>BE: on_tool_end event
    BE-->>FE: data: {"type":"tool_result","name":"web_search"}
    FE-->>U: ✓ web search (green badge)

    AG->>LLM: Continue with tool result
    LLM-->>AG: Stream answer tokens

    loop Token streaming
        AG-->>BE: on_chat_model_stream
        BE-->>FE: data: {"type":"token","content":"..."}
        FE-->>U: Typewriter effect (~55 chars/sec)
    end

    AG-->>BE: done event
    BE-->>FE: data: {"type":"done","thread_id":"..."}
    FE-->>U: Tool badge cleared, message finalised
```

---

## 🧩 Component Reference — Every Part Explained

### Frontend Components

```mermaid
graph LR
    classDef comp fill:#1e293b,stroke:#94a3b8,color:#e2e8f0,rx:6
    classDef state fill:#292524,stroke:#d97706,color:#fef3c7,rx:6
    classDef flow fill:#0f2027,stroke:#06b6d4,color:#cffafe,rx:6

    subgraph "page.tsx — Root Orchestrator"
        P["State manager:\nactiveCase · investigations\npendingMessage · suspects\nentities · mobileTab"]:::state
    end

    subgraph "Header.tsx"
        HDR["Logo · Title · Subtitle\n🟢 Agent Active indicator\nPure presentational"]:::comp
    end

    subgraph "CaseSidebar (ui/CaseSidebar.tsx)"
        SB["📁 Case list (localStorage)\n+ New Case button\nCase isolation per ID\nDate-stamped entries"]:::comp
    end

    subgraph "ChatInterface.tsx — Core Engine"
        MSG["Message list\n(User bubbles · Agent bubbles)"]:::comp
        TW["⌨️ Typewriter queue\n~55 chars/sec drain"]:::comp
        SSE["📡 SSE reader\nfetch + ReadableStream\nline-by-line event parse"]:::comp
        VIN["🎙️ Voice input\nWeb Speech API\ninterim results"]:::comp
        FUP["📎 File upload\nmultipart POST /upload\nPDF·TXT·DOCX"]:::comp
        TOOL["🔧 Tool badge\n🔍 amber pulse → ✓ green"]:::comp
    end

    subgraph "InvestigationPills (in page.tsx)"
        IP["Clickable question buttons\nGenerated by Sherlock on upload\nSend as pendingMessage"]:::flow
    end

    subgraph "EvidencePanel (ui/EvidencePanel.tsx)"
        EP["🎯 Suspects tab\nname · description · risk badge\n+ Entities tab\nname · type · notes\nAll in-memory (no persistence yet)"]:::comp
    end

    P -->|activeCase| SB
    P -->|activeCase + pendingMessage| MSG
    IP -->|onClick → setPendingMessage| P
    P -->|suspects + entities| EP
```

---

### Backend Modules

| Module | Purpose | Key Functions / Components |
|---|---|---|
| `main.py` | App Bootstrap | • `lifespan()`: DB pool & checkpointer setup<br>• CORS Middleware<br>• Route mounting |
| `chat.py` | Chat API | • `POST /chat`: JSON fallback<br>• `POST /chat/stream`: SSE streaming<br>• `GET /chat/history/{id}`: Postgres message restore |
| `upload.py` | Document Ingestion | • `POST /upload`: Validates, parses, chunks text (1500 chars), stores in `_doc_store`, and asks Sherlock for 5 initial questions |
| `graph.py` | Agent Factory | • Gemini 2.5 Flash LLM init<br>• `AsyncPostgresSaver` checkpointer<br>• `get_agent_graph()` / `get_case_agent_graph()` factories |
| `tools.py` | Agent Tools | • `web_search()`: DuckDuckGo API<br>• `calculator()`: numexpr safe math<br>• `make_document_search_tool()`: Keyword scoring retrieval over `_doc_store` |
| `prompts.py` | System Prompt | • `SHERLOCK_SYSTEM_PROMPT`: Enforces persona, tool rules, and ReAct loop |

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **🖥️ Frontend** | • **Framework:** Next.js 16 (App Router, Turbopack)<br>• **Language:** TypeScript (Strict mode)<br>• **Styling:** Tailwind CSS v4, shadcn/ui, Lucide React<br>• **Features:** react-markdown, Web Speech API (Voice input) |
| **⚙️ Backend** | • **Framework:** FastAPI 0.127 (Async, Pydantic v2), Uvicorn<br>• **Orchestration:** LangChain 1.2, LangGraph 1.0<br>• **Database Driver:** psycopg3 + connection pool<br>• **Utilities:** PyPDF, TextLoader, duckduckgo-search, numexpr |
| **🧠 AI** | • **Model:** Google Gemini 2.5 Flash (via `langchain-google-genai`)<br>• **Architecture:** ReAct Agent Pattern (`create_react_agent`)<br>• **Memory:** LangGraph Postgres Checkpointer (thread isolation) |
| **🏗️ Infrastructure**| • **Database:** PostgreSQL (with `pgvector` extension) running in Docker<br>• **Deployment:** Docker Compose, `.env` config management |

---

## 🗄️ Data Flow: Document Upload & Case Isolation

```mermaid
flowchart LR
    classDef step fill:#1e293b,stroke:#60a5fa,color:#dbeafe,rx:6
    classDef store fill:#292524,stroke:#d97706,color:#fef3c7,rx:6
    classDef agent fill:#065f46,stroke:#34d399,color:#d1fae5,rx:6

    FILE(["📎 User uploads\nPDF / TXT / DOCX"])
    --> VAL["Validate extension\n& MIME type"]:::step
    --> TMP["Write to tempfile\n(deleted after parse)"]:::step
    --> PARSE["PyPDFLoader /\nTextLoader\n→ raw_text"]:::step
    --> SPLIT["RecursiveCharacterTextSplitter\nchunk_size=1500\noverlap=150"]:::step
    --> STORE[("_doc_store[case_id]\nIn-memory chunks\nThread-safe lock")]:::store

    SPLIT --> EXCERPT["First 4000 chars\nas excerpt"]:::step
    --> SHERLOCK["🔍 Sherlock agent\nanalyses excerpt\nGenerates 5 questions"]:::agent
    --> PILLS["Investigation Pills\nshown above chat"]

    STORE --> TOOL["document_search tool\nbaked with case_id\nKeyword scoring"]:::agent
    TOOL --> RESULT["Top 5 chunk excerpts\nreturned to LLM"]:::agent
```

---

## 💾 Memory & Persistence Architecture

```mermaid
flowchart TD
    classDef short fill:#0f172a,stroke:#38bdf8,color:#e0f2fe,rx:6
    classDef long fill:#292524,stroke:#d97706,color:#fef3c7,rx:6
    classDef session fill:#1e1b4b,stroke:#a78bfa,color:#ede9fe,rx:6

    subgraph "Short-Term (Session)"
        LS1["localStorage:\nthread_id per case\nmessages per case\ninvestigations per case\nlastActiveCase"]:::short
    end

    subgraph "Long-Term (Persistent)"
        PG2[("PostgreSQL\nLangGraph checkpoint tables\nFull message history\nper thread_id")]:::long
    end

    subgraph "In-Process (Runtime only)"
        MEM["_doc_store dict\nDocument chunks\nCleared on server restart\n⚠️ Not persisted yet"]:::session
    end

    CI2["ChatInterface\non case switch"] --> LS1
    LS1 -->|"thread_id found"| PG2
    PG2 -->|"aget_state(config)"| HIST["GET /chat/history\nrestore messages"]
    LS1 -->|"thread_id not found"| EMPTY["Empty chat\nNew conversation"]
    UPL2["POST /upload"] --> MEM
    MEM --> DS2["document_search tool"]
```

---

## 📱 Responsive Layout

```mermaid
graph LR
    classDef layout fill:#1e293b,stroke:#94a3b8,color:#e2e8f0,rx:6

    subgraph "Desktop ≥640px (sm breakpoint)"
        COL1["📁 CaseSidebar\n~250px fixed left"]:::layout
        COL2["💡 InvestigationPills\n💬 ChatInterface\n(flex-1 center)"]:::layout
        COL3["🧾 EvidencePanel\n~300px fixed right"]:::layout
    end

    subgraph "Mobile <640px"
        TAB1["🗂️ Cases tab\nCaseSidebar"]:::layout
        TAB2["💬 Chat tab\n(default)\nInvestigationPills\n+ ChatInterface"]:::layout
        TAB3["🛡️ Evidence tab\nEvidencePanel"]:::layout
        NAV["Bottom nav bar\nFolderOpen · MessageSquare · Shield"]:::layout
    end
```

---

## ⚠️ Problems Faced During Development

| # | Problem | Root Cause | Solution Applied |
|---|---------|-----------|-----------------|
| 1 | **Postgres connection refused on startup** | Docker DB container not running before `uvicorn` | `docker compose up -d db` first; `connection_pool.open()` in lifespan |
| 2 | **SSE streaming not working** | `Cache-Control` not disabled; Nginx buffering | Added `X-Accel-Buffering: no` header; set `Cache-Control: no-cache` |
| 3 | **Case isolation broken** | `document_search` used a global store without scoping | `make_document_search_tool(case_id)` factory — bakes case_id into closure |
| 4 | **Chat history lost on refresh** | No persistence layer initially | `localStorage` for messages + thread_id; Postgres checkpoint for LangGraph state |
| 5 | **Tool name not visible to user** | SSE events emitted but UI had no indicator | `on_tool_start` → amber pulsing wrench badge; `on_tool_end` → green ✓ badge |
| 6 | **Multiple Next.js dev servers conflict** | Port 3000 already occupied | Port auto-bumps to 3001; or `kill <PID>` to free 3000 |
| 7 | **LLM breaking character** | No explicit persona enforcement | System prompt hardcodes Sherlock persona with *"Never break character"* rule |
| 8 | **Typewriter effect janky** | Updating React state per token caused re-render storms | Queue-based typewriter: chars buffered, drained 2/tick on 18ms `setInterval` |
| 9 | **document_search returning nothing** | `case_id` not passed on upload without active case | Fallback chain: `case_id → thread_id → "default"` in `store_document_chunks` |
| 10 | **Port 5433 vs 5432 confusion** | Docker maps 5433→5432; local brew Postgres uses 5432 | `.env` uses 5433 (Docker host port); `docker-compose.yml` maps correctly |

---

## ✨ Current Features

- 🧠 **ReAct Agent** — Multi-step Reason → Act → Observe loop via LangGraph
- 💬 **Real-time Streaming** — Server-Sent Events, typewriter effect at ~55 chars/sec
- 🔧 **Tool Visibility** — Amber pulsing badge shows active tool; green badge on completion
- 🔍 **Web Search** — Live DuckDuckGo search, no API key required
- 🧮 **Calculator** — Safe `numexpr` math + Python `math` fallback
- 📄 **Document Search** — Upload PDF/TXT/DOCX; keyword-scored chunk retrieval per case
- 📁 **Case Isolation** — Each case has its own doc store, thread_id, and localStorage
- 🎙️ **Voice Input** — Web Speech API with interim results (Chrome/Edge)
- 💾 **Persistent Memory** — LangGraph PostgreSQL checkpointer; session survives restarts
- 💡 **Investigation Pills** — Sherlock auto-generates 5 clickable questions per upload
- 🎭 **Sherlock Persona** — Fully in-character responses, deduction-style reasoning
- 📱 **Responsive UI** — Desktop 3-column layout; mobile bottom-tab navigation
- 🎨 **Dark Victorian Theme** — Amber/slate palette, glassmorphism, micro-animations
- 🔄 **SSE → JSON Fallback** — Gracefully degrades if streaming unavailable

---



## 🚦 Quick Start

### Prerequisites

- Docker Desktop (for PostgreSQL)
- Node.js 20+
- Python 3.13
- A [Google AI Studio API Key](https://aistudio.google.com/apikey)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd bakerStreet221B.ai

# Set your API key
echo "GOOGLE_API_KEY=your_key_here" >> backend/.env
```

### 2. Start the Database

```bash
docker compose up -d db
# Postgres starts on localhost:5433
```

### 3. Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API available at http://localhost:8000
```

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

### 5. Start Investigating

1. Click **+ New Case** in the sidebar
2. Upload a PDF, TXT, or DOCX as evidence
3. Watch Sherlock generate 5 investigation questions
4. Click a pill or ask your own question
5. Watch the **tool badge** to see which tool Sherlock is using

---

## 📁 Project Structure

```
bakerStreet221B.ai/
├── docker-compose.yml          # PostgreSQL (pgvector) + services
├── backend/
│   ├── .env                    # DATABASE_URL · GOOGLE_API_KEY
│   ├── requirements.txt        # All Python dependencies
│   └── app/
│       ├── main.py             # FastAPI app · lifespan · CORS · routes
│       ├── database.py         # (reserved for future SQLAlchemy models)
│       ├── agent/
│       │   ├── graph.py        # LLM init · Postgres pool · agent factories
│       │   ├── tools.py        # web_search · calculator · document_search
│       │   ├── prompts.py      # Sherlock system prompt
│       │   ├── state.py        # AgentState type definition
│       │   └── nodes.py        # (reserved for custom nodes)
│       └── api/
│           ├── chat.py         # /chat · /chat/stream · /chat/history
│           └── upload.py       # /upload — ingest + question generation
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── page.tsx        # Root page · state orchestrator
    │   └── components/
    │       ├── Header.tsx          # Top bar · logo · agent status
    │       ├── ChatInterface.tsx   # Chat · SSE · typewriter · voice · upload
    │       ├── CaseBoard.tsx       # (legacy clue/suspect display)
    │       └── ui/
    │           ├── CaseSidebar.tsx # Case list · create · localStorage
    │           └── EvidencePanel.tsx # Suspects · Entities tracker
    └── .env.local              # NEXT_PUBLIC_BACKEND_URL
```

---

## 📜 License

MIT — *"The game is afoot."*

---

> Built with 🔍 by Raj Aryan · Powered by Google Gemini 2.5 Flash · LangGraph · FastAPI · Next.js