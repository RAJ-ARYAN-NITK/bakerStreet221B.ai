import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from typing import Any 
from typing import cast 

from app.agent.state import AgentState
from app.agent.nodes import sherlock_reason

load_dotenv()

# --- Database setup ---
DB_URI = os.getenv("DATABASE_URL")
if not DB_URI:
    raise ValueError("DATABASE_URL is not set!")

if DB_URI.startswith("postgres://"):
    DB_URI = DB_URI.replace("postgres://", "postgresql://", 1)

connection_pool = ConnectionPool(
    conninfo=DB_URI,
    min_size=1,
    max_size=10,
    kwargs={"autocommit": True}  # ⭐ THIS IS THE FIX
)

checkpointer = PostgresSaver(
    cast(Any, connection_pool)
)

# --- Graph ---
workflow = StateGraph(AgentState)

workflow.add_node("sherlock", sherlock_reason)
workflow.set_entry_point("sherlock")
workflow.add_edge("sherlock", END)

agent_graph = workflow.compile(checkpointer=checkpointer)