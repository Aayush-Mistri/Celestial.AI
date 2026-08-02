"use client";

import { useEffect, useState } from "react";

const messages = [
  "Warming up the model…",
  "Reticulating splines…",
  "Reading your browser details…",
  "Noting your IP address, just for the file…",
  "Checking your search history for anything embarrassing…",
  "Scanning your camera roll for anything interesting…",
  "Running a soft credit check, don't worry about it…",
  "Peeking at your bank balance, we're judging a little…",
  "Calling your wife to ask what's actually for dinner…",
  "Locating your ex, purely out of curiosity…",
  "Backing up your personal photos, purely for safekeeping…",
  "Okay, none of that actually happened…",
  "Almost there…",
];

const STEP_MS = 1400;
const DURATION_MS = STEP_MS * messages.length;

export default function Loading({ onComplete }: { onComplete?: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => {
        if (i >= messages.length - 1) {
          clearInterval(interval);
          if (onComplete) {
            setTimeout(onComplete, 800);
          }
          return i;
        }
        return i + 1;
      });
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [onComplete]);

  const progress = ((index + 1) / messages.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 font-sans">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap");
        body {
          font-family: "Inter", ui-sans-serif, sans-serif;
        }
        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-white/[0.06] blur-[110px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-white/[0.05] blur-[120px]" />
      </div>

      <div className="flex flex-col items-center gap-8 max-w-sm w-full text-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-white border-white/10 animate-spin" />
        </div>

        <div className="h-10 flex items-center justify-center">
          <p
            key={index}
            className="text-sm text-[#A3A3A3] font-light"
            style={{ animation: "fadein 0.5s ease" }}
          >
            {messages[index]}
          </p>
        </div>

        <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/70 transition-all ease-linear"
            style={{ width: `${progress}%`, transitionDuration: `${STEP_MS}ms` }}
          />
        </div>
      </div>
    </div>
  );
}