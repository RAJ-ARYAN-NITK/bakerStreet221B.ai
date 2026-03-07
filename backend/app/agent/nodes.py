# app/agent/nodes.py

# from langchain_groq import ChatGroq
# from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
# from langchain_core.runnables import RunnableConfig

# import json
# import time
# from typing import Any

# from app.agent.state import AgentState
# from app.agent.prompts import SYSTEM_PROMPT
# from app.memory.retriever import retrieve_evidence, add_evidence


# DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


# # --------------------------------------------------
# # Debug logger (safe, never crashes agent)
# # --------------------------------------------------
# def _agent_debug_log(payload: dict) -> None:
#     try:
#         with open(DEBUG_LOG_PATH, "a") as f:
#             f.write(json.dumps(payload) + "\n")
#     except Exception:
#         pass


# # --------------------------------------------------
# # LLM
# # --------------------------------------------------
# llm = ChatGroq(
#     model="llama-3.1-8b-instant",
#     temperature=0.4,
# )


# # --------------------------------------------------
# # Helpers
# # --------------------------------------------------
# def normalize_to_string(content: Any) -> str:
#     """
#     Convert LangChain message content into plain string safely.
#     Handles str | list | dict.
#     """
#     if isinstance(content, str):
#         return content

#     if isinstance(content, list):
#         parts: list[str] = []
#         for item in content:
#             if isinstance(item, str):
#                 parts.append(item)
#             elif isinstance(item, dict) and "text" in item:
#                 parts.append(str(item["text"]))
#         return " ".join(parts)

#     return str(content)


# # --------------------------------------------------
# # Main Reasoning Node
# # --------------------------------------------------
# def sherlock_reason(state: AgentState, config: RunnableConfig):
#     """
#     Core agent reasoning step:

#     1. Read latest user message
#     2. Retrieve semantic evidence from vector DB
#     3. If NO evidence → grounded refusal (NO LLM call)
#     4. Inject evidence into system prompt
#     5. Generate LLM deduction
#     6. Store newly discovered evidence
#     """

#     # ---------------------------------
#     # 1. Extract latest user message SAFELY
#     # ---------------------------------
#     messages = state["messages"]
#     raw_user_content = messages[-1].content
#     user_text = normalize_to_string(raw_user_content)

#     _agent_debug_log({
#         "stage": "after_user_text",
#         "messages_count": len(messages),
#         "user_text_preview": user_text[:100],
#         "timestamp": time.time(),
#     })

#     # ---------------------------------
#     # 2. Get case_id from LangGraph runtime config
#     # ---------------------------------
#     case_id = "default-case"

#     if config and "configurable" in config:
#         case_id = config["configurable"].get("thread_id", case_id)

#     # ---------------------------------
#     # 3. Retrieve relevant evidence
#     # ---------------------------------
#     past_evidence = retrieve_evidence(
#         case_id=case_id,
#         query=user_text,
#         k=4,
#     )

#     _agent_debug_log({
#         "stage": "after_retrieve_evidence",
#         "case_id": case_id,
#         "evidence_count": len(past_evidence or []),
#         "timestamp": time.time(),
#     })

#     # ==================================================
#     # 🔴 PHASE 3.5 FIX — GROUNDED REFUSAL (NO EVIDENCE)
#     # ==================================================
#     if not past_evidence:
#         refusal_text = (
#             "I cannot deduce an answer without supporting evidence from the case files. "
#             "Please upload relevant documents or provide additional clues."
#         )

#         _agent_debug_log({
#             "stage": "no_evidence_refusal",
#             "case_id": case_id,
#             "timestamp": time.time(),
#         })

#         return {
#             "messages": [AIMessage(content=refusal_text)]
#         }

#     # ---------------------------------
#     # 4. Build evidence block (clean logic)
#     # ---------------------------------
#     evidence_block = "\n\nKnown Evidence:\n"
#     for idx, ev in enumerate(past_evidence, 1):
#         evidence_block += f"{idx}. {ev}\n"

