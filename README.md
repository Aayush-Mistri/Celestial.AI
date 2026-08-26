# 🌌 Celestial.AI

A full-stack AI chatbot powered by **LangGraph** and **Groq**, featuring real-time streaming responses and a live workflow visualizer. The backend compiles a LangGraph state graph and streams Server-Sent Events (SSE) to a sleek Next.js frontend that renders tokens as they arrive.



---

## ✨ Features

- **LangGraph Execution Engine** — Runs a compiled `StateGraph` with checkpointed memory via LangGraph's `MemorySaver`, enabling persistent multi-turn conversations per thread.
- **Streaming Responses (SSE)** — The backend streams workflow status events and token-by-token AI output over Server-Sent Events for a real-time chat experience.
- **Groq-Powered LLM** — Uses Groq model hosted on Groq for fast, high-quality inference.
- **Live Workflow Visualizer** — A sidebar panel displays the graph's execution steps (`START → superbot → END`) with real-time status indicators (idle / running / complete / error).
- **Thread Memory** — Each conversation thread maintains its own message history, allowing the model to recall context from earlier messages.
- **Mermaid Graph Export** — The backend exposes the compiled graph as a Mermaid diagram string for visualization.
- **Dark Mode Support** — The UI adapts to system-level dark/light preferences out of the box.

---

## 🏗️ Architecture

```
┌─────────────────────────────┐       SSE Stream        ┌──────────────────────────────┐
│        Frontend             │ ◄────────────────────── │          Backend             │
│   Next.js 16 + React 19     │ ─── POST /api/chat ───► │   FastAPI + LangGraph        │
│   Tailwind CSS 4            │ ─── GET  /api/graph ──► │   ChatGroq                   │
│   TypeScript                │                         │   Python 3.12 + uv           │
└─────────────────────────────┘                         └──────────────────────────────┘
```

---

## 📂 Project Structure

```
celestial_ai/
├── backend/
│   ├── main.py                 # FastAPI app with /api/chat and /api/graph endpoints
│   ├── services/
│   │   └── graph.py            # LangGraph state graph definition, SSE streaming logic
│   ├── pyproject.toml          # Python project config & dependencies
│   ├── requirements.txt        # Pip-compatible dependency list
│   ├── .env.example            # Template for required environment variables
│   └── .python-version         # Python 3.12
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Geist font family
│   │   ├── page.tsx            # Main chat UI + workflow sidebar
│   │   └── globals.css         # Global styles
│   ├── package.json            # Node dependencies (Next.js 16, React 19)
│   ├── next.config.ts          # Next.js configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── postcss.config.mjs      # PostCSS + Tailwind v4
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| **Python** | ≥ 3.12 |
| **Node.js** | ≥ 18 |
| **uv** *(recommended)* | Latest — [install guide](https://docs.astral.sh/uv/) |
| **npm** | ≥ 9 |

You will also need an API key from at least one provider:

| Variable | Provider |
|----------|----------|
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/) **(required)** |
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com/) *(optional)* |
| `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/) *(optional)* |

---

### 1. Clone the Repository

```bash
git clone https://github.com/Aayush-Mistri/Celestial.AI.git
cd Celestial.AI
```

### 2. Backend Setup

```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Install dependencies (using uv — recommended)
uv sync

# Or using pip
uv add -r requirements.txt

# Start the server
uv run fastapi dev
```

The API will be available at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🔌 API Reference

### `GET /api/graph`

Returns metadata about the compiled LangGraph workflow.

**Response:**
```json
{
  "name": "Basic LangGraph Chatbot",
  "model": "llama-3.3-70b-versatile",
  "steps": [
    { "id": "start", "label": "START", "description": "..." },
    { "id": "superbot", "label": "superbot", "description": "..." },
    { "id": "end", "label": "END", "description": "..." }
  ],
  "edges": [
    { "from": "start", "to": "superbot" },
    { "from": "superbot", "to": "end" }
  ],
  "mermaid": "graph TD\n  START --> superbot\n  superbot --> END"
}
```

### `POST /api/chat`

Sends a message and streams the response as SSE events.

**Request:**
```json
{
  "message": "Hello, who are you?",
  "thread_id": "thread-1234"
}
```

**SSE Event Types:**

| Type | Description |
|------|-------------|
| `workflow` | Step status update (`running` / `complete`) |
| `token` | A word from the AI response |
| `error` | An error message from the execution engine |
| `done` | Signals the end of the stream |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** |  Groq Model |
| **Orchestration** | LangGraph + LangChain |
| **Backend** | FastAPI (Python 3.12) |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Geist font |
| **Package Manager** | uv (backend), npm (frontend) |

---

## 📄 License

This project is open source. See the repository for license details.

---

<p align="center">
  Built with ☕ and curiosity by <a href="https://github.com/Aayush-Mistri">Aayush Mistri</a>
</p>
