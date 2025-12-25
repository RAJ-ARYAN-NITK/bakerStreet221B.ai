
from dotenv import load_dotenv
load_dotenv()

import os
from typing import TypedDict, List
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# 1. Setup the Model
# We will set the GROQ_API_KEY in the terminal in the next step
if not os.environ.get("GROQ_API_KEY"):
    raise ValueError("GROQ_API_KEY is not set!")

llm = ChatGroq(model="llama3-70b-8192", temperature=0.7)

# 2. Define the State (Memory)
class AgentState(TypedDict):
    messages: List[HumanMessage | AIMessage]

# 3. Define the Node (The "Brain")
def call_model(state: AgentState):
    messages = state['messages']
    # The Sherlock Persona
    system_message = SystemMessage(content="You are Sherlock Holmes. You are analytical, precise, and slightly arrogant. Answer the user's question using deduction.")
    
    # Send history to LLM
    response = llm.invoke([system_message] + messages)
    return {"messages": [response]}

# 4. Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("sherlock", call_model)
workflow.set_entry_point("sherlock")
workflow.add_edge("sherlock", END)

app_graph = workflow.compile()