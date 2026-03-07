# # app/api/chat.py

# import uuid
# import json
# import time
# from fastapi import APIRouter
# from pydantic import BaseModel
# from langchain_core.messages import HumanMessage
# from langchain_core.runnables import RunnableConfig

# from app.agent import agent_graph

# # 🔴 ADDED (Phase 4.5)
# from app.database import SessionLocal
# from app.models.message import Message
# # 🔴 END

# router = APIRouter()


# DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


# def _agent_debug_log(payload: dict) -> None:
#     """
#     Append a single NDJSON debug entry to the shared debug log.
#     Never raises to avoid impacting main control flow.
#     """
#     try:
#         with open(DEBUG_LOG_PATH, "a") as f:
#             f.write(json.dumps(payload) + "\n")
#     except Exception:
#         pass


# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None


# class ChatResponse(BaseModel):
#     response: str
#     thread_id: str


# @router.post("/chat", response_model=ChatResponse)
# async def chat_endpoint(request: ChatRequest):

#     thread_id = request.thread_id or str(uuid.uuid4())

#     # 🔴 ADDED (Phase 4.5) — open DB session
#     db = SessionLocal()
#     # 🔴 END

#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H1",
#         "location": "app/api/chat.py:chat_endpoint:before_invoke",
#         "message": "Before agent_graph.invoke",
#         "data": {
#             "thread_id": thread_id,
#             "has_message": bool(request.message),
#             "message_length": len(request.message or ""),
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     # 🔴 ADDED (Phase 4.5) — store USER message
#     user_db_msg = Message(
#         id=str(uuid.uuid4()),
#         case_id=thread_id,
#         role="user",
#         content=request.message,
#     )
#     db.add(user_db_msg)
#     db.commit()
#     # 🔴 END

#     config: RunnableConfig = {
#         "configurable": {
#             "thread_id": thread_id
#         }
#     }

#     user_message = HumanMessage(content=request.message)

#     result = agent_graph.invoke(
#         {"messages": [user_message]},
#         config=config
#     )

#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H2",
#         "location": "app/api/chat.py:chat_endpoint:after_invoke",
#         "message": "After agent_graph.invoke",
#         "data": {
#             "thread_id": thread_id,
#             "result_type": type(result).__name__,
#             "has_messages_key": isinstance(result, dict) and "messages" in result,
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     bot_message = result["messages"][-1].content

#     # 🔴 ADDED (Phase 4.5) — store AGENT response
#     agent_db_msg = Message(
#         id=str(uuid.uuid4()),
#         case_id=thread_id,
#         role="agent",
#         content=bot_message,
#     )
#     db.add(agent_db_msg)
#     db.commit()
#     db.close()
#     # 🔴 END

#     return {
#         "response": bot_message,
#         "thread_id": thread_id
#     }

# app/api/chat.py

# import uuid
# from fastapi import APIRouter
# from pydantic import BaseModel
# from sqlalchemy.orm import Session

# from langchain_core.messages import HumanMessage
# from langchain_core.runnables import RunnableConfig

# from app.agent import agent_graph
# from app.database import SessionLocal
# from app.models.message import Message

# router = APIRouter()


# # -----------------------------
# # Request / Response Schemas
# # -----------------------------
# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None
#     case_id: str   # REQUIRED → separates DB history from LangGraph thread


# class ChatResponse(BaseModel):
#     response: str
#     thread_id: str


# # -----------------------------
# # Chat Endpoint (PHASE 5 FINAL)
# # -----------------------------
# @router.post("/chat", response_model=ChatResponse)
# async def chat_endpoint(request: ChatRequest):
#     """
#     Flow:
#     1. Ensure thread_id for LangGraph memory
#     2. Invoke LangGraph agent
#     3. Persist BOTH user + agent messages to DB under case_id
#     """

#     # 1️⃣ LangGraph thread handling
#     thread_id = request.thread_id or str(uuid.uuid4())

#     config: RunnableConfig = {
#         "configurable": {"thread_id": thread_id}
#     }

#     user_message = HumanMessage(content=request.message)

#     # 2️⃣ Invoke agent
#     result = agent_graph.invoke(
#         {"messages": [user_message]},
#         config=config
#     )

#     bot_message = result["messages"][-1].content

#     # 3️⃣ Persist conversation to DB (case-scoped history)
#     db: Session = SessionLocal()

#     try:
#         db.add(
#             Message(
#                 id=str(uuid.uuid4()),
#                 case_id=request.case_id,
#                 role="user",
#                 content=request.message,
#             )
#         )

#         db.add(
#             Message(
#                 id=str(uuid.uuid4()),
#                 case_id=request.case_id,
#                 role="agent",
#                 content=bot_message,
#             )
#         )

#         db.commit()
#     finally:
#         db.close()

#     # 4️⃣ Return response + thread continuity
#     return ChatResponse(
#         response=bot_message,
#         thread_id=thread_id
#     )

# import uuid
# from fastapi import APIRouter
# from pydantic import BaseModel
# from sqlalchemy.orm import Session

# from langchain_core.messages import HumanMessage
# from langchain_core.runnables import RunnableConfig

# from app.agent import agent_graph
# from app.database import SessionLocal
# from app.models.message import Message

# router = APIRouter()


# # -----------------------------
# # Request / Response Schemas
# # -----------------------------
# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None
#     case_id: str   # REQUIRED → separates DB history from LangGraph thread


