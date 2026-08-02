import json
import traceback
from typing import Annotated, AsyncIterator, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_tavily import TavilySearch

load_dotenv()

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = SystemMessage(
    content=(
        "You are Celestial Being — a highly capable, thoughtful AI assistant.\n\n"
        "## Tool Usage\n"
        "You have access to a web search tool (`tavily_search`). You MUST call it when:\n"
        "- The user asks about current events, news, weather, prices, or live data.\n"
        "- The user asks for facts that may have changed after your training cutoff.\n"
        "- You are NOT confident in the accuracy of your answer.\n"
        "- The user explicitly asks you to search or look something up.\n"
        "When calling the search tool, provide a specific, well-formed search query "
        "(not the raw user message). For example, if the user says 'what's happening "
        "with SpaceX', search for 'SpaceX latest news 2025'.\n\n"
        "Do NOT call the search tool for:\n"
        "- Simple greetings or small talk.\n"
        "- Timeless general knowledge (math, definitions, coding help).\n"
        "- Questions where you are highly confident in your answer.\n\n"
        "## Response Formatting\n"
        "- Use **Markdown** to structure your responses for readability.\n"
        "- Use headings (`##`, `###`) to organize long answers.\n"
        "- Use **bold** for key terms and *italics* for emphasis.\n"
        "- Use bullet points (`-`) or numbered lists for multi-part answers.\n"
        "- Use code blocks (``` ```) for code snippets.\n"
        "- Keep paragraphs concise (2-4 sentences).\n"
        "- Be direct and helpful. Avoid filler phrases.\n\n"
        "## Personality\n"
        "You are warm, precise, and concise. You respect the user's time."
    )
)

# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------
tavily_tool = TavilySearch(max_results=3)
tools = [tavily_tool]

# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------
llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0.7)
llm_with_tools = llm.bind_tools(tools)

# ---------------------------------------------------------------------------
# Graph state
# ---------------------------------------------------------------------------

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def superbot(state: State):
    """Call the LLM with the system prompt + conversation history."""
    messages = [SYSTEM_PROMPT] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


# Prebuilt ToolNode executes any tool calls the LLM made
tool_node = ToolNode(tools)


# ---------------------------------------------------------------------------
# Conditional routing
# ---------------------------------------------------------------------------

def should_use_tools(state: State) -> str:
    """If the last AI message contains tool calls, route to tool_node."""
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tool_node"
    return END


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------
memory = MemorySaver()

graph = StateGraph(State)
graph.add_node("superbot", superbot)
graph.add_node("tool_node", tool_node)

graph.add_edge(START, "superbot")
graph.add_conditional_edges("superbot", should_use_tools, {"tool_node": "tool_node", END: END})
graph.add_edge("tool_node", "superbot")  # loop back after tool execution

graph_builder = graph.compile(checkpointer=memory)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def get_graph_details() -> dict:
    try:
        mermaid = graph_builder.get_graph().draw_mermaid()
    except Exception:
        mermaid = (
            "graph TD\n"
            "  START --> superbot\n"
            "  superbot -->|tool calls| tool_node\n"
            "  superbot -->|no tools| END\n"
            "  tool_node --> superbot"
        )

    return {
        "name": "Celestial Being — AI Agent",
        "model": "openai/gpt-oss-120b",
        "mermaid": mermaid,
    }


def _last_ai_message(messages: list[BaseMessage]) -> AIMessage | None:
    for message in reversed(messages):
        if isinstance(message, AIMessage):
            return message
    return None


# ---------------------------------------------------------------------------
# Streaming chat with tool-activity events
# ---------------------------------------------------------------------------

async def stream_chat(message: str, thread_id: str) -> AsyncIterator[str]:
    config = {"configurable": {"thread_id": thread_id}}

    yield _sse({"type": "workflow", "step": "start", "status": "running"})
    yield _sse({"type": "workflow", "step": "superbot", "status": "running"})

    try:
        # Use stream() to get events per node so we can emit tool activity
        final_state = None
        tool_call_count = 0

        for event in graph_builder.stream(
            {"messages": [HumanMessage(content=message)]},
            config=config,
            stream_mode="updates",
        ):
            for node_name, node_output in event.items():
                if node_name == "superbot":
                    # Check if the LLM decided to call tools
                    ai_msgs = [
                        m for m in node_output.get("messages", [])
                        if isinstance(m, AIMessage)
                    ]
                    for ai_msg in ai_msgs:
                        if ai_msg.tool_calls:
                            for tc in ai_msg.tool_calls:
                                tool_call_count += 1
                                # Extract the search query or args for display
                                tool_input = ""
                                if isinstance(tc.get("args"), dict):
                                    tool_input = tc["args"].get("query", "")
                                    if not tool_input:
                                        tool_input = json.dumps(tc["args"])
                                yield _sse({
                                    "type": "tool_call",
                                    "name": tc.get("name", "unknown_tool"),
                                    "input": tool_input,
                                })

                elif node_name == "tool_node":
                    # Tool finished executing — send results back
                    tool_msgs = [
                        m for m in node_output.get("messages", [])
                        if isinstance(m, ToolMessage)
                    ]
                    for tm in tool_msgs:
                        status = "success"
                        summary = ""
                        if tm.status == "error" or (isinstance(tm.content, str) and "error" in tm.content.lower()):
                            status = "error"
                            summary = tm.content[:200] if isinstance(tm.content, str) else "Tool returned an error"
                        else:
                            content_str = tm.content if isinstance(tm.content, str) else json.dumps(tm.content)
                            summary = f"Got {len(content_str)} chars of results"

                        yield _sse({
                            "type": "tool_result",
                            "name": tm.name or "unknown_tool",
                            "status": status,
                            "summary": summary,
                        })

            # Keep track of final state
            final_state = event

        # Now get the full state to extract the final AI answer
        full_state = graph_builder.get_state(config)
        all_messages = full_state.values.get("messages", [])
        ai_message = _last_ai_message(all_messages)

        if ai_message and ai_message.content:
            answer = str(ai_message.content)
        elif tool_call_count > 0:
            answer = "I searched for information but couldn't generate a summary. Please try rephrasing your question."
        else:
            answer = "I wasn't able to generate a response. Please try again."

        yield _sse({"type": "workflow", "step": "superbot", "status": "complete"})

        # Stream word-by-word for the typing effect
        words = answer.split(" ")
        for word in words:
            yield _sse({"type": "token", "content": f"{word} "})

        yield _sse({"type": "workflow", "step": "end", "status": "complete"})
        yield _sse({"type": "done"})

    except Exception as exc:
        error_str = str(exc)
        tb = traceback.format_exc()

        # Categorize errors for user-friendly messages
        if "rate_limit" in error_str.lower() or "429" in error_str:
            user_error = "Rate limit exceeded. Please wait a moment and try again."
        elif "api_key" in error_str.lower() or "authentication" in error_str.lower() or "401" in error_str:
            user_error = "API key authentication failed. Please check your environment variables."
        elif "timeout" in error_str.lower() or "timed out" in error_str.lower():
            user_error = "The request timed out. The model or search service may be slow right now."
        elif "tavily" in error_str.lower():
            user_error = f"Web search failed: {error_str}"
        elif "connection" in error_str.lower():
            user_error = "Connection error. Please check your network and API endpoints."
        else:
            user_error = f"An error occurred: {error_str}"

        # Log the full traceback server-side
        print(f"[STREAM ERROR] {tb}")

        yield _sse({"type": "workflow", "step": "superbot", "status": "error"})
        yield _sse({"type": "error", "content": user_error, "detail": error_str})
        yield _sse({"type": "done"})
