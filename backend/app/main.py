from fastapi import FastAPI
from pydantic import BaseModel
from app.agent import app_graph
from langchain_core.messages import HumanMessage
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="BakerStreet221B API")

# Allow Frontend (Port 3000) to talk to Backend (Port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Receives user input -> Sends to LangGraph Agent -> Returns Response
    """
    user_input = HumanMessage(content=request.message)
    
    # Run the agent
    result = app_graph.invoke({"messages": [user_input]})
    
    # Get the last message (Sherlock's reply)
    bot_response = result["messages"][-1].content
    return {"reply": bot_response}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)