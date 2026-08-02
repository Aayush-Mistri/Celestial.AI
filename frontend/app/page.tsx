"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

// Sarvam AI-inspired custom icons
const SparklesIcon = () => (
  <svg className="w-5 h-5 text-[#FF522B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const startTime = performance.now();
    const userMessage: Message = { 
      id: Date.now().toString(), 
      sender: "user", 
      text: trimmedInput,
      timestamp: getTime()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = { 
      id: aiMessageId, 
      sender: "ai", 
      text: "",
      timestamp: getTime()
    };
    setMessages((prev) => [...prev, initialAiMessage]);

    let accumulatedResponse = "";

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.slice(6).trim();

            if (dataContent === "[DONE]") {
              break;
            }

            accumulatedResponse += dataContent + " ";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId ? { ...msg, text: accumulatedResponse } : msg
              )
            );
          }
        }
      }
      setLatency(Math.round(performance.now() - startTime));
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: "Error connecting to execution engine." }
            : msg
        )
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
    <main className="relative flex flex-col h-screen font-mono antialiased bg-[#FAF9F6] dark:bg-[#0D0E12] text-neutral-900 dark:text-neutral-100 selection:bg-[#FF522B] selection:text-white">
      
      {/* Background Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-[#FAF9F6]/90 dark:bg-[#0D0E12]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-[#FF522B] text-white font-bold text-sm shadow-[0_0_15px_rgba(255,82,43,0.4)]">
            AI
          </div>
          <span className="text-sm font-semibold tracking-wider uppercase text-neutral-900 dark:text-white">
            SARVAM <span className="text-[#FF522B]">//</span> AGENT STUDIO
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>MODEL: ACTIVE</span>
          </div>
          {latency !== null && (
            <div className="hidden sm:block text-neutral-500 dark:text-neutral-400">
              LATENCY: <span className="text-neutral-900 dark:text-neutral-200">{latency}ms</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Chat Stream Container */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-6 max-w-4xl mx-auto w-full">
        
        {/* Sarvam-style Hero State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs border border-[#FF522B]/30 rounded-full bg-[#FF522B]/10 text-[#FF522B]">
              <SparklesIcon />
              <span className="font-semibold tracking-wide uppercase">Sovereign Agent Architecture</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-sans font-extrabold tracking-tight text-neutral-950 dark:text-white">
              Build & Stream with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF522B] to-[#FF8A00]">High Performance</span>
            </h1>

            <p className="max-w-md text-sm sm:text-base font-sans text-neutral-600 dark:text-neutral-400">
              Low-latency streaming agent interface. Type your prompt below to start interacting with your FastAPI backend.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full text-left pt-4">
              {[
                "Analyze workflow bottlenecks",
                "Generate custom Python agent code",
                "Summarize API request schemas",
                "Execute multi-step task chains"
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="p-3 text-xs border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-[#14161D] hover:border-[#FF522B] dark:hover:border-[#FF522B] transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  <span className="text-[#FF522B] mr-2">→</span> {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-1`}
          >
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest px-1">
              {msg.sender === "user" ? (
                <><span>USER</span> <UserIcon /></>
              ) : (
                <><SparklesIcon /> <span className="text-[#FF522B] font-bold">SARVAM AGENT</span></>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-4 text-sm rounded-sm border font-sans leading-relaxed
                ${msg.sender === "user"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-sm"
                  : "bg-white dark:bg-[#14161D] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                }`}
            >
              {msg.text || (isLoading && msg.sender === "ai" && (
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                  <span className="w-2 h-2 rounded-full bg-[#FF522B] animate-ping" />
                  <span>Processing tokens...</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="sticky bottom-0 z-20 p-4 sm:p-6 bg-[#FAF9F6]/80 dark:bg-[#0D0E12]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col border border-neutral-300 dark:border-neutral-800 rounded-sm bg-white dark:bg-[#14161D] focus-within:border-[#FF522B] dark:focus-within:border-[#FF522B] transition-colors shadow-lg"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask agent to perform a task or generate code..."
              rows={2}
              disabled={isLoading}
              className="w-full p-4 bg-transparent border-none text-sm font-sans focus:outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 disabled:opacity-50"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-[#111217]">
              <div className="text-[11px] text-neutral-400 font-mono">
                Press <kbd className="px-1 py-0.5 border border-neutral-300 dark:border-neutral-700 rounded text-[10px]">Enter</kbd> to submit
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#FF522B] hover:bg-[#E0431F] disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(255,82,43,0.3)] rounded-sm"
              >
                <span>{isLoading ? "STREAMING" : "RUN"}</span>
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      </footer>
    </main>
  );
}