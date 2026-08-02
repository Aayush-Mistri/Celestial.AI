import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.graph import get_graph_details, stream_chat

app = FastAPI()

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins.extend([origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"


@app.get("/api/graph")
async def graph_endpoint():
    return get_graph_details()

@app.get("/api/admin")
async def admin_endpoint():
    return "haha nice try"


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_chat(request.message, request.thread_id),
        media_type="text/event-stream",
    )
