"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import Loading from "./loading";

/* ---------------------------------- */
/* Types                              */
/* ---------------------------------- */

type ToolActivity = {
  id: string;
  name: string;
  input: string;
  status: "running" | "success" | "error";
  summary?: string;
};

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isError?: boolean;
  toolActivities?: ToolActivity[];
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
  name: "Celestial Being — AI Agent",
  model: "",
  steps: [
    { id: "start", label: "START", description: "Request enters the graph with the user's message." },
    { id: "superbot", label: "superbot", description: "ChatGroq receives the stored conversation and creates the reply." },
    { id: "tool_node", label: "tool_node", description: "Executes tool calls (e.g. Tavily web search)." },
    { id: "end", label: "END", description: "The graph returns the updated message state." },
  ],
  edges: [
    { from: "start", to: "superbot" },
    { from: "superbot", to: "tool_node" },
    { from: "tool_node", to: "superbot" },
    { from: "superbot", to: "end" },
  ],
  mermaid: "graph TD\n  START --> superbot\n  superbot -->|tool calls| tool_node\n  superbot -->|no tools| END\n  tool_node --> superbot",
};

/* ---------------------------------- */
/* Icons                              */
/* ---------------------------------- */

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-14 0M12 18v3" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 19V5m0 0l-6 6m6-6l6 6" />
  </svg>
);

const ResetIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v6h6M20 20v-6h-6M5.7 15A7 7 0 0 0 18 18.3M18.3 9A7 7 0 0 0 6 5.7" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const AgentMark = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-[4px] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-semibold tracking-tight">
    C
  </div>
);

const SidebarIconButton = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <button
    type="button"
    title={title}
    className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
  >
    {children}
  </button>
);

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ---------------------------------- */
/* Tool display name mapping          */
/* ---------------------------------- */

function formatToolName(name: string): string {
  const map: Record<string, string> = {
    tavily_search: "Web Search",
    tavily: "Web Search",
  };
  return map[name.toLowerCase()] || name;
}

/* ---------------------------------- */
/* Tool Activity Indicator Component  */
/* ---------------------------------- */

function ToolActivityIndicator({ activities }: { activities: ToolActivity[] }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans transition-all duration-300 ${
            activity.status === "running"
              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
              : activity.status === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50"
          }`}
        >
          {activity.status === "running" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <SearchIcon />
              <span className="font-medium">{formatToolName(activity.name)}</span>
              {activity.input && (
                <span className="text-blue-500 dark:text-blue-400 truncate max-w-[200px]">
                  &quot;{activity.input}&quot;
                </span>
              )}
              <span className="text-blue-400 dark:text-blue-500 animate-pulse">…</span>
            </>
          ) : activity.status === "success" ? (
            <>
              <CheckIcon />
              <span className="font-medium">{formatToolName(activity.name)}</span>
              <span className="text-emerald-500 dark:text-emerald-400">
                {activity.summary || "Complete"}
              </span>
            </>
          ) : (
            <>
              <AlertIcon />
              <span className="font-medium">{formatToolName(activity.name)}</span>
              <span className="text-red-500 dark:text-red-400 truncate max-w-[250px]">
                {activity.summary || "Failed"}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- */
/* Markdown Components                */
/* ---------------------------------- */

const markdownComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-bold mt-4 mb-2 text-neutral-900 dark:text-neutral-100" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-bold mt-3 mb-1.5 text-neutral-900 dark:text-neutral-100" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-bold mt-2.5 mb-1 text-neutral-900 dark:text-neutral-100" {...props}>{children}</h3>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>{children}</li>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-neutral-900 dark:text-neutral-100" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-neutral-700 dark:text-neutral-300" {...props}>{children}</em>
  ),
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[13px] font-mono text-pink-600 dark:text-pink-400"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className} text-[13px] font-mono`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="rounded-lg bg-neutral-900 dark:bg-neutral-950 text-neutral-100 p-3 mb-2 overflow-x-auto text-[13px] leading-relaxed border border-neutral-800"
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-3 border-neutral-300 dark:border-neutral-600 pl-3 my-2 text-neutral-600 dark:text-neutral-400 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-sm border-collapse border border-neutral-200 dark:border-neutral-700" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-3 py-1.5 text-left font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700" {...props}>
      {children}
    </td>
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-3 border-neutral-200 dark:border-neutral-700" {...props} />
  ),
};