#     # ---------------------------------
#     # 5. Build prompt
#     # ---------------------------------
#     prompt_messages = [
#         SystemMessage(content=SYSTEM_PROMPT + evidence_block),
#         HumanMessage(content=user_text),
#     ]

#     # ---------------------------------
#     # 6. Invoke LLM
#     # ---------------------------------
#     _agent_debug_log({
#         "stage": "before_llm",
#         "case_id": case_id,
#         "has_evidence": True,
#         "timestamp": time.time(),
#     })

#     response = llm.invoke(prompt_messages)
#     response_text = normalize_to_string(response.content)

#     _agent_debug_log({
#         "stage": "after_llm",
#         "response_preview": response_text[:100],
#         "timestamp": time.time(),
#     })

#     # ---------------------------------
#     # 7. Store new evidence (safer heuristic)
#     # ---------------------------------
#     trigger_words = ["new evidence", "discovered clue", "confirmed finding"]

#     if any(word in response_text.lower() for word in trigger_words):
#         add_evidence(
#             case_id=case_id,
#             content=response_text,
#             source="agent",
#         )

#     # ---------------------------------
#     # 8. Return updated messages
#     # ---------------------------------
#     return {
#         "messages": [response]
#     }

# # app/agent/nodes.py

# from langchain_groq import ChatGroq
# from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
# from langchain_core.runnables import RunnableConfig

# import json
# import time
# from typing import Any

# from app.agent.state import AgentState
# from app.agent.prompts import SYSTEM_PROMPT
# from app.memory.retriever import retrieve_evidence, add_evidence


# DEBUG_LOG_PATH = "/Users/rajaryan/Desktop/Projects/ML/bakerStreet221B.ai/bakerStreet221B.ai-1/.cursor/debug.log"


# # --------------------------------------------------
# # Debug logger
# # --------------------------------------------------
# def _agent_debug_log(payload: dict) -> None:
#     try:
#         with open(DEBUG_LOG_PATH, "a") as f:
#             f.write(json.dumps(payload) + "\n")
#     except Exception:
#         pass


# # --------------------------------------------------
# # LLM
# # --------------------------------------------------
# llm = ChatGroq(
#     model="llama-3.1-8b-instant",
#     temperature=0.4,
# )


# # --------------------------------------------------
# # Helpers
# # --------------------------------------------------
# def normalize_to_string(content: Any) -> str:
#     if isinstance(content, str):
#         return content

#     if isinstance(content, list):
#         parts: list[str] = []
#         for item in content:
#             if isinstance(item, str):
#                 parts.append(item)
#             elif isinstance(item, dict) and "text" in item:
#                 parts.append(str(item["text"]))
#         return " ".join(parts)

#     return str(content)


# # --------------------------------------------------
# # Main Reasoning Node
# # --------------------------------------------------
# def sherlock_reason(state: AgentState, config: RunnableConfig):
#     """
#     Fixed logic:

#     ✔ Uses REAL case_id (not thread_id)
#     ✔ Allows fallback answer if no evidence
#     ✔ Keeps evidence-grounded reasoning when available
#     """

#     # 1️⃣ Latest user message
#     messages = state["messages"]
#     raw_user_content = messages[-1].content
#     user_text = normalize_to_string(raw_user_content)

#     _agent_debug_log({
#         "stage": "after_user_text",
#         "user_text_preview": user_text[:100],
#         "timestamp": time.time(),
#     })

#     # 2️⃣ Extract REAL case_id from config
#     case_id = "default-case"

#     if config and "configurable" in config:
#         case_id = config["configurable"].get("case_id", case_id)

#     _agent_debug_log({
#         "stage": "case_id_extracted",
#         "case_id": case_id,
#         "timestamp": time.time(),
#     })

#     # 3️⃣ Retrieve semantic evidence
#     past_evidence = retrieve_evidence(
#         case_id=case_id,
#         query=user_text,
#         k=4,
#     )

