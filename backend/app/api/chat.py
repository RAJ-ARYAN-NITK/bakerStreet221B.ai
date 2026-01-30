# app/api/chat.py

import uuid
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent import agent_graph

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    thread_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
  
    thread_id = request.thread_id or str(uuid.uuid4())

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

    bot_message = result["messages"][-1].content

    return {
        "response": bot_message,
        "thread_id": thread_id
    }