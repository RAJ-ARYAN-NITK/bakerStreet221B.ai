from langchain_groq import ChatGroq
from app.agent.state import AgentState
from app.agent.prompts import SHERLOCK_SYSTEM_PROMPT

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.7,
)

def sherlock_reason(state: AgentState):
    messages = [SHERLOCK_SYSTEM_PROMPT] + state["messages"]
    response = llm.invoke(messages)

    return {
        "messages": [response]
    }