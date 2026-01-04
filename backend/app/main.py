# from fastapi import FastAPI
# from pydantic import BaseModel
# from app.agent import app_graph
# from langchain_core.messages import HumanMessage
# from fastapi.middleware.cors import CORSMiddleware
# import uvicorn

# app = FastAPI(title="BakerStreet221B API")

# # Allow Frontend (Port 3000) to talk to Backend (Port 8000)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# async def root():
#     """Health check endpoint"""
#     return {"status": "ok", "message": "BakerStreet221B API is running"}

# class ChatRequest(BaseModel):
#     message: str

# @app.post("/chat")
# async def chat_endpoint(request: ChatRequest):
#     """
#     Receives user input -> Sends to LangGraph Agent -> Returns Response
#     """
#     user_input = HumanMessage(content=request.message)
    
#     # Run the agent
#     result = app_graph.invoke({"messages": [user_input]})
    
#     # Get the last message (Sherlock's reply)
#     bot_response = result["messages"][-1].content
#     return {"reply": bot_response}

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)

# import uuid
# from fastapi import FastAPI
# from pydantic import BaseModel
# from app.agent import app_graph
# from langchain_core.messages import HumanMessage
# from fastapi.middleware.cors import CORSMiddleware
# import uvicorn

# app = FastAPI(title="BakerStreet221B API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# async def root():
#     """Health check endpoint"""
#     return {"status": "ok", "message": "BakerStreet221B API is running"}

# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None  # Frontend sends this to resume a chat

# @app.post("/chat")
# async def chat_endpoint(request: ChatRequest):
#     """
#     Endpoint that uses LangGraph Persistence.
#     If thread_id is provided, it loads past memory.
#     """
#     # 1. Generate a thread_id if the user didn't send one (New Case)
#     thread_id = request.thread_id or str(uuid.uuid4())
    
#     # 2. Tell LangGraph which "Case File" to use
#     config = {"configurable": {"thread_id": thread_id}}
    
#     user_input = HumanMessage(content=request.message)
    
#     # 3. Run the Agent
#     # LangGraph automatically:
#     # a. Fetches history for this thread_id from Postgres
#     # b. Adds the new message
#     # c. Generates response
#     # d. Saves the new state back to Postgres
#     result = app_graph.invoke({"messages": [user_input]}, config=config)  # type: ignore
    
#     bot_response = result["messages"][-1].content

#     return {
#         "response": bot_response, 
#         "thread_id": thread_id # Send ID back so frontend can save it
#     }

# if __name__ == "__main__":
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)



# import uuid
# from fastapi import FastAPI
# from pydantic import BaseModel
# # 1. NEW: Import 'checkpointer' so we can access its setup function
# from app.agent import app_graph, checkpointer  # <--- CHANGED
# from langchain_core.messages import HumanMessage
# from fastapi.middleware.cors import CORSMiddleware
# import uvicorn

# app = FastAPI(title="BakerStreet221B API")

# # 2. NEW: Create Database Tables on Startup
# # This runs automatically when the server starts.
# @app.on_event("startup")
# def on_startup():
#     print("Creating database tables...")
#     checkpointer.setup()  # <--- THIS IS THE FIX
#     print("Database tables created!")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# async def root():
#     """Health check endpoint"""
#     return {"status": "ok", "message": "BakerStreet221B API is running"}

# class ChatRequest(BaseModel):
#     message: str
#     thread_id: str | None = None  # Frontend sends this to resume a chat

# @app.post("/chat")
# async def chat_endpoint(request: ChatRequest):
#     """
#     Endpoint that uses LangGraph Persistence.
#     If thread_id is provided, it loads past memory.
#     """
#     # 1. Generate a thread_id if the user didn't send one (New Case)
#     thread_id = request.thread_id or str(uuid.uuid4())
    
#     # 2. Tell LangGraph which "Case File" to use
#     config = {"configurable": {"thread_id": thread_id}}
    
#     user_input = HumanMessage(content=request.message)
    
#     # 3. Run the Agent
#     result = app_graph.invoke({"messages": [user_input]}, config=config)  # type: ignore
    
#     bot_response = result["messages"][-1].content

#     return {
#         "response": bot_response, 
#         "thread_id": thread_id # Send ID back so frontend can save it
#     }

# if __name__ == "__main__":
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

import uvicorn

from app.agent import checkpointer
from app.api.chat import router as chat_router


app = FastAPI(title="BakerStreet221B API")

# --------------------------------------------------
# Startup: create LangGraph persistence tables
# --------------------------------------------------
@app.on_event("startup")
def on_startup():
    print("Initializing LangGraph persistence...")
    checkpointer.setup()
    print("Persistence ready.")

# --------------------------------------------------
# Middleware
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "BakerStreet221B API is running"
    }

# --------------------------------------------------
# API Routes
# --------------------------------------------------
app.include_router(chat_router, prefix="")

# --------------------------------------------------
# Local dev entrypoint
# --------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )