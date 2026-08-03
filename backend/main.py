import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.graph import get_graph_details, stream_chat

app = FastAPI()

# Default origins for local development
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

# Add origins from environment variable
# Example:
# ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    allowed_origins.extend(
        [
            origin.strip()
            for origin in env_origins.split(",")
            if origin.strip()
        ]
    )

# Remove duplicates
allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/api/graph")
async def graph_endpoint():
    return get_graph_details()


@app.get("/api/admin")
async def admin_endpoint():
    return {"message": "haha nice try"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_chat(request.message, request.thread_id),
        media_type="text/event-stream",
    )