# from langchain_groq import ChatGroq
# from app.agent.state import AgentState
# from app.agent.prompts import SYSTEM_PROMPT

# llm = ChatGroq(
#     model="llama-3.1-8b-instant",
#     temperature=0.7,
# )

# def sherlock_reason(state: AgentState):
#     messages = [SYSTEM_PROMPT] + state["messages"]
#     response = llm.invoke(messages)

#     return {
#         "messages": [response]
#     }

# # app/agent/nodes.py

# from langchain_groq import ChatGroq
# from langchain_core.messages import SystemMessage, HumanMessage
# import json
# import time

# from app.agent.state import AgentState
# from app.agent.prompts import SYSTEM_PROMPT
# from app.memory.retriever import retrieve_evidence, add_evidence


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
#         # Best-effort only; ignore all logging errors
#         pass


# # -------------------------------
# # LLM
# # -------------------------------
# llm = ChatGroq(
#     model="llama-3.1-8b-instant",
#     temperature=0.4
# )


# # -------------------------------
# # Helpers
# # -------------------------------
# def normalize_to_string(content) -> str:
#     """
#     Convert LangChain message content into plain string safely.
#     Handles str | list | dict.
#     """
#     if isinstance(content, str):
#         return content

#     if isinstance(content, list):
#         parts = []
#         for item in content:
#             if isinstance(item, str):
#                 parts.append(item)
#             elif isinstance(item, dict) and "text" in item:
#                 parts.append(item["text"])
#         return " ".join(parts)

#     return str(content)


# # -------------------------------
# # Main Reasoning Node
# # -------------------------------
# def sherlock_reason(state: AgentState, config: dict):
#     """
#     Core agent reasoning step:

#     1. Read latest user message
#     2. Retrieve semantic evidence from vector DB
#     3. Inject evidence into system prompt
#     4. Generate LLM deduction
#     5. Store newly discovered evidence
#     """

#     # ---------------------------------
#     # 1. Extract latest user message SAFELY
#     # ---------------------------------
#     messages = state["messages"]
#     raw_user_content = messages[-1].content
#     user_text = normalize_to_string(raw_user_content)

#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H1",
#         "location": "app/agent/nodes.py:sherlock_reason:after_user_text",
#         "message": "Extracted user_text from state",
#         "data": {
#             "messages_count": len(messages),
#             "user_text_preview": user_text[:100],
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     # ---------------------------------
#     # 2. Get case_id from LangGraph config
#     # ---------------------------------
#     case_id = config.get("configurable", {}).get("thread_id", "default-case")

#     # ---------------------------------
#     # 3. Retrieve relevant evidence
#     # ---------------------------------
#     past_evidence = retrieve_evidence(
#         case_id=case_id,
#         query=user_text,
#         k=4
#     )

#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H2",
#         "location": "app/agent/nodes.py:sherlock_reason:after_retrieve_evidence",
#         "message": "Retrieved evidence for case",
#         "data": {
#             "case_id": case_id,
#             "evidence_count": len(past_evidence or []),
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     evidence_block = ""
#     if past_evidence:
#         evidence_block = "\n\nKnown Evidence:\n"
#         for idx, ev in enumerate(past_evidence, 1):
#             evidence_block += f"{idx}. {ev}\n"

#     # ---------------------------------
#     # 4. Build prompt
#     # ---------------------------------
#     prompt_messages = [
#         SystemMessage(content=SYSTEM_PROMPT + evidence_block),
#         HumanMessage(content=user_text),
#     ]

#     # ---------------------------------
#     # 5. Invoke LLM
#     # ---------------------------------
#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H3",
#         "location": "app/agent/nodes.py:sherlock_reason:before_llm",
#         "message": "Invoking LLM",
#         "data": {
#             "case_id": case_id,
#             "user_text_preview": user_text[:100],
#             "has_evidence": bool(past_evidence),
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     response = llm.invoke(prompt_messages)

#     # Normalize response text
#     response_text = normalize_to_string(response.content)

