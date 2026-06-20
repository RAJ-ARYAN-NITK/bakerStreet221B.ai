import os
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.prebuilt import create_react_agent
from psycopg_pool import AsyncConnectionPool

from app.agent.prompts import SHERLOCK_SYSTEM_PROMPT
from app.agent.tools import SHERLOCK_TOOLS, make_document_search_tool, web_search, calculator

load_dotenv()

# ─── LLM ─────────────────────────────────────────────────────────────────────
# Using Google Gemini 2.5 Flash:
#   • Best available model on this key ✅
#   • Free tier: 1,000,000 tokens/day
#   • Excellent reasoning, tool-use and native token streaming
#   • Superior ReAct multi-step capability
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    max_output_tokens=2048,
    streaming=True,
    google_api_key=os.getenv("GOOGLE_API_KEY", ""),
)

# ─── Postgres checkpointer ───────────────────────────────────────────────────
DB_URI = os.getenv("DATABASE_URL", "")
if not DB_URI:
    raise ValueError("DATABASE_URL is not set in .env")

if DB_URI.startswith("postgres://"):
    DB_URI = DB_URI.replace("postgres://", "postgresql://", 1)

connection_pool = AsyncConnectionPool(
    conninfo=DB_URI,
    min_size=1,
    max_size=10,
    open=False,
    kwargs={"autocommit": True},
)

checkpointer = None
agent_graph = None


def get_checkpointer():
    global checkpointer
    if checkpointer is None:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        checkpointer = AsyncPostgresSaver(connection_pool)
    return checkpointer


def get_agent_graph():
    """Returns the default agent graph (no case-specific document search)."""
    global agent_graph
    if agent_graph is None:
        agent_graph = create_react_agent(
            model=llm,
            tools=SHERLOCK_TOOLS,
            prompt=SHERLOCK_SYSTEM_PROMPT,
            checkpointer=get_checkpointer(),
        )
    return agent_graph


def get_case_agent_graph(case_id: str):
    """
    Returns a ReAct agent graph with document_search scoped to the given case_id.
    This ensures the agent always searches the correct case's documents.
    Each call creates a new graph with a case-bound tool — the checkpointer
    is shared, so conversation memory is preserved across tool variants.
    """
    case_document_search = make_document_search_tool(case_id)
    tools = [web_search, calculator, case_document_search]
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=SHERLOCK_SYSTEM_PROMPT,
        checkpointer=get_checkpointer(),
    )