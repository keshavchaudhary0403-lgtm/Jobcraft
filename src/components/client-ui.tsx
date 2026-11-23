"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-ghost px-3 py-1.5 text-xs ${className}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check size={14} className="text-good" /> : <Copy size={14} />}
      {done ? "Copied" : label}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />;
}

/** Cycles through status lines while the AI works — makes waiting feel alive. */
export function Working({ steps, className = "" }: { steps: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 2600);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className={`card ai-gradient flex flex-col items-center px-6 py-12 text-center ${className}`}>
      <div className="relative mb-5 grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 rounded-full bg-brand/20" style={{ animation: "ripple 1.8s ease-out infinite" }} />
        <span className="absolute inset-0 rounded-full bg-brand/20" style={{ animation: "ripple 1.8s ease-out .6s infinite" }} />
        <span className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand to-navy text-white shadow-lg">
          <Spinner size={22} />
        </span>
      </div>
      <div key={i} className="fade-up text-[0.95rem] font-medium">{steps[i]}</div>
      <div className="mt-4 flex gap-1.5">
        {steps.map((_, k) => (
          <span key={k} className={`h-1.5 rounded-full transition-all duration-500 ${k <= i ? "w-6 bg-brand" : "w-1.5 bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

export function CharCount({ text, max }: { text: string; max: number }) {
  const n = text.length;
  return <span className={`text-xs tabular-nums ${n > max ? "text-bad" : "text-faint"}`}>{n}/{max}</span>;
}
