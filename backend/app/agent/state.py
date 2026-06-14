from typing import TypedDict, List
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: List[BaseMessage]

    intermediate_steps: List[str]

    iteration: int

    selected_tool: str | None

    tool_input: str | None

    evidence: List[str]