#     # region agent log
#     _agent_debug_log({
#         "sessionId": "debug-session",
#         "runId": "initial",
#         "hypothesisId": "H3",
#         "location": "app/agent/nodes.py:sherlock_reason:after_llm",
#         "message": "LLM responded",
#         "data": {
#             "response_text_preview": response_text[:100],
#         },
#         "timestamp": time.time(),
#     })
#     # endregion

#     # ---------------------------------
#     # 6. Store new evidence (simple heuristic)
#     # ---------------------------------
#     trigger_words = ["found", "evidence", "clue", "discovered"]

#     if any(word in response_text.lower() for word in trigger_words):
#         add_evidence(
#             case_id=case_id,
#             content=response_text,
#             source="agent",
#         )

#     # ---------------------------------
#     # 7. Return updated messages
#     # ---------------------------------
#     return {
#         "messages": [response]
#     }

# app/agent/nodes.py

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

import json
import time
from typing import Any

from app.agent.state import AgentState
from app.agent.prompts import SYSTEM_PROMPT
from app.memory.retriever import retrieve_evidence, add_evidence


DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


# --------------------------------------------------
# Debug logger (safe, never crashes agent)
# --------------------------------------------------
def _agent_debug_log(payload: dict) -> None:
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception:
        pass


# --------------------------------------------------
# LLM
# --------------------------------------------------
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.4,
)


# --------------------------------------------------
# Helpers
# --------------------------------------------------
def normalize_to_string(content: Any) -> str:
    """
    Convert LangChain message content into plain string safely.
    Handles str | list | dict.
    """
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
        return " ".join(parts)

    return str(content)


# --------------------------------------------------
# Main Reasoning Node
# --------------------------------------------------
def sherlock_reason(state: AgentState, config: RunnableConfig):
    """
    Core agent reasoning step:

    1. Read latest user message
    2. Retrieve semantic evidence from vector DB
    3. Inject evidence into system prompt
    4. Generate LLM deduction
    5. Store newly discovered evidence
    """

    # ---------------------------------
    # 1. Extract latest user message SAFELY
    # ---------------------------------
    messages = state["messages"]
    raw_user_content = messages[-1].content
    user_text = normalize_to_string(raw_user_content)

    _agent_debug_log({
        "stage": "after_user_text",
        "messages_count": len(messages),
        "user_text_preview": user_text[:100],
        "timestamp": time.time(),
    })

    # ---------------------------------
    # 2. Get case_id from LangGraph runtime config
    # ---------------------------------
    case_id = "default-case"

    if config and "configurable" in config:
        case_id = config["configurable"].get("thread_id", case_id)

    # ---------------------------------
    # 3. Retrieve relevant evidence
    # ---------------------------------
    past_evidence = retrieve_evidence(
        case_id=case_id,
        query=user_text,
        k=4,
    )

    _agent_debug_log({
        "stage": "after_retrieve_evidence",
        "case_id": case_id,
        "evidence_count": len(past_evidence or []),
        "timestamp": time.time(),
    })

    evidence_block = ""
    if past_evidence:
        evidence_block = "\n\nKnown Evidence:\n"
        for idx, ev in enumerate(past_evidence, 1):
            evidence_block += f"{idx}. {ev}\n"

    # ---------------------------------
    # 4. Build prompt
    # ---------------------------------
    prompt_messages = [
        SystemMessage(content=SYSTEM_PROMPT + evidence_block),
        HumanMessage(content=user_text),
    ]

    # ---------------------------------
    # 5. Invoke LLM
    # ---------------------------------
    _agent_debug_log({
        "stage": "before_llm",
        "case_id": case_id,
        "has_evidence": bool(past_evidence),
        "timestamp": time.time(),
    })

    response = llm.invoke(prompt_messages)
    response_text = normalize_to_string(response.content)

    _agent_debug_log({
        "stage": "after_llm",
        "response_preview": response_text[:100],
        "timestamp": time.time(),
    })

    # ---------------------------------
    # 6. Store new evidence (simple heuristic)
    # ---------------------------------
    trigger_words = ["found", "evidence", "clue", "discovered"]

    if any(word in response_text.lower() for word in trigger_words):
        add_evidence(
            case_id=case_id,
            content=response_text,
            source="agent",
        )

    # ---------------------------------
    # 7. Return updated messages
    # ---------------------------------
    return {
        "messages": [response]
    }