
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

import json
import time

load_dotenv()

from app.database import Base, engine

# ============================
# 🔴 REQUIRED MODEL IMPORTS
# Without this → messages table NOT created
# ============================
from app.models.case import Case          # ← ADDED
from app.models.message import Message    # ← ADDED
# ============================

import uvicorn

from app.agent import checkpointer
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router
from app.api.cases import router as cases_router 
from app.api.messages import router as messages_router   # ← ADD


DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


def _agent_debug_log(payload: dict) -> None:
    """
    Append a single NDJSON debug entry to the shared debug log.
    Never raises to avoid impacting main control flow.
    """
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---------- Startup ----------
    print("Initializing LangGraph persistence...")

    # ============================
    # 🔴 THIS NOW CREATES ALL TABLES
    # INCLUDING "messages"
    # ============================
    Base.metadata.create_all(bind=engine)
    # ============================

    _agent_debug_log({
        "sessionId": "debug-session",
        "runId": "initial",
        "hypothesisId": "H5",
        "location": "app/main.py:lifespan:before_checkpointer_setup",
        "message": "About to call checkpointer.setup()",
        "data": {},
        "timestamp": time.time(),
    })

    checkpointer.setup()

    _agent_debug_log({
        "sessionId": "debug-session",
        "runId": "initial",
        "hypothesisId": "H5",
        "location": "app/main.py:lifespan:after_checkpointer_setup",
        "message": "Finished checkpointer.setup()",
        "data": {},
        "timestamp": time.time(),
    })

    print("Persistence ready.")

    yield

    print("Shutting down BakerStreet221B API...")


app = FastAPI(
    title="BakerStreet221B API",
    lifespan=lifespan
)


# --------------------------------------------------
# Middleware
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "BakerStreet221B API is running"
    }


# --------------------------------------------------
# API Routes
# --------------------------------------------------
app.include_router(chat_router, prefix="")
app.include_router(upload_router, prefix="")
app.include_router(cases_router)
app.include_router(messages_router)   # ← ADD


# --------------------------------------------------
# Local dev entrypoint
# --------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )