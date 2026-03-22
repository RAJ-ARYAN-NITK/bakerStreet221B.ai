# 🔍 BakerStreet221B.ai
### Sherlock ReAct Detective Agent

> *"Elementary, my dear Watson — Multimodal AI Mystery Solver"*

A full-stack AI detective agent that analyzes uploaded documents and solves investigations using **RAG + ReAct architecture**. Upload case files, interrogate evidence, and let Sherlock deduce the truth.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-baker--street221--b--ai.vercel.app-orange?style=for-the-badge)](https://baker-street221-b-ai.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-bakerstreet221b--ai.onrender.com-blueviolet?style=for-the-badge)](https://bakerstreet221b-ai.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 🎯 What It Does

- 📄 **Upload documents** (PDFs, DOCX) as case evidence
- 🧠 **AI agent reasons** over uploaded evidence using ReAct loop
- 🔍 **Semantic search** retrieves relevant chunks per case
- 🗂️ **Case isolation** — each investigation has its own vector space
- 💬 **Multi-turn conversation** with persistent memory
- 🕵️ **Suspect & entity tracking** on the evidence board
- 📊 **Auto-generated investigation questions** from documents

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User(["👤 User"])
    Frontend["🖥️ Next.js Frontend\nVercel"]
    Backend["⚙️ FastAPI Backend\nRender + Docker"]
    Agent["🧠 Sherlock ReAct Agent\nLangGraph"]
    Reason["🔍 Reason Node\nGroq LLaMA 3.1"]
    Tool["🛠️ Tool Node"]
    Vector["📦 ChromaDB Cloud\nVector Store"]
    Postgres["🗄️ PostgreSQL\nRender DB"]
    Chroma["🔮 Chroma Cloud\nEmbeddings"]

    User -->|"Ask question / Upload PDF"| Frontend
    Frontend -->|"POST /chat\nPOST /upload"| Backend
    Backend --> Agent
    Agent --> Reason
    Reason -->|"search_evidence"| Tool
    Tool -->|"retrieve chunks"| Vector
    Vector -->|"case_id filtered results"| Tool
    Tool -->|"evidence"| Reason
    Reason -->|"final_answer"| Backend
    Backend -->|"response"| Frontend
    Frontend -->|"displays answer"| User

    Backend -->|"store messages"| Postgres
    Backend -->|"store embeddings"| Chroma

    style User fill:#f59e0b,color:#000
    style Frontend fill:#1e293b,color:#f59e0b
    style Backend fill:#1e293b,color:#f59e0b
    style Agent fill:#92400e,color:#fbbf24
    style Reason fill:#92400e,color:#fbbf24
    style Tool fill:#92400e,color:#fbbf24
    style Vector fill:#1e293b,color:#f59e0b
    style Postgres fill:#1e293b,color:#f59e0b
    style Chroma fill:#1e293b,color:#f59e0b
```
## 🧠 ReAct Agent Flow
```mermaid
flowchart TD
flowchart TD
    Start(["👤 User Query"])
    
    Reason["🧠 REASON NODE
    Sherlock Analyzes Query"]
    
    Decision{{"Sufficient
    Evidence?"}}
    
    Search["🔍 TOOL NODE
    search_evidence"]
    
    Chroma[("📦 ChromaDB Cloud
    Vector Store")]
    
    Evidence["📋 Evidence Retrieved
    case_id filtered chunks"]
    
    Analyze["🧠 REASON NODE
    Analyze Evidence"]
    
    Enough{{"Can Answer
    Confidently?"}}
    
    AskUser["❓ TOOL NODE
    ask_user
    Request Clarification"]
    
    FinalAnswer["✅ TOOL NODE
    final_answer"]
    
    UserReply(["👤 User Reply"])
    Response(["💬 Response to User"])
    
    MaxIter{{"Iteration
    >= 6?"}}
    
    Stop(["🛑 Safety Stop"])

    Start --> Reason
    Reason --> Decision
    Decision -->|"No evidence yet"| Search
    Decision -->|"Has evidence"| Analyze
    Search --> Chroma
    Chroma -->|"Top 5 chunks"| Evidence
    Evidence --> Analyze
    Analyze --> Enough
    Enough -->|"Yes"| FinalAnswer
    Enough -->|"Need more info"| AskUser
    AskUser --> UserReply
    UserReply --> Reason
    FinalAnswer --> Response
    Analyze --> MaxIter
    MaxIter -->|"Yes"| Stop
    MaxIter -->|"No"| Enough

    style Start fill:#f59e0b,color:#000,rx:20
    style Response fill:#f59e0b,color:#000,rx:20
    style UserReply fill:#f59e0b,color:#000,rx:20
    style Stop fill:#ef4444,color:#fff,rx:20
    style Reason fill:#92400e,color:#fbbf24
    style Analyze fill:#92400e,color:#fbbf24
    style Decision fill:#1e3a5f,color:#60a5fa
    style Enough fill:#1e3a5f,color:#60a5fa
    style MaxIter fill:#1e3a5f,color:#60a5fa
    style Search fill:#1e293b,color:#f59e0b
    style AskUser fill:#1e293b,color:#f59e0b
    style FinalAnswer fill:#14532d,color:#86efac
    style Chroma fill:#312e81,color:#a5b4fc
    style Evidence fill:#312e81,color:#a5b4fc
```

---
```
---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 + TypeScript | React framework |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| ReactMarkdown | Markdown rendering |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| LangGraph | ReAct agent orchestration |
| LangChain + Groq | LLM inference (LLaMA 3.1) |
| ChromaDB Cloud | Vector store — case-isolated |
| PostgreSQL | Conversation persistence |
| SQLAlchemy | ORM |
| tiktoken + pypdf | Document processing |
| Docker | Containerization |

### Infrastructure
| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend + PostgreSQL hosting |
| Chroma Cloud | Persistent vector embeddings |
| GitHub | CI/CD — auto-deploy on push |

---

## 🧠 How the ReAct Agent Works

```
User Question
      ↓
  REASON NODE
  (Sherlock thinks)
      ↓
  TOOL NODE
  ├── search_evidence → ChromaDB semantic search
  ├── final_answer    → return response to user
  └── ask_user        → request clarification
      ↓
  REASON NODE
  (analyzes evidence)
      ↓
  final_answer → User
```

The agent follows the **ReAct (Reason + Act)** pattern:
1. **Reason** — analyze the question and available evidence
2. **Act** — search vector store for relevant document chunks
3. **Observe** — process retrieved evidence
4. **Repeat** — until confident enough to answer

---

## 📁 Project Structure

```
bakerStreet221B.ai/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py        # LangGraph workflow
│   │   │   ├── nodes.py        # Reason + Tool nodes
│   │   │   ├── state.py        # Agent state schema
│   │   │   └── investigations.py # Question generation
│   │   ├── api/
│   │   │   ├── chat.py         # Chat endpoint
│   │   │   ├── upload.py       # Document upload
│   │   │   ├── cases.py        # Case management
│   │   │   └── messages.py     # Message history
│   │   ├── documents/
│   │   │   ├── ingest.py       # Document ingestion
│   │   │   ├── loader.py       # PDF/DOCX loader
│   │   │   └── chunker.py      # Text chunking
│   │   ├── memory/
│   │   │   ├── vector_store.py # ChromaDB client
│   │   │   └── retriever.py    # Evidence retrieval
│   │   ├── models/             # SQLAlchemy models
│   │   ├── database.py         # DB connection
│   │   └── main.py             # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx        # Main layout
│   │   └── components/
│   │       ├── ChatInterface.tsx    # Chat UI
│   │       ├── Header.tsx           # App header
│   │       └── ui/
│   │           ├── CaseSidebar.tsx  # Case management
│   │           └── EvidencePanel.tsx # Suspects & entities
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or use SQLite fallback)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/RAJ-ARYAN-NITK/bakerStreet221B.ai.git
cd bakerStreet221B.ai/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your API keys

# Start backend
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local

# Start frontend
npm run dev
```

### Environment Variables

**Backend `.env`:**
```
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/sherlock
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_tenant_id
CHROMA_DATABASE=your_database_name
```

**Frontend `.env.local`:**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 🔑 Key Engineering Decisions

### Why ReAct over simple RAG?
Simple RAG retrieves once and answers. ReAct allows the agent to reason about whether the evidence is sufficient and retrieve more if needed — mimicking how a real detective thinks.

### Why ChromaDB with case isolation?
Each case gets its own collection (`case_{case_id}`), ensuring zero cross-contamination between investigations. Filters are applied at retrieval time using metadata.

### Why Groq over OpenAI?
Groq offers significantly faster inference with LLaMA 3.1 at no cost during development, making iterative testing much faster.

### Why Docker?
Ensures consistent deployment across environments. The same Docker image runs identically on a developer's Mac and on Render's Linux servers.

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/cases` | List all cases |
| POST | `/cases/new` | Create new case |
| DELETE | `/cases/{id}` | Delete case |
| POST | `/upload` | Upload document |
| POST | `/chat` | Send message to agent |
| GET | `/messages/{case_id}` | Get chat history |

---

## 🚢 Deployment

### Backend (Render)
```
Language: Docker
Root Directory: backend
Environment Variables: (see above)
```

### Frontend (Vercel)
```
Framework: Next.js
Root Directory: frontend
Environment Variables:
  NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

Auto-deploys on every push to `main` branch.

---

## 🔮 Roadmap

- [ ] OCR support for scanned PDFs
- [ ] Text-to-speech responses (ElevenLabs)
- [ ] Voice input (Web Speech API)
- [ ] Auto suspect extraction from documents
- [ ] Cross-case intelligence (optional toggle)
- [ ] Case export as PDF report

---

## 👤 Author

**Raj Aryan**
- GitHub: [@RAJ-ARYAN-NITK](https://github.com/RAJ-ARYAN-NITK)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