/* ---------------------------------- */
/* Page                               */
/* ---------------------------------- */

export default function Home() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [graphDetails, setGraphDetails] = useState<GraphDetails>(defaultGraph);
  const [workflow, setWorkflow] = useState<Record<string, WorkflowStatus>>({
    start: "idle",
    superbot: "idle",
    tool_node: "idle",
    end: "idle",
  });
  const [threadId, setThreadId] = useState<string>("");
  const [activeToolActivities, setActiveToolActivities] = useState<ToolActivity[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    "Hi, my name is Aayush",
    "What is my name?",
    "What's the latest news about AI?",
    "Give me a short AI agent idea",
  ];

  // Generate the thread id only after mount so the server-rendered HTML
  // and the client's first render match exactly (fixes hydration mismatch).
  useEffect(() => {
    setThreadId(`thread-${Date.now()}`);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeToolActivities]);

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
    setWorkflow({ start: "idle", superbot: "idle", tool_node: "idle", end: "idle" });
    setActiveToolActivities([]);
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
      { id: aiMessageId, sender: "ai", text: "", timestamp: getTime(), toolActivities: [] },
    ]);
    setInput("");
    setLatency(null);
    setIsLoading(true);
    setWorkflow({ start: "running", superbot: "idle", tool_node: "idle", end: "idle" });
    setActiveToolActivities([]);

    let accumulatedResponse = "";
    const toolActivities: ToolActivity[] = [];
    let hasReceivedTokens = false;
    let hasError = false;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput, thread_id: threadId }),
      });

      if (!response.ok) {
        const statusText = response.statusText || "Unknown error";
        throw new Error(`Backend returned ${response.status} (${statusText})`);
      }
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
          let payload;
          try {
            payload = JSON.parse(rawData);
          } catch {
            console.warn("Failed to parse SSE payload:", rawData);
            continue;
          }

          if (payload.type === "workflow") {
            setStepStatus(payload.step, payload.status);
          }

          if (payload.type === "tool_call") {
            const activity: ToolActivity = {
              id: crypto.randomUUID(),
              name: payload.name,
              input: payload.input || "",
              status: "running",
            };
            toolActivities.push(activity);
            setActiveToolActivities([...toolActivities]);
            // Attach to the AI message
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiMessageId
                  ? { ...message, toolActivities: [...toolActivities] }
                  : message,
              ),
            );
          }

          if (payload.type === "tool_result") {
            // Find the matching running tool and update it
            const runningIdx = toolActivities.findIndex(
              (ta) => ta.name === payload.name && ta.status === "running"
            );
            if (runningIdx !== -1) {
              toolActivities[runningIdx] = {
                ...toolActivities[runningIdx],
                status: payload.status === "error" ? "error" : "success",
                summary: payload.summary || "",
              };
            }
            setActiveToolActivities([...toolActivities]);
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiMessageId
                  ? { ...message, toolActivities: [...toolActivities] }
                  : message,
              ),
            );
          }

          if (payload.type === "token") {
            hasReceivedTokens = true;
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
            hasError = true;
            setStepStatus("superbot", "error");
            const errorContent = payload.content || "An unknown error occurred";
            const detail = payload.detail || "";
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiMessageId
                  ? {
                      ...message,
                      text: errorContent,
                      isError: true,
                      toolActivities: [...toolActivities],
                    }
                  : message,
              ),
            );
          }
        }
      }

      // Handle empty response (no tokens and no explicit error)
      if (!hasReceivedTokens && !hasError) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === aiMessageId
              ? {
                  ...message,
                  text: "No response was generated. The model may have encountered an issue or returned an empty reply. Please try again.",
                  isError: true,
                }
              : message,
          ),
        );
      }

      setLatency(Math.round(performance.now() - startTime));
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "Error connecting to execution engine.";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === aiMessageId
            ? { ...message, text: errorText, isError: true }
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

  if (isPageLoading) {
    return <Loading onComplete={() => setIsPageLoading(false)} />;
  }

  return (
    <main className="flex h-screen w-full font-mono antialiased bg-[#F7F7F5] dark:bg-[#121212] text-neutral-900 dark:text-neutral-100">
      {/* Icon rail */}
      <aside className="hidden sm:flex flex-col items-center justify-between w-16 py-4 border-r border-neutral-200 dark:border-neutral-800 bg-[#F0F0EE] dark:bg-[#161616]">
        <div className="flex flex-col items-center gap-3">
          <Link href="/">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer">
              <HomeIcon />
            </div>
          </Link>
          <div className="w-6 h-px bg-neutral-300 dark:bg-neutral-700 my-1" />
          <SidebarIconButton title="New Chat">
            <PlusIcon />
          </SidebarIconButton>
          <SidebarIconButton title="Chat History">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.078-.163-3.024-.463L3 21l1.395-3.72C3.512 16.042 3 14.574 3 13c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </SidebarIconButton>
        </div>
        <SidebarIconButton title="Settings">
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            />
          </svg>
        </SidebarIconButton>
      </aside>

      {/* Chat column */}
      <div className="relative flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-5 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-[#F7F7F5]/90 dark:bg-[#121212]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <AgentMark />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold tracking-wide text-neutral-800 dark:text-neutral-200">
                Celestial Being
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
                {graphDetails.model}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {latency !== null && (
              <span className="hidden sm:inline text-neutral-500 dark:text-neutral-500">
                {latency}ms
              </span>
            )}
            <button
              type="button"
              onClick={resetThread}
              title="Reset memory"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
            >
              <ResetIcon />
            </button>
          </div>
        </header>

        {/* Message stream */}
        <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-8">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[62vh] text-center space-y-7">
                <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Let&apos;s chat.
                </h1>
                <p className="max-w-sm text-sm font-sans text-neutral-500 dark:text-neutral-400">
                  Connected to your LangGraph backend. Thread memory persists until you reset it.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full text-left">
                  {suggestions.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                      className="p-3 text-xs font-sans text-left border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-[#191919] hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="text-neutral-400 dark:text-neutral-600 mr-2">→</span>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                } space-y-1.5`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest px-1">
                  {msg.sender === "user" ? (
                    <>
                      <span>You</span> <UserIcon />
                    </>
                  ) : (
                    <>
                      <AgentMark />
                      <span className="text-neutral-500 dark:text-neutral-400 font-semibold normal-case">
                        Celestial Being
                      </span>
                    </>
                  )}
                  <span className="lowercase tracking-normal">· {msg.timestamp}</span>
                </div>

                {/* Tool activity indicators (only for AI messages) */}
                {msg.sender === "ai" && msg.toolActivities && msg.toolActivities.length > 0 && (
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <ToolActivityIndicator activities={msg.toolActivities} />
                  </div>
                )}

                {/* Message bubble */}
                {msg.isError ? (
                  /* Error message card */
                  <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm rounded-xl border font-sans leading-relaxed bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">
                        <AlertIcon />
                      </span>
                      <div>
                        <p className="font-medium text-xs uppercase tracking-wide mb-1 text-red-500 dark:text-red-400">
                          Error
                        </p>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm rounded-xl border font-sans leading-relaxed
                      ${
                        msg.sender === "user"
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 whitespace-pre-wrap"
                          : "bg-white dark:bg-[#191919] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800"
                      }`}
                  >
                    {msg.sender === "ai" ? (
                      msg.text ? (
                        <div className="prose-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        isLoading && (
                          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 dark:text-neutral-600">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 dark:bg-neutral-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500 dark:bg-neutral-400"></span>
                            </span>
                            <span>Thinking…</span>
                          </div>
                        )
                      )
                    ) : (
                      msg.text
                    )}
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <footer className="sticky bottom-0 z-20 px-4 sm:px-6 pb-5 pt-2 bg-gradient-to-t from-[#F7F7F5] dark:from-[#121212] via-[#F7F7F5]/95 dark:via-[#121212]/95 to-transparent">
          <div className="max-w-3xl mx-auto w-full">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col border border-neutral-300 dark:border-neutral-700 rounded-2xl bg-white dark:bg-[#191919] focus-within:border-neutral-500 dark:focus-within:border-neutral-500 transition-colors shadow-sm"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Celestial Being anything…"
                rows={2}
                disabled={isLoading}
                className="w-full px-4 pt-3.5 pb-1.5 bg-transparent border-none text-sm font-sans focus:outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 disabled:opacity-50"
              />

              <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <PlusIcon />
                  </button>
                  <span className="hidden sm:inline text-[11px] text-neutral-400 dark:text-neutral-600 font-sans ml-1">
                    {threadId ? `Thread ${threadId.replace("thread-", "#")} · ` : ""}Enter to send
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <MicIcon />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </footer>
      </div>
    </main>
  );
}
