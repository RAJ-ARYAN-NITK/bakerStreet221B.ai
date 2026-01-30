
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

import uvicorn

from app.agent import checkpointer
from app.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---------- Startup ----------
    print("Initializing LangGraph persistence...")
    checkpointer.setup()
    print("Persistence ready.")

    yield  # App runs while server is alive

    # ---------- Shutdown (optional cleanup) ----------
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