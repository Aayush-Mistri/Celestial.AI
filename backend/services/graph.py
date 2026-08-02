import json
from typing import Annotated, AsyncIterator, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

load_dotenv()


class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
memory = MemorySaver()


def superbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}


graph = StateGraph(State)
graph.add_node("superbot", superbot)
graph.add_edge(START, "superbot")
graph.add_edge("superbot", END)
graph_builder = graph.compile(checkpointer=memory)


WORKFLOW_STEPS = [
    {
        "id": "start",
        "label": "START",
        "description": "Request enters the graph with the user's message.",
    },
    {
        "id": "superbot",
        "label": "superbot",
        "description": "ChatGroq receives the stored conversation and creates the reply.",
    },
    {
        "id": "end",
        "label": "END",
        "description": "The graph returns the updated message state.",
    },
]

WORKFLOW_EDGES = [
    {"from": "start", "to": "superbot"},
    {"from": "superbot", "to": "end"},
]


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def get_graph_details() -> dict:
    try:
        mermaid = graph_builder.get_graph().draw_mermaid()
    except Exception:
        mermaid = "graph TD\n  START --> superbot\n  superbot --> END"

    return {
        "name": "Basic LangGraph Chatbot",
        "model": "llama-3.3-70b-versatile",
        "steps": WORKFLOW_STEPS,
        "edges": WORKFLOW_EDGES,
        "mermaid": mermaid,
    }


def _last_ai_message(messages: list[BaseMessage]) -> AIMessage | None:
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            return message
    return None


async def stream_chat(message: str, thread_id: str) -> AsyncIterator[str]:
    config = {"configurable": {"thread_id": thread_id}}

    yield _sse({"type": "workflow", "step": "start", "status": "running"})
    yield _sse({"type": "workflow", "step": "superbot", "status": "running"})

    try:
        response = graph_builder.invoke(
            {"messages": [HumanMessage(content=message)]},
            config=config,
        )
        ai_message = _last_ai_message(response["messages"])
        answer = ai_message.content if ai_message else "I could not create a response."

        yield _sse({"type": "workflow", "step": "superbot", "status": "complete"})

        for word in str(answer).split(" "):
            yield _sse({"type": "token", "content": f"{word} "})

        yield _sse({"type": "workflow", "step": "end", "status": "complete"})
        yield _sse({"type": "done"})
    except Exception as exc:
        yield _sse({"type": "error", "content": str(exc)})
        yield _sse({"type": "done"})
