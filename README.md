# 🔍 BakerStreet221B.ai — Sherlock ReAct Detective Agent

> *"Elementary, my dear Watson — Multimodal AI Mystery Solver"*

A full-stack AI detective application powered by a **LangGraph ReAct agent** running **Google Gemini 2.5 Flash**, wrapped in a cinematic Sherlock Holmes–themed UI. Upload documents, interrogate evidence, search the web, and let the world's greatest consulting detective reason through your case — step by step, tool by tool.

---

## 🎯 Purpose & Impact

BakerStreet221B.ai was built to demonstrate **agentic AI reasoning in action**. Rather than a traditional chatbot that generates a single response, this application functions as a reasoning engine designed to process complex, multi-stage investigations autonomously.

**Project Impact:**
- **Cognitive Offloading**: Automates the laborious task of cross-referencing timelines, parsing long police reports, and mapping out suspect relationships.
- **Transparent AI Reasoning**: Exposes the "thought process" of the LLM via real-time tool execution streaming, establishing trust with the user.
- **Enterprise-Ready Architecture**: Demonstrates production-ready patterns including streaming architectures (SSE), JWT authentication, stateful graph orchestration, and observability (LangSmith).

---

## 🏗️ Architecture & Flows

### The ReAct (Reason-Act-Observe) Loop
The core intelligence of Sherlock is built on the ReAct prompting framework, orchestrated by LangGraph.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Reason: User Input / Prompt
    Reason --> Action: Decision to use tool
    Action --> Observation: Tool execution
    Observation --> Reason: Context injection
    Reason --> [*]: Final Synthesis
```

### System Architecture Flow
```mermaid
graph TD
    A[Investigator] -->|Authenticates JWT| B(Next.js Frontend)
    B -->|Uploads Docs| C[FastAPI Backend]
    B -->|Sends Queries SSE| C
    
    subgraph Data Layer
        D[(PostgreSQL)]
        D1[pgvector schema] --- D
        D2[LangGraph checkpointer] --- D
    end

    C -->|Stores/Retrieves Embeddings| D1
    C -->|Persists Thread State| D2
    
    subgraph Agentic Orchestration
        E{LangGraph ReAct Agent}
        E -->|Reasoning Engine| F[Gemini 2.5 Flash]
        E -->|Tool: web_search| G[DuckDuckGo]
        E -->|Tool: document_search| D1
        E -->|Tool: calculator| H[Math Evaluator]
    end

    C -->|Orchestrates| E
    E -.->|Telemetry & Tracing| I[LangSmith]
