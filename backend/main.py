import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# VERY IMPORTANT: Enable CORS for Next.js (http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

# An asynchronous generator to simulate/proxy an AI stream
async def event_generator(user_message: str):
    # This is a dummy example. Replace this with your actual
    # LangChain/LangGraph/OpenAI streaming logic.
    prefix = f"You asked about '{user_message}'. Here is my streamed response: "
    full_response = prefix + "This response is generated token-by-token to demonstrate streaming. It shows how the data arrives incrementally, creating a real-time experience. We are simulating the delay to show how the frontend handles each chunk."
    
    # Split the response into words or chunks
    words = full_response.split(' ')
    for word in words:
        # FastAPI handles the SSE 'data: ' format for StreamingResponse
        # Make sure to yield a simple string if you use media_type="text/event-stream"
        yield f"data: {word} \n\n"
        await asyncio.sleep(0.05) # Simulating LLM generation time
    
    # Optional: Send a final [DONE] message so the frontend knows to stop listening
    yield "data: [DONE]\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    # This POST endpoint kicks off the StreamingResponse
    return StreamingResponse(
        event_generator(request.message),
        media_type="text/event-stream"
    )