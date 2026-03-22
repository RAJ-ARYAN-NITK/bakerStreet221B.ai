import os
from typing import Any, cast
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from app.agent.state import AgentState
from app.agent.nodes import sherlock_reason, execute_tool
 
load_dotenv()
 

DB_URI = os.getenv("DATABASE_URL") or ""
 

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
# LangGraph Workflow
# --------------------------------------------------
 
workflow = StateGraph(AgentState)
workflow.add_node("reason", sherlock_reason)
workflow.add_node("tool", execute_tool)
workflow.set_entry_point("reason")
 
# --------------------------------------------------
# Routing logic after reasoning
# --------------------------------------------------
 
def route_after_reason(state: AgentState):
    iteration = state.get("iteration", 0)
    tool = state.get("selected_tool")
 
    # Hard safety stop
    if iteration >= 6:
        return "end"
 
    # Force retrieval first if nothing searched yet
    steps = state.get("intermediate_steps", [])
    if not any("Observation" in step for step in steps):
        state["selected_tool"] = "search_evidence"
        return "tool"
 
    # Execute tool if valid
    if tool in ["search_evidence", "ask_user", "final_answer"]:
        return "tool"
 
    return "end"
 
workflow.add_conditional_edges(
    "reason",
    route_after_reason,
    {
        "tool": "tool",
        "end": END,
    },
)
 
# --------------------------------------------------
# Routing logic after tool execution
# --------------------------------------------------
 
def route_after_tool(state: AgentState):
    tool = state.get("selected_tool")
 
    # Stop if agent answered or asked user
    if tool in ["final_answer", "ask_user"]:
        return "end"
 
    return "reason"
 
workflow.add_conditional_edges(
    "tool",
    route_after_tool,
    {
        "reason": "reason",
        "end": END,
    },
)
 
# --------------------------------------------------
# Compile graph
# --------------------------------------------------
 
agent_graph = workflow.compile(checkpointer=checkpointer)
 