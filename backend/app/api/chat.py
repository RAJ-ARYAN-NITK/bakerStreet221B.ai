# app/api/chat.py

import json
import uuid
import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent import get_agent_graph, get_case_agent_graph

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    case_id:   str | None = None


class ChatResponse(BaseModel):
    response: str
    thread_id: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_config(thread_id: str) -> RunnableConfig:
    return {"configurable": {"thread_id": thread_id}}


def _get_graph(case_id: str | None):
    """Return a case-scoped graph if we have a case_id, else the default graph."""
    if case_id:
        return get_case_agent_graph(case_id)
    return get_agent_graph()


def _extract_final_content(result: dict) -> str:
    """Pull the last AI message content from the graph result."""
    messages = result.get("messages", [])
    for msg in reversed(messages):
        # Skip ToolMessages, get the last AIMessage
        if hasattr(msg, "content") and msg.type not in ("tool", "human"):
            content = msg.content
            if isinstance(content, list):
                # Some models return list[dict] with text blocks
                return " ".join(
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in content
                )
            return str(content)
    return "I could not reach a deduction."


# ─── POST /chat  (classic JSON, kept for backwards compat) ───────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Standard JSON chat. Frontend falls back to this if SSE is unavailable."""
    thread_id = request.thread_id or str(uuid.uuid4())
    config    = _make_config(thread_id)
    graph     = _get_graph(request.case_id)

    messages = [HumanMessage(content=request.message)]

    result = await graph.ainvoke(
        {"messages": messages},
        config=config,
    )

    return {
        "response":  _extract_final_content(result),
        "thread_id": thread_id,
    }


# ─── POST /chat/stream  (Server-Sent Events) ─────────────────────────────────

async def _sse_generator(message: str, thread_id: str, case_id: str | None = None) -> AsyncGenerator[str, None]:
    """
    Yields SSE frames:
      data: {"type":"token","content":"..."}           — partial token
      data: {"type":"tool","name":"...","input":"..."}  — tool call started
      data: {"type":"tool_result","name":"..."}         — tool result received
      data: {"type":"done","thread_id":"..."}           — stream complete
      data: {"type":"error","message":"..."}            — error
    """
    config = _make_config(thread_id)
    graph  = _get_graph(case_id)

    try:
        messages = [HumanMessage(content=message)]

        async for event in graph.astream_events(
            {"messages": messages},
            config=config,
            version="v2",
        ):
            kind = event.get("event", "")
            data = event.get("data", {})
            name = event.get("name", "")

            # — AI is streaming a token —
            if kind == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk:
                    content = chunk.content
                    if isinstance(content, list):
                        content = "".join(
                            b.get("text", "") if isinstance(b, dict) else str(b)
                            for b in content
                        )
                    if content:
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"

            # — Tool is being called —
            elif kind == "on_tool_start":
                tool_input = data.get("input", {})
                # Handle both dict and string inputs
                if isinstance(tool_input, dict):
                    query = (
                        tool_input.get("query")
                        or tool_input.get("expression")
                        or str(tool_input)
                    )
                else:
                    query = str(tool_input)
                yield f"data: {json.dumps({'type': 'tool', 'name': name, 'input': query})}\n\n"

            # — Tool returned a result —
            elif kind == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_result', 'name': name})}\n\n"

        # Done
        yield f"data: {json.dumps({'type': 'done', 'thread_id': thread_id})}\n\n"

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error', 'message': f'{type(e).__name__}: {str(e)}'})}\n\n"


@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    SSE streaming endpoint. Returns Server-Sent Events so the frontend
    can render tokens progressively as Sherlock thinks.
    """
    thread_id = request.thread_id or str(uuid.uuid4())

    return StreamingResponse(
        _sse_generator(request.message, thread_id, request.case_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control":   "no-cache",
            "X-Accel-Buffering": "no",
            "X-Thread-Id":     thread_id,
        },
    )


# ─── GET /chat/history/{thread_id} ───────────────────────────────────────────

@router.get("/chat/history/{thread_id}")
async def get_chat_history(thread_id: str):
    """Retrieve full message history for a thread from Postgres."""
    config = _make_config(thread_id)
    state  = await get_agent_graph().aget_state(config)
    messages = []

    state_messages = state.values.get("messages", []) if state.values else []
    for m in state_messages:
        if m.type == "tool":
            continue  # skip raw tool messages in the history view
        role = "user" if m.type == "human" else "agent"
        content = m.content
        if isinstance(content, list):
            content = " ".join(
                b.get("text", "") if isinstance(b, dict) else str(b)
                for b in content
            )
        messages.append({
            "id":        getattr(m, "id", None) or str(uuid.uuid4()),
            "role":      role,
            "content":   content,
            "type":      "text" if role == "user" else "analysis",
            "timestamp": getattr(m, "response_metadata", {}).get("timestamp") or None,
        })

    return {"messages": messages}