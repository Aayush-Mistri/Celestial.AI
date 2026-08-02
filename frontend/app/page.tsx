"use client";

import Link from "next/link";
import {
  ArrowRight,
  PlayCircle,
  BrainCircuit,
  Search,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const displayFont = { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif" };

const flow = [
  { label: "Start", icon: PlayCircle },
  { label: "Model state", icon: BrainCircuit },
  { label: "Tavily search", icon: Search },
  { label: "End", icon: CheckCircle2 },
];

const stack = [
  ["Orchestration", "LangGraph", "Compiles the stateful ReAct loop"],
  ["Search", "Tavily API", "Real-time web retrieval"],
  ["Frontend", "Next.js 16", "Streams responses over SSE"],
  ["API", "FastAPI", "Serves async token streams"],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-[#A3A3A3] font-sans selection:bg-white/20 selection:text-white overflow-x-hidden">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&display=swap");
        body {
          font-family: "Inter", ui-sans-serif, sans-serif;
        }
      `}</style>

      {/* Ambient background — grayscale glass, no color */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-white/[0.06] blur-[110px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-white/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[380px] h-[380px] rounded-full bg-white/[0.04] blur-[110px]" />
      </div>

      {/* ------------------------------------------------------------------
         Hero
         ------------------------------------------------------------------ */}
      <section className="relative w-full min-h-[88vh] flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-7 max-w-2xl">
          <h1
            className="text-5xl sm:text-7xl md:text-8xl leading-[1.02] font-bold tracking-tight text-white"
            style={displayFont}
          >
            Celestial <span className="text-white/50 font-medium">AI</span>
          </h1>

          <p className="text-sm sm:text-base text-[#8A8A8A] leading-relaxed max-w-md font-light">
            An agent that reads the state of a conversation, decides when it
            needs the outside world, and pulls it in through Tavily before
            it answers.
          </p>

          <Link
            href="/chat"
            className="group mt-4 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/[0.16] backdrop-blur-xl px-7 py-3.5 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Start chat
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------
         Content
         ------------------------------------------------------------------ */}
      <main className="max-w-3xl mx-auto px-6 pb-24 space-y-16 w-full relative z-10">
        {/* About */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold mb-3">
            About
          </h3>
          <p className="text-sm sm:text-[15px] text-[#A3A3A3] leading-[1.8] font-light max-w-xl">
            Celestial is a prototype agent platform built on LangGraph. It
            runs a compiled ReAct loop: read the conversation, decide
            whether it needs current information, search when it does, and
            answer once it has enough to stand on.
          </p>
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold mb-6">
            How it works
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {flow.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 sm:px-5 py-4 min-w-[110px]">
                  <step.icon className="w-4 h-4 text-white/70" />
                  <span className="text-[11px] text-[#D4D4D4] text-center">
                    {step.label}
                  </span>
                </div>
                {i < flow.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-[#7A7A7A] leading-relaxed font-light mt-6 pt-6 border-t border-white/10">
            Every message lands at the model state. If it can answer from
            what it already knows, it goes straight to end. If not, it
            opens a Tavily search, folds the results back in, and loops
            back to the model before it answers.
          </p>
        </section>

        {/* Stack */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="p-7 sm:p-9 pb-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
              Stack
            </h3>
          </div>
          <div className="grid grid-cols-[1fr_1.2fr_1.6fr] text-[10px] uppercase tracking-[0.1em] text-[#7A7A7A] px-7 sm:px-9 py-2 border-t border-white/10">
            <div>Layer</div>
            <div>Technology</div>
            <div>Function</div>
          </div>
          {stack.map(([layer, tech, fn], i) => (
            <div
              key={layer}
              className={`grid grid-cols-[1fr_1.2fr_1.6fr] text-xs sm:text-[13px] px-7 sm:px-9 py-4 text-[#A3A3A3] font-light border-t border-white/10 ${
                i === stack.length - 1 ? "pb-7 sm:pb-9" : ""
              }`}
            >
              <div className="text-white font-normal">{layer}</div>
              <div className="text-[#8A8A8A]">{tech}</div>
              <div>{fn}</div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center pt-2">
          <Link
            href="/chat"
            className="group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/[0.16] backdrop-blur-xl px-6 py-3 text-sm font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Chat now
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      </main>

      <footer className="w-full py-8 px-6 text-center text-[11px] text-[#5C5C5C] relative z-10">
        © 2026 Celestial AI · LangGraph &amp; FastAPI
      </footer>
    </div>
  );
}
