from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

import json
from typing import Any

from app.agent.state import AgentState
from app.memory.retriever import retrieve_evidence


# --------------------------------------------------
# LLM
# --------------------------------------------------

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.3,
)


# --------------------------------------------------
# Helper
# --------------------------------------------------

def normalize_to_string(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
        return " ".join(parts)

    return str(content)


def safe_parse_json(content: str) -> dict:
    """
    Try to parse LLM JSON response safely.
    Never leaks raw reasoning to the user.
    """
    # Attempt 1 — direct parse
    try:
        return json.loads(content)
    except Exception:
        pass

    # Attempt 2 — extract JSON block from markdown fences
    try:
        start = content.index("{")
        end = content.rindex("}") + 1
        return json.loads(content[start:end])
    except Exception:
        pass

    # Attempt 3 — safe fallback, never expose raw reasoning
    return {
        "thought": "",
        "tool": "final_answer",
        "tool_input": "I was unable to process the evidence properly. Please rephrase your question.",
    }


# --------------------------------------------------
# REASON NODE
# --------------------------------------------------

def sherlock_reason(state: AgentState, config: RunnableConfig):

    messages        = state["messages"]
    steps           = state.get("intermediate_steps", [])
    iteration       = state.get("iteration", 0)
    evidence        = state.get("evidence", [])
    last_tool       = state.get("selected_tool")

    latest_user_text_full = normalize_to_string(messages[-1].content)
    latest_user_text_norm = latest_user_text_full.strip().lower()

    original_question   = normalize_to_string(messages[0].content)
    observation_context = "\n".join(steps)

    # ── Short-reply word sets ──────────────────────────────────────────
    YES_WORDS    = {"yes", "sure", "ok", "okay", "yeah", "yep", "correct",
                    "right", "tell", "more", "explain", "go", "continue", "please"}
    NO_WORDS     = {"no", "nope", "nah", "cant", "cannot", "idk", "dunno"}
    BULLET_WORDS = {"bullet", "bullets", "points", "list", "summarise",
                    "summarize", "summary", "brief"}
    tokens       = set(latest_user_text_norm.replace("'", "").split())

    # ── STEP 1: Force evidence retrieval on first turn ─────────────────
    if iteration == 0:
        return {
            "messages":           messages,
            "intermediate_steps": steps,
            "iteration":          iteration + 1,
            "selected_tool":      "search_evidence",
            "tool_input":         latest_user_text_full,
            "evidence":           evidence,
        }

    # ── STEP 2: Handle "yes/more" after final_answer → elaborate ──────
    if last_tool == "final_answer" and bool(YES_WORDS & tokens):
        last_answer = next(
            (s.replace("Final Answer: ", "") for s in reversed(steps) if s.startswith("Final Answer:")),
            ""
        )
        prompt = f"""
You are Sherlock Holmes.

The user wants you to elaborate further. They said: "{latest_user_text_full}"

Original question: {original_question}
Your previous answer: {last_answer}
Evidence available: {evidence}

Continue your explanation in detail.
Write at least 3 sentences.
Do NOT ask any questions.
Do NOT repeat your previous answer word for word — expand on it.
Respond with plain text only, no JSON.
"""
        response     = llm.invoke([HumanMessage(content=prompt)])
        final_answer = normalize_to_string(response.content)
        steps.append(f"Final Answer: {final_answer}")

        return {
            "messages":           messages + [AIMessage(content=final_answer)],
            "intermediate_steps": steps,
            "iteration":          iteration + 1,
            "selected_tool":      "final_answer",
            "tool_input":         final_answer,
            "evidence":           evidence,
        }

    # ── STEP 3: Handle replies after ask_user ─────────────────────────
    if last_tool == "ask_user":
        user_confirmed   = bool(YES_WORDS & tokens)
        user_cannot_help = bool(NO_WORDS & tokens)

        if user_confirmed:
            prompt = f"""
You are Sherlock Holmes. The user confirmed with: "{latest_user_text_full}"

Original question: {original_question}
Evidence: {evidence}

Give a thorough, direct answer based on the evidence.
Write at least 3 complete sentences.
Do NOT ask any more questions.
Respond with plain text only, no JSON.
"""
        elif user_cannot_help:
            prompt = f"""
You are Sherlock Holmes. The user cannot provide more information.

Original question: {original_question}
Evidence: {evidence}

Give the best possible answer using only available evidence.
Clearly state what information is missing and why it matters.
Do NOT ask any more questions.
Respond with plain text only, no JSON.
"""
        else:
            # User gave a substantive reply — re-search with their new info
            return {
                "messages":           messages,
                "intermediate_steps": steps,
                "iteration":          iteration + 1,
                "selected_tool":      "search_evidence",
                "tool_input":         latest_user_text_full,
                "evidence":           [],  # fresh search
            }

        response     = llm.invoke([HumanMessage(content=prompt)])
        final_answer = normalize_to_string(response.content)
        steps.append(f"Final Answer: {final_answer}")

        return {
            "messages":           messages + [AIMessage(content=final_answer)],
            "intermediate_steps": steps,
            "iteration":          iteration + 1,
            "selected_tool":      "final_answer",
            "tool_input":         final_answer,
            "evidence":           evidence,
        }

    # ── STEP 4.5: Handle formatting requests (bullet/summary/list) ────
    if evidence and bool(BULLET_WORDS & tokens):
        bullet_prompt = f"""
You are Sherlock Holmes summarizing case evidence.

User request: {latest_user_text_full}

Evidence:
{chr(10).join(f"- {e}" for e in evidence)}

Write a clear summary as a markdown numbered list.
Use this exact format — each point on its own line:
1. First point here
2. Second point here
3. Third point here

Respond with plain text only. No JSON. No preamble. No intro sentence.
"""
        response     = llm.invoke([HumanMessage(content=bullet_prompt)])
        final_answer = normalize_to_string(response.content)
        steps.append(f"Final Answer: {final_answer}")

        return {
            "messages":           messages + [AIMessage(content=final_answer)],
            "intermediate_steps": steps,
            "iteration":          iteration + 1,
            "selected_tool":      "final_answer",
            "tool_input":         final_answer,
            "evidence":           evidence,
        }

    # ── STEP 4: Analyze evidence and answer ───────────────────────────
    if evidence:
        prompt = f"""
You are Sherlock Holmes, a brilliant detective analyzing case evidence.

User Question: {original_question}

Evidence Retrieved from Case Documents:
{chr(10).join(f"- {e}" for e in evidence)}

Investigation Notes:
{observation_context}

YOUR RULES:
1. tool_input MUST be a complete, detailed answer — NEVER just a heading or title
2. Minimum 2 full sentences in tool_input
3. Answer ONLY from the evidence above — do not use outside knowledge
4. NEVER write "Definition of X" or "Summary of X" as an answer
5. NEVER expose your thought process in tool_input
6. Only use ask_user if the evidence is completely insufficient to answer
7. If asking a follow-up, make it ONE specific question only
8. Format lists using markdown: use "- item" for bullets, "1. item" for numbered
9. Use **bold** for important terms

Respond ONLY in valid JSON with no markdown fences:
{{"thought": "your private reasoning", "tool": "final_answer or ask_user", "tool_input": "your complete answer here"}}
"""
        response = llm.invoke([HumanMessage(content=prompt)])
        content  = normalize_to_string(response.content)
        decision = safe_parse_json(content)

        thought    = decision.get("thought", "")
        tool       = decision.get("tool", "final_answer")
        tool_input = decision.get("tool_input", "")

        # ✅ Safety check — reject heading-only answers
        is_heading = (
            len(tool_input.split()) < 6 or
            tool_input.strip().endswith(":") or
            tool_input.lower().startswith("definition of") or
            tool_input.lower().startswith("summary of") or
            tool_input.lower().startswith("overview of")
        )

        if is_heading:
            retry_prompt = f"""
You are Sherlock Holmes.

Question: {original_question}
Evidence: {evidence}

Your previous response was just a heading. That is not acceptable.
Write a complete, detailed answer of at least 3 sentences based on the evidence.
Respond with plain text only, no JSON, no headings.
"""
            retry_response = llm.invoke([HumanMessage(content=retry_prompt)])
            tool_input     = normalize_to_string(retry_response.content)
            tool           = "final_answer"

        steps.append(f"Thought: {thought}")

        return {
            "messages":           messages,
            "intermediate_steps": steps,
            "iteration":          iteration + 1,
            "selected_tool":      tool,
            "tool_input":         tool_input,
            "evidence":           evidence,
        }

    # ── STEP 5: No evidence found ─────────────────────────────────────
    prompt = f"""
You are Sherlock Holmes.

The user asked: "{original_question}"

No relevant evidence was found in the case documents.

Tell the user clearly that no relevant documents were found for their question,
and ask them to upload relevant documents first before asking questions.
Keep it brief and in character as Sherlock Holmes.
Respond with plain text only.
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    answer   = normalize_to_string(response.content)

    return {
        "messages":           messages + [AIMessage(content=answer)],
        "intermediate_steps": steps,
        "iteration":          iteration + 1,
        "selected_tool":      "ask_user",
        "tool_input":         answer,
        "evidence":           evidence,
    }


# --------------------------------------------------
# TOOL NODE
# --------------------------------------------------

def execute_tool(state: AgentState, config: RunnableConfig):

    steps      = state.get("intermediate_steps", [])
    tool       = state.get("selected_tool")
    tool_input = state.get("tool_input")
    evidence   = state.get("evidence", [])
    case_id    = "default-case"

    if config and "configurable" in config:
        case_id = config["configurable"].get("case_id", case_id)

    # ── SEARCH EVIDENCE ───────────────────────────────────────────────
    if tool == "search_evidence":
        query   = normalize_to_string(tool_input)
        results = retrieve_evidence(case_id=case_id, query=query, k=5)

        steps.append(f"Observation: Retrieved {len(results)} evidence items")

        return {
            "messages":           state["messages"],
            "intermediate_steps": steps,
            "iteration":          state["iteration"],
            "selected_tool":      "reason",
            "tool_input":         query,
            "evidence":           results,
        }

    # ── FINAL ANSWER ──────────────────────────────────────────────────
    if tool == "final_answer":
        answer = tool_input or "Based on the available evidence, I cannot reach a definitive conclusion."
        steps.append(f"Final Answer: {answer}")

        return {
            "messages":           state["messages"] + [AIMessage(content=answer)],
            "intermediate_steps": steps,
            "iteration":          state["iteration"],
            "selected_tool":      "final_answer",
            "tool_input":         answer,
            "evidence":           evidence,
        }

    # ── ASK USER ──────────────────────────────────────────────────────
    if tool == "ask_user":
        question = tool_input or "Could you provide more details about what you are looking for?"

        return {
            "messages":           state["messages"] + [AIMessage(content=question)],
            "intermediate_steps": steps,
            "iteration":          state["iteration"],
            "selected_tool":      "ask_user",
            "tool_input":         question,
            "evidence":           evidence,
        }

    # ── FALLBACK ──────────────────────────────────────────────────────
    fallback = "The investigation could not determine the next step. Please try rephrasing your question."

    return {
        "messages":           state["messages"] + [AIMessage(content=fallback)],
        "intermediate_steps": steps,
        "iteration":          state["iteration"],
        "selected_tool":      "final_answer",
        "tool_input":         fallback,
        "evidence":           evidence,
    }