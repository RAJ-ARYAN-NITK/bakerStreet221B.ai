from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

import uvicorn

from app.agent.graph import connection_pool, get_checkpointer
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing LangGraph database pool...")
    await connection_pool.open()
    print("Initializing LangGraph persistence...")
    await get_checkpointer().setup()
    print("Persistence ready.")
    yield
    # Shutdown
    print("Closing LangGraph database pool...")
    await connection_pool.close()


app = FastAPI(title="BakerStreet221B API", lifespan=lifespan)

# --------------------------------------------------
# Middleware
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
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