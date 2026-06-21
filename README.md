# 🔍 BakerStreet221B.ai — Sherlock ReAct Detective Agent

> *"Elementary, my dear Watson — Multimodal AI Mystery Solver"*

A full-stack AI detective application powered by a **LangGraph ReAct agent** running **Google Gemini 2.5 Flash**, wrapped in a cinematic Sherlock Holmes–themed UI. Upload documents, interrogate evidence, search the web, and let the world's greatest consulting detective reason through your case — step by step, tool by tool.

---

## 🎯 Purpose of this Project

BakerStreet221B.ai was built to demonstrate **agentic AI reasoning in action** — showing how a Large Language Model, combined with a graph-based orchestration layer, can autonomously:

1. **Decide** which tool to call next based on context
2. **Execute** the tool (e.g., search the web, read a document, calculate a timeline)
3. **Observe** the result and iterate until the case is solved.

It's not just a chatbot; it's a reasoning engine designed to process complex, multi-stage investigations.

---

## 🌟 Key Features

### 🕵️‍♂️ Agentic Intelligence (Backend)
- **ReAct Architecture**: Built with LangGraph, the agent uses the Reason-Act-Observe loop to systematically solve user queries.
- **Gemini 2.5 Flash**: Leverages Google's state-of-the-art multimodal model for lightning-fast reasoning and massive context windows (1M+ tokens).
- **Tool-Calling Ecosystem**:
  - `web_search`: Live internet access via DuckDuckGo.
  - `document_search`: RAG (Retrieval-Augmented Generation) using `pgvector` for semantic search with keyword fallback.
  - `calculator`: Safe mathematical evaluation for timelines and alibis.
- **Stateful Memory**: PostgreSQL-backed LangGraph checkpointer maintains thread history across sessions.
- **LangSmith Tracing**: Full observability into the agent's thought process, tool execution, latency, and token usage via LangSmith.

### 💼 Investigator Experience (Frontend)
- **Mandatory JWT Authentication**: Secure user management with JWT tokens and direct `bcrypt` password hashing ensuring your case files are private.
- **Glassmorphic Cinematic UI**: A highly polished, responsive Next.js/Tailwind UI designed to feel like a modern detective's mind palace.
- **Real-time SSE Streaming**: Watch Sherlock think in real-time. Tool executions (e.g., *🔍 Searching the web*) are streamed transparently to the user before the final deduction is typed out.
- **Multi-File Ingestion**: Upload multiple PDFs, Word docs, and text files. Real-time streaming progress shows parsing and chunking stages.
- **Persistent Evidence Board**: A heuristic Named Entity Recognition (NER) system automatically extracts suspects, locations, and events from Sherlock's deductions and builds a case board that perfectly persists across sessions via local storage.
- **Dynamic Relationship Graph**: A custom SVG physics engine visualises co-occurrences of suspects and entities in a dynamic network graph that reconstructs itself instantly on reload.
- **Voice Interrogation**: Web Speech API integration allows hands-free voice dictation to Sherlock.
- **British TTS**: Sherlock reads out his deductions using browser-native Text-to-Speech (TTS) with a British accent.
- **Case Export**: Export full investigations as structured Markdown or cleanly formatted PDF documents.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React / Turbopack)
- **Styling**: Tailwind CSS + Lucide Icons
- **State/Network**: React Hooks + native `fetch` (Server-Sent Events)
- **Graph Visualization**: Custom React-Ref physics engine (no heavy external libraries)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **AI/Agent Orchestration**: LangGraph + LangChain
- **LLM**: Google GenAI (`gemini-2.5-flash`) + `text-embedding-004`
- **Database**: PostgreSQL with `pgvector` extension
- **ORM**: SQLAlchemy + asyncpg
- **Authentication**: JWT (python-jose, bcrypt)
- **Observability**: LangSmith

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

## 🧠 The Agentic Flow (How it Works)

1. **Input**: User signs in, uploads a police report and asks, *"Does the suspect's alibi hold up?"*
2. **Graph Trigger**: FastAPI streams the request to the LangGraph compiled workflow.
3. **Reasoning**: Gemini decides it needs to verify the timeline in the document and calculate travel times.
4. **Action**: The agent yields a tool call for `document_search`.
5. **Observation**: `pgvector` returns the semantic match.
6. **Action 2**: The agent yields a tool call for `calculator` to calculate the distance/time.
7. **Deduction**: The agent streams the final synthesis back to the user via SSE.
8. **Extraction**: The frontend runs lightweight NER to extract new entities and updates the persistent Relationship Graph.
9. **Observability**: The entire workflow is traced and logged in LangSmith for debugging and performance monitoring.

---

## 📄 License

MIT License - Created for demonstrating Advanced Agentic Coding patterns.