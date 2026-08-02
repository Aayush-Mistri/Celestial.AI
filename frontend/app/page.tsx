"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

type WorkflowStatus = "idle" | "running" | "complete" | "error";

type GraphStep = {
  id: string;
  label: string;
  description: string;
};

type GraphEdge = {
  from: string;
  to: string;
};

type GraphDetails = {
  name: string;
  model: string;
  steps: GraphStep[];
  edges: GraphEdge[];
  mermaid: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const defaultGraph: GraphDetails = {
  name: "Basic LangGraph Chatbot",
  model: "llama-3.3-70b-versatile",
  steps: [
    {
      id: "start",
      label: "START",
      description: "Request enters the graph with the user's message.",
    },
    {
      id: "superbot",
      label: "superbot",
      description: "ChatGroq receives the stored conversation and creates the reply.",
    },
    {
      id: "end",
      label: "END",
      description: "The graph returns the updated message state.",
    },
  ],
  edges: [
    { from: "start", to: "superbot" },
    { from: "superbot", to: "end" },
  ],
  mermaid: "graph TD\n  START --> superbot\n  superbot --> END",
};

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19V5m0 0-6 6m6-6 6 6" />
  </svg>
);

const ResetIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6M20 20v-6h-6M5.7 15A7 7 0 0 0 18 18.3M18.3 9A7 7 0 0 0 6 5.7" />
  </svg>
);

const AgentMark = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-950 text-[11px] font-semibold text-white dark:bg-neutral-100 dark:text-neutral-950">
    G
  </div>
);

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [graphDetails, setGraphDetails] = useState<GraphDetails>(defaultGraph);
  const [workflow, setWorkflow] = useState<Record<string, WorkflowStatus>>({
    start: "idle",
    superbot: "idle",
    end: "idle",
  });
  const [threadId, setThreadId] = useState(() => `thread-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    "Hi, my name is Aayush",
    "What is my name?",
    "Explain this LangGraph flow",
    "Give me a short AI agent idea",
  ];

  const completedSteps = useMemo(
    () => Object.values(workflow).filter((status) => status === "complete").length,
    [workflow],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`${API_BASE}/api/graph`)
      .then((response) => response.json())
      .then((data) => setGraphDetails(data))
      .catch(() => setGraphDetails(defaultGraph));
  }, []);

  const resetThread = () => {
    setThreadId(`thread-${Date.now()}`);
    setMessages([]);
    setLatency(null);
    setWorkflow({ start: "idle", superbot: "idle", end: "idle" });
    textareaRef.current?.focus();
  };

  const setStepStatus = (step: string, status: WorkflowStatus) => {
    setWorkflow((prev) => ({ ...prev, [step]: status }));
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const startTime = performance.now();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmedInput,
      timestamp: getTime(),
    };
    const aiMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: aiMessageId, sender: "ai", text: "", timestamp: getTime() },
    ]);
    setInput("");
    setLatency(null);
    setIsLoading(true);
    setWorkflow({ start: "running", superbot: "idle", end: "idle" });

    let accumulatedResponse = "";

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput, thread_id: threadId }),
      });

      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      if (!response.body) throw new Error("No response stream found");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;

          const rawData = line.slice(6);
          const payload = JSON.parse(rawData);

          if (payload.type === "workflow") {
            setStepStatus(payload.step, payload.status);
          }

          if (payload.type === "token") {
            accumulatedResponse += payload.content;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiMessageId
                  ? { ...message, text: accumulatedResponse }
                  : message,
              ),
            );
          }

          if (payload.type === "error") {
            setStepStatus("superbot", "error");
            throw new Error(payload.content);
          }
        }
      }

      setLatency(Math.round(performance.now() - startTime));
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "Error connecting to execution engine.";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? { ...message, text: `Backend error: ${errorText}` }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="flex min-h-screen bg-[#f7f7f3] text-neutral-950 dark:bg-[#111111] dark:text-neutral-100">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-[#f7f7f3]/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-[#111111]/90 sm:px-7">
          <div className="flex items-center gap-3">
            <AgentMark />
            <div>
              <p className="text-sm font-semibold">LangGraph Chatbot</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {graphDetails.model}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {latency !== null && (
              <span className="hidden text-xs text-neutral-500 sm:inline">{latency}ms</span>
            )}
            <button
              type="button"
              onClick={resetThread}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition hover:border-neutral-500 hover:text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500"
              title="Reset memory"
            >
              <ResetIcon />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.length === 0 && (
              <div className="flex min-h-[54vh] flex-col justify-center gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Notebook to backend graph
                  </p>
                  <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    Chat with the raw LangGraph flow from your ipynb.
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    The backend keeps thread memory, runs the compiled graph, and streams
                    workflow events back into this page.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInput(suggestion);
                        textareaRef.current?.focus();
                      }}
                      className="rounded-lg border border-neutral-200 bg-white p-3 text-left text-sm text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col gap-1.5 ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <span className="px-1 text-[11px] text-neutral-500">
                  {message.sender === "user" ? "You" : "Graph"} at {message.timestamp}
                </span>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm leading-6 sm:max-w-[76%] ${
                    message.sender === "user"
                      ? "border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                      : "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                  }`}
                >
                  {message.text || (
                    <span className="inline-flex items-center gap-2 text-neutral-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                      Running graph...
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="border-t border-neutral-200 bg-[#f7f7f3] px-4 py-4 dark:border-neutral-800 dark:bg-[#111111] sm:px-7">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl flex-col rounded-xl border border-neutral-300 bg-white shadow-sm transition focus-within:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the LangGraph chatbot..."
              rows={2}
              disabled={isLoading}
              className="min-h-16 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-400 disabled:opacity-60"
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <span className="text-xs text-neutral-500">
                Thread memory: {threadId.replace("thread-", "#")}
              </span>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300 dark:disabled:bg-neutral-800"
                title="Send"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </footer>
      </section>

      <aside className="hidden w-[390px] shrink-0 border-l border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950 lg:block">
        <div className="flex h-full flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Backend flow
            </p>
            <h2 className="mt-2 text-xl font-semibold">{graphDetails.name}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {completedSteps}/{graphDetails.steps.length} steps completed in the latest run.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              {graphDetails.steps.map((step, index) => {
                const status = workflow[step.id] || "idle";
                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xs font-semibold ${
                          status === "complete"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : status === "running"
                              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              : status === "error"
                                ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                : "border-neutral-300 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-center text-xs font-medium">{step.label}</span>
                    </div>
                    {index < graphDetails.steps.length - 1 && (
                      <div className="mx-1 h-px w-8 bg-neutral-300 dark:bg-neutral-700" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {graphDetails.steps.map((step) => {
              const status = workflow[step.id] || "idle";
              return (
                <div
                  key={step.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] uppercase text-neutral-500 dark:border-neutral-700">
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800">
              Mermaid
            </div>
            <pre className="h-full overflow-auto p-3 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
              {graphDetails.mermaid}
            </pre>
          </div>
        </div>
      </aside>
    </main>
  );
}