# class ChatResponse(BaseModel):
#     response: str
#     thread_id: str


# # -----------------------------
# # Chat Endpoint (PHASE 5 FINAL)
# # -----------------------------
# @router.post("/chat", response_model=ChatResponse)
# async def chat_endpoint(request: ChatRequest):
#     """
#     Flow:
#     1. Ensure thread_id for LangGraph memory
#     2. Invoke LangGraph agent
#     3. Persist BOTH user + agent messages to DB under case_id
#     """

#     # 1️⃣ LangGraph thread handling
#     thread_id = request.thread_id or str(uuid.uuid4())

#     # 🔴 FIX: pass case_id into LangGraph runtime config
#     config: RunnableConfig = {
#         "configurable": {
#             "thread_id": thread_id,
#             "case_id": request.case_id,   # ⭐ CRITICAL FIX
#         }
#     }

#     user_message = HumanMessage(content=request.message)

#     # 2️⃣ Invoke agent
#     result = agent_graph.invoke(
#         {"messages": [user_message]},
#         config=config
#     )

#     bot_message = result["messages"][-1].content

#     # 3️⃣ Persist conversation to DB (case-scoped history)
#     db: Session = SessionLocal()

#     try:
#         db.add(
#             Message(
#                 id=str(uuid.uuid4()),
#                 case_id=request.case_id,
#                 role="user",
#                 content=request.message,
#             )
#         )

#         db.add(
#             Message(
#                 id=str(uuid.uuid4()),
#                 case_id=request.case_id,
#                 role="agent",
#                 content=bot_message,
#             )
#         )

#         db.commit()
#     finally:
#         db.close()

#     # 4️⃣ Return response + thread continuity
#     return ChatResponse(
#         response=bot_message,
#         thread_id=thread_id
#     )

# import uuid
# from fastapi import APIRouter
# from pydantic import BaseModel
# from sqlalchemy.orm import Session

# from langchain_core.messages import HumanMessage
# from langchain_core.runnables import RunnableConfig

# from app.agent import agent_graph
# from app.database import SessionLocal
# from app.models.message import Message
# from app.memory.retriever import add_evidence   # ⭐ PHASE 6 ADDITION

# router = APIRouter()


# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None
#     case_id: str


# class ChatResponse(BaseModel):
#     response: str
#     thread_id: str


# @router.post("/chat", response_model=ChatResponse)
# async def chat_endpoint(request: ChatRequest):

#     # 1️⃣ Thread continuity
#     thread_id = request.thread_id or str(uuid.uuid4())

#     config: RunnableConfig = {
#         "configurable": {
#             "thread_id": thread_id,
#             "case_id": request.case_id
#         }
#     }

#     user_message = HumanMessage(content=request.message)

#     # 2️⃣ Invoke agent
#     result = agent_graph.invoke(
#     {
#         "messages": [user_message],
#         "evidence": []
#     },
#     config=config
# )

#     bot_message = result["messages"][-1].content

#     # 3️⃣ Store SQL history
#     db: Session = SessionLocal()
#     try:
#         db.add(Message(
#             id=str(uuid.uuid4()),
#             case_id=request.case_id,
#             role="user",
#             content=request.message
#         ))

#         db.add(Message(
#             id=str(uuid.uuid4()),
#             case_id=request.case_id,
#             role="agent",
#             content=bot_message
#         ))

#         db.commit()
#     finally:
#         db.close()

#     # 4️⃣ PHASE 6: Store semantic evidence
#     add_evidence(
#         case_id=request.case_id,
#         content=request.message,
#         source="user"
#     )

#     return ChatResponse(
#         response=bot_message,
#         thread_id=thread_id
#     )


import uuid
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent import agent_graph
from app.database import SessionLocal
from app.models.message import Message
from app.memory.retriever import add_evidence

router = APIRouter()


# -----------------------------
# Request / Response Schemas
# -----------------------------
class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    case_id: str


class ChatResponse(BaseModel):
    response: str
    thread_id: str


# -----------------------------
# Chat Endpoint
# -----------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):

    # 1️⃣ Thread continuity
    thread_id = request.thread_id or str(uuid.uuid4())

    config: RunnableConfig = {
        "configurable": {
            "thread_id": thread_id,
            "case_id": request.case_id
        }
    }

    user_message = HumanMessage(content=request.message)

    # 2️⃣ Invoke LangGraph ReAct Agent
    result = agent_graph.invoke(
        {
            "messages": [user_message],
            "intermediate_steps": [],   # ⭐ ReAct state
            "iteration": 0              # ⭐ loop counter
        },
        config=config
    )

    bot_message = result["messages"][-1].content

    # 3️⃣ Store SQL chat history
    db: Session = SessionLocal()

    try:
        db.add(
            Message(
                id=str(uuid.uuid4()),
                case_id=request.case_id,
                role="user",
                content=request.message
            )
        )

        db.add(
            Message(
                id=str(uuid.uuid4()),
                case_id=request.case_id,
                role="agent",
                content=bot_message
            )
        )

        db.commit()

    finally:
        db.close()

    # 4️⃣ Store semantic evidence (vector DB)
    add_evidence(
        case_id=request.case_id,
        content=request.message,
        source="user"
    )

    # 5️⃣ Return response
    return ChatResponse(
        response=bot_message,
        thread_id=thread_id
    )