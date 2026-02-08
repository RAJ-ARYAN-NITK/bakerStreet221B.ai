# app/api/chat.py

import uuid
import json
import time
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent import agent_graph

router = APIRouter()


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
        # Best-effort only; ignore all logging errors
        pass


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    thread_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())

    # region agent log
    _agent_debug_log({
        "sessionId": "debug-session",
        "runId": "initial",
        "hypothesisId": "H1",
        "location": "app/api/chat.py:chat_endpoint:before_invoke",
        "message": "Before agent_graph.invoke",
        "data": {
            "thread_id": thread_id,
            "has_message": bool(request.message),
            "message_length": len(request.message or ""),
        },
        "timestamp": time.time(),
    })
    # endregion

    config: RunnableConfig = {
        "configurable": {
            "thread_id": thread_id
        }
    }
    user_message = HumanMessage(content=request.message)

    result = agent_graph.invoke(
        {"messages": [user_message]},
        config=config
    )

    # region agent log
    _agent_debug_log({
        "sessionId": "debug-session",
        "runId": "initial",
        "hypothesisId": "H2",
        "location": "app/api/chat.py:chat_endpoint:after_invoke",
        "message": "After agent_graph.invoke",
        "data": {
            "thread_id": thread_id,
            "result_type": type(result).__name__,
            "has_messages_key": isinstance(result, dict) and "messages" in result,
        },
        "timestamp": time.time(),
    })
    # endregion

    bot_message = result["messages"][-1].content

    return {
        "response": bot_message,
        "thread_id": thread_id
    }