"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, X } from "lucide-react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm ${className}`}
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

export function Spinner({ size = 15 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />;
}

/** Progress steps while the AI works. */
export function Working({ steps, className = "" }: { steps: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 2400);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className={`card ai-gradient flex flex-col items-center px-6 py-14 text-center ${className}`}>
      <div className="relative mb-5 grid h-12 w-12 place-items-center">
        <span className="absolute inset-0 rounded-full bg-brand/20" style={{ animation: "ripple 1.8s ease-out infinite" }} />
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-navy text-white shadow-lg"><Spinner size={20} /></span>
      </div>
      <div key={i} className="fade-up font-medium">{steps[i]}</div>
      <div className="mt-4 flex gap-1.5">
        {steps.map((_, k) => (
          <span key={k} className={`h-1 rounded-full transition-all duration-500 ${k <= i ? "w-6 bg-brand" : "w-1.5 bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

export function CharCount({ text, max, unit = "chars" }: { text: string; max: number; unit?: "chars" | "words" }) {
  const n = unit === "words" ? text.trim().split(/\s+/).filter(Boolean).length : text.length;
  return <span className={`text-[0.8rem] tabular-nums ${n > max ? "text-bad" : "text-faint"}`}>{n}/{max}{unit === "words" ? " words" : ""}</span>;
}

/** Custom dropdown — replaces native <select>. */
export function Menu<T extends string>({
  value,
  options,
  onChange,
  render,
  align = "right",
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  render: (current: { value: T; label: string }) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        {render(current)} <ChevronDown size={14} className="text-faint" />
      </button>
      {open && (
        <div className={`pop absolute z-50 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-xl ${align === "right" ? "right-0" : "left-0"}`} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[0.92rem] hover:bg-slate-50"
            >
              <span>
                {o.label}
                {o.hint && <span className="block text-[0.78rem] text-faint">{o.hint}</span>}
              </span>
              {o.value === value && <Check size={14} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="pop w-full rounded-2xl bg-white shadow-2xl" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="font-semibold">{title}</div>
          <button className="btn-quiet" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
