from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

import logging
import uvicorn

from app.agent.graph import connection_pool, get_checkpointer
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router
from app.api.auth import router as auth_router

logger = logging.getLogger(__name__)


import os
from langchain_mcp_adapters.client import MultiServerMCPClient
import app.agent.tools as agent_tools

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Opening LangGraph database pool…")
    await connection_pool.open()

    logger.info("Setting up LangGraph persistence…")
    await get_checkpointer().setup()
    logger.info("LangGraph checkpointer ready.")

    # Feature 4 — pgvector: create document_chunks table + indexes
    logger.info("Setting up pgvector semantic search table…")
    try:
        from app.agent.embeddings import create_vector_table
        await create_vector_table()
    except Exception as e:
        logger.warning(f"pgvector setup skipped (keyword fallback active): {e}")

    # Feature 7 — Auth: create users table via SQLAlchemy
    logger.info("Creating users table if needed…")
    try:
        from app.database import engine, Base
        from app.models.user import User      # noqa: F401 — registers model
        from app.models.case import Case      # noqa: F401
        from app.models.message import Message  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Users table ready.")
    except Exception as e:
        logger.warning(f"SQLAlchemy table setup warning: {e}")

    logger.info("Starting MCP Client...")
    mcp_script_path = os.path.join(os.path.dirname(__file__), "..", "mcp_server.py")
    mcp_client_manager = MultiServerMCPClient({
        "scotland_yard": {
            "transport": "stdio",
            "command": "python",
            "args": [mcp_script_path],
        }
    })

    mcp_tools = await mcp_client_manager.get_tools()
    agent_tools.mcp_tools.extend(mcp_tools)
    logger.info(f"Loaded MCP Tools: {[t.name for t in mcp_tools]}")
    
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Closing LangGraph database pool…")
    await connection_pool.close()


app = FastAPI(title="BakerStreet221B API", lifespan=lifespan)

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status":  "ok",
        "message": "BakerStreet221B API is running",
        "features": [
            "ReAct agent (LangGraph + Gemini 2.5 Flash)",
            "SSE streaming + tool visibility",
            "pgvector semantic document search",
            "Multi-file upload with real-time progress",
            "JWT authentication (optional)",
            "LangSmith tracing",
        ],
    }

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(chat_router,   prefix="")
app.include_router(upload_router, prefix="")
app.include_router(auth_router,   prefix="")   # /auth/register, /auth/login, /auth/me

# ─── Local dev entrypoint ─────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )