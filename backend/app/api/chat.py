
import uuid
import json
import time
from typing import cast

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session

from langchain_core.messages import HumanMessage, BaseMessage
from langchain_core.runnables import RunnableConfig

from app.agent.graph import agent_graph
from app.agent.state import AgentState
from app.database import SessionLocal
from app.models.message import Message
from app.memory.retriever import add_evidence

router = APIRouter()

DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


# --------------------------------------------------
# Debug logger
# --------------------------------------------------
def _agent_debug_log(payload: dict) -> None:
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception:
        pass


# --------------------------------------------------
# Request / Response Schemas
# --------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    case_id: str


class ChatResponse(BaseModel):
    response: str
    thread_id: str


# --------------------------------------------------
# Chat Endpoint
# --------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):

    # --------------------------------------------------
    # 1️⃣ Ensure thread continuity
    # --------------------------------------------------
    thread_id = request.thread_id or str(uuid.uuid4())

    config: RunnableConfig = {
        "configurable": {
            "thread_id": thread_id,
            "case_id": request.case_id,
        },
        # Prevent infinite reasoning loops
        "recursion_limit": 10
    }

    user_message = HumanMessage(content=request.message)

    # --------------------------------------------------
    # 2️⃣ Initial Agent State
    # --------------------------------------------------
    initial_state: AgentState = {
        "messages": [user_message],
        "intermediate_steps": [],
        "iteration": 0,
        "selected_tool": None,
        "tool_input": None,
        "evidence": [],
    }

    # Debug log
    _agent_debug_log({
        "stage": "before_agent_invoke",
        "thread_id": thread_id,
        "case_id": request.case_id,
        "timestamp": time.time(),
    })

    # --------------------------------------------------
    # 3️⃣ Run LangGraph Agent
    # --------------------------------------------------
    try:

        final_state = cast(
            AgentState,
            agent_graph.invoke(
                initial_state,
                config=config,
            ),
        )

        messages: list[BaseMessage] = final_state.get("messages", [])

        # Prefer the last AI message; fall back to generic text
        final_message = None
        for msg in reversed(messages):
            msg_type = getattr(msg, "type", "")
            if msg_type == "ai":
                final_message = str(msg.content)
                break

        if final_message is None:
            # No AI message found – use a safe default instead of echoing user text
            final_message = (
                "Sherlock could not yet form a clear conclusion from the available notes."
            )

        _agent_debug_log({
            "stage": "after_agent_invoke",
            "response_preview": final_message[:120],
            "timestamp": time.time(),
        })

    except Exception as e:

        final_message = "Sherlock encountered an unexpected reasoning error."

        print("Agent error:", e)

        _agent_debug_log({
            "stage": "agent_exception",
            "error_type": type(e).__name__,
            "error_str": str(e)[:200],
            "timestamp": time.time(),
        })

    # --------------------------------------------------
    # 4️⃣ Store SQL chat history
    # --------------------------------------------------
    db: Session = SessionLocal()

    try:

        db.add(
            Message(
                id=str(uuid.uuid4()),
                case_id=request.case_id,
                role="user",
                content=request.message,
            )
        )

        db.add(
            Message(
                id=str(uuid.uuid4()),
                case_id=request.case_id,
                role="agent",
                content=final_message,
            )
        )

        db.commit()

    finally:
        db.close()

    # --------------------------------------------------
    # 5️⃣ Store semantic evidence (vector DB)
    # --------------------------------------------------
    try:
        add_evidence(
            case_id=request.case_id,
            content=request.message,
            source="user",
        )
    except Exception:
        pass

    # --------------------------------------------------
    # 6️⃣ Return response
    # --------------------------------------------------
    return ChatResponse(
        response=final_message,
        thread_id=thread_id,
    )