#     _agent_debug_log({
#         "stage": "after_retrieve_evidence",
#         "case_id": case_id,
#         "evidence_count": len(past_evidence or []),
#         "timestamp": time.time(),
#     })

#     # 4️⃣ Build evidence context (if exists)
#     evidence_block = ""

#     if past_evidence:
#         evidence_block = "\n\nKnown Evidence:\n"
#         for idx, ev in enumerate(past_evidence, 1):
#             evidence_block += f"{idx}. {ev}\n"
#     else:
#         evidence_block = (
#             "\n\nNo direct evidence found in case files. "
#             "You may answer using general knowledge if appropriate."
#         )

#     # 5️⃣ Prompt
#     prompt_messages = [
#         SystemMessage(content=SYSTEM_PROMPT + evidence_block),
#         HumanMessage(content=user_text),
#     ]

#     _agent_debug_log({
#         "stage": "before_llm",
#         "case_id": case_id,
#         "has_evidence": bool(past_evidence),
#         "timestamp": time.time(),
#     })

#     # 6️⃣ LLM call
#     response = llm.invoke(prompt_messages)
#     response_text = normalize_to_string(response.content)

#     _agent_debug_log({
#         "stage": "after_llm",
#         "response_preview": response_text[:120],
#         "timestamp": time.time(),
#     })

#     # 7️⃣ Store new evidence (heuristic)
#     trigger_words = ["new evidence", "discovered clue", "confirmed finding"]

#     if any(word in response_text.lower() for word in trigger_words):
#         add_evidence(
#             case_id=case_id,
#             content=response_text,
#             source="agent",
#         )

#     # 8️⃣ Return
#     return {
#         "messages": [AIMessage(content=response_text)]
#     }

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

import json
import time
from typing import Any

from app.agent.state import AgentState
from app.agent.prompts import SYSTEM_PROMPT
from app.memory.retriever import retrieve_evidence

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
# Reasoning Node
# --------------------------------------------------
def sherlock_reason(state: AgentState, config: RunnableConfig):

    messages = state["messages"]
    steps = state["intermediate_steps"]
    iteration = state["iteration"]

    if iteration > 5:
        return {
            "messages": [AIMessage(content="Investigation halted due to excessive reasoning loops.")],
            "intermediate_steps": steps,
            "iteration": iteration
        }

    raw_user_content = messages[-1].content
    user_text = normalize_to_string(raw_user_content)

    _agent_debug_log({
        "stage": "reason_node_start",
        "user_text": user_text[:100],
        "iteration": iteration,
        "timestamp": time.time(),
    })

    prompt_messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_text)
    ]

    response = llm.invoke(prompt_messages)
    thought = normalize_to_string(response.content)

    steps.append(f"Thought: {thought}")

    _agent_debug_log({
        "stage": "reason_node_output",
        "thought": thought[:120],
        "timestamp": time.time(),
    })

    return {
        "messages": [AIMessage(content=thought)],
        "intermediate_steps": steps,
        "iteration": iteration + 1
    }


# --------------------------------------------------
# Tool Execution Node
# --------------------------------------------------
def execute_tool(state: AgentState, config: RunnableConfig):

    steps = state["intermediate_steps"]

    case_id = "default-case"

    if config and "configurable" in config:
        case_id = config["configurable"].get("case_id", case_id)

    last_message = state["messages"][-1].content
    query = normalize_to_string(last_message)

    _agent_debug_log({
        "stage": "tool_execution",
        "query": query[:100],
        "case_id": case_id,
        "timestamp": time.time(),
    })

    results = retrieve_evidence(
        case_id=case_id,
        query=query,
        k=5
    )

    observation = f"Observation: {results}"

    steps.append(observation)

    _agent_debug_log({
        "stage": "tool_results",
        "results_count": len(results),
        "timestamp": time.time(),
    })

    return {
        "messages": state["messages"],
        "intermediate_steps": steps,
        "iteration": state["iteration"]
    }