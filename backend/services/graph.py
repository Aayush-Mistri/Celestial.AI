import json
from typing import Annotated, AsyncIterator, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langchain_tavily import TavilySearch
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage



SYSTEM_PROMPT = SystemMessage(content=(
    "You have access to a web search tool (tavily_search). "
    "For any question about current events, news, recent dates, prices, "
    "or anything that could have changed since your training data, "
    "you MUST call the search tool instead of answering from memory. "
    "Only skip the tool for timeless, general-knowledge questions."
))

tavilyTool = TavilySearch(max_results=2)

load_dotenv()


tools = [tavilyTool]



class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


llm = ChatGroq(model="openai/gpt-oss-120b", temperature=1)
memory = MemorySaver()

llm_with_tools = llm.bind_tools(tools)


def superbot(state: State):
    messages = [SYSTEM_PROMPT] + state["messages"]
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


graph = StateGraph(State)
graph.add_node("superbot", superbot)
graph.add_edge(START, "superbot")
graph.add_edge("superbot", END)
graph_builder = graph.compile(checkpointer=memory)


# WORKFLOW_STEPS = [
#     {                                     NO NEED JUST FEEDING FRONTEND
#         "id": "start",
#         "label": "START",
#         "description": "Request enters the graph with the user's message.",
#     },
#     {
#         "id": "superbot",
#         "label": "superbot",
#         "description": "ChatGroq receives the stored conversation and creates the reply.",
#     },
#     {
#         "id": "end",
#         "label": "END",
#         "description": "The graph returns the updated message state.",
#     },
# ]

# WORKFLOW_EDGES = [
#     {"from": "start", "to": "superbot"},
#     {"from": "superbot", "to": "end"},
# ]


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def get_graph_details() -> dict:
    try:
        mermaid = graph_builder.get_graph().draw_mermaid()
    except Exception:
        mermaid = "graph TD\n  START --> superbot\n  superbot --> END"

    return {
        "name": "Basic LangGraph Chatbot",
        "model": "openai/gpt-oss-120b",
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
