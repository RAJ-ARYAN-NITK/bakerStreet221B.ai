# from typing import TypedDict, List, Annotated
# from langgraph.graph import add_messages

# class AgentState(TypedDict):
#     messages: Annotated[List, add_messages]

# from typing import TypedDict, List
# from langchain_core.messages import BaseMessage

# class AgentState(TypedDict):
#     messages: List[BaseMessage]
#     evidence: List[str]

# from typing import TypedDict, List
# from langchain_core.messages import BaseMessage


# class AgentState(TypedDict):
#     messages: List[BaseMessage]

#     # reasoning trace
#     intermediate_steps: List[str]

#     # loop safety
#     iteration: int
# from typing import TypedDict, List
# from langchain_core.messages import BaseMessage


# class AgentState(TypedDict):
#     messages: List[BaseMessage]

#     # ReAct reasoning trace
#     intermediate_steps: List[str]

#     # loop counter
#     iteration: int

#     # retrieved evidence
#     evidence: List[str]

from typing import TypedDict, List
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: List[BaseMessage]

    intermediate_steps: List[str]

    iteration: int

    selected_tool: str | None

    tool_input: str | None

    evidence: List[str]