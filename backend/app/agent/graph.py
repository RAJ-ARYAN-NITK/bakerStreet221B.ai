import os
from typing import Any, cast

from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from app.agent.state import AgentState
from app.agent.nodes import sherlock_reason

load_dotenv()

# --------------------------------------------------
# Database setup
# --------------------------------------------------
DB_URI = os.getenv("DATABASE_URL")
if not DB_URI:
    raise ValueError("DATABASE_URL is not set!")

# Fix postgres:// → postgresql://
if DB_URI.startswith("postgres://"):
    DB_URI = DB_URI.replace("postgres://", "postgresql://", 1)

connection_pool = ConnectionPool(
    conninfo=DB_URI,
    min_size=1,
    max_size=10,
    kwargs={"autocommit": True},
)

checkpointer = PostgresSaver(cast(Any, connection_pool))

# --------------------------------------------------
# LangGraph workflow
# --------------------------------------------------
workflow = StateGraph(AgentState)

# ✅ ONLY pass function (NO config param)
workflow.add_node("sherlock", sherlock_reason)

workflow.set_entry_point("sherlock")
workflow.add_edge("sherlock", END)

# Compile graph with persistence
agent_graph = workflow.compile(checkpointer=checkpointer)