```

---

## 🛠️ Tech Stack & Tools

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with Turbopack for rapid compilation and App Router. |
| **Tailwind CSS** | Utility-first styling for the cinematic, glassmorphic UI. |
| **Lucide React** | Consistent, crisp line icons across the interface. |
| **React Hooks/SSE** | Custom streaming parsers to handle real-time Server-Sent Events. |
| **React-Ref** | Powering the custom physics engine for the dynamic relationship graph without bloated external libraries. |

### Backend & AI
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance Python web framework handling async streaming and endpoints. |
| **LangGraph** | Cyclic graph orchestration for the agent's ReAct loop and state management. |
| **Gemini 2.5 Flash** | Core LLM reasoning engine (fast, multimodal, 1M+ token context). |
| **PostgreSQL / pgvector**| Relational database extended for highly efficient semantic vector search (RAG). |
| **SQLAlchemy / asyncpg**| Asynchronous database ORM mapping and connection pooling. |
| **bcrypt / python-jose**| Secure password hashing and stateless JWT authentication. |
| **LangSmith** | Deep observability, token tracking, and debugging for the agentic workflows. |

---

## 🌟 Key Features

- **Agentic Intelligence**: Built with LangGraph, utilizing the ReAct loop to call web searches, semantic document searches, and mathematical evaluators dynamically.
- **Glassmorphic Cinematic UI**: A highly polished, responsive UI designed to feel like a modern detective's mind palace.
- **Real-time SSE Streaming**: Watch Sherlock think in real-time. Tool executions (*e.g., 🔍 Searching the web*) are streamed transparently before the final deduction.
- **Mandatory JWT Authentication**: Secure user management with JWT tokens and direct `bcrypt` password hashing.
- **Persistent Evidence Board**: A heuristic Named Entity Recognition (NER) system extracts suspects, locations, and events, perfectly persisting across sessions via local storage.
- **Dynamic Relationship Graph**: A custom SVG physics engine visualises co-occurrences of suspects and entities in a dynamic network graph.
- **Voice Interrogation & TTS**: Hands-free voice dictation to Sherlock, and browser-native Text-to-Speech (TTS) deductions with a British accent.

---

## 💡 Key Learnings

1. **Streaming Complex State**: Orchestrating Server-Sent Events (SSE) that contain both text tokens *and* structural tool-call metadata required building a robust client-side parser to differentiate between a "thought", a "tool execution", and the "final response".
2. **Deterministic Agent Memory**: Integrating LangGraph's PostgreSQL checkpointer taught me how to persist conversational AI state seamlessly, allowing the agent to remember context from a thread even after a hard server reset.
3. **Optimizing Client-Side Compute**: Rather than relying on expensive LLM calls to extract Named Entities (NER) for the relationship graph, I learned how to build a highly optimized, heuristic-based client-side regex/pattern matcher. This drastically reduced latency and API costs while keeping the evidence board instantly reactive.
4. **Vector DB Integration**: Leveraging `pgvector` inside an existing PostgreSQL instance demonstrated how to achieve powerful RAG semantic search without needing to spin up a dedicated, isolated vector database like Pinecone.

---

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Python 3.10+
- Google Gemini API Key (`GOOGLE_API_KEY`)

### 1. Start the Database
```bash
docker-compose up -d
```
*This starts a PostgreSQL instance with the `pgvector` extension on port 5433.*

### 2. Setup the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create a .env file and add your keys:
# DATABASE_URL=postgresql://sherlock:password@localhost:5433/sherlock_memory
# GOOGLE_API_KEY=your_gemini_api_key_here
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=your_langsmith_api_key_here
# LANGCHAIN_PROJECT=BakerStreet221B
# JWT_SECRET=your_jwt_secret_here

uvicorn app.main:app --reload
```
*Backend runs on `http://localhost:8000`.*

### 3. Setup the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 📂 Folder Structure

```text
bakerStreet221B.ai/
├── docker-compose.yml       # Provisions PostgreSQL + pgvector
├── backend/                 # FastAPI & LangGraph Agent
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI application entry point
│       ├── database.py      # SQLAlchemy & pgvector connection setup
│       ├── models/          # DB schemas (Cases, Users)
│       ├── api/             # API routes (auth, chat, upload, cases)
│       ├── agent/           # LangGraph ReAct implementation
│       │   ├── graph.py     # StateGraph definition and compiled workflow
│       │   ├── state.py     # AgentState TypedDict
│       │   └── tools.py     # web_search, document_search, calculator
│       └── documents/       # PDF parsing and ingestion logic
└── frontend/                # Next.js 14 Web Application
    ├── package.json
    ├── tailwind.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx   # Root layout and global fonts
        │   ├── globals.css  # Tailwind entry and custom utility classes
        │   └── page.tsx     # Main application view (Chat, Sidebar, Evidence)
        ├── components/      # React UI components
        │   ├── ChatInterface.tsx
        │   ├── AuthModal.tsx
        │   ├── WelcomeModal.tsx
        │   └── ui/          # EvidencePanel, RelationshipGraph, badges, cards
        └── lib/             # API helpers and Markdown/PDF export utilities
```

---

## 📄 License

MIT License - Created for demonstrating Advanced Agentic Coding patterns.