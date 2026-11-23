"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";

/** Turns plain resume text into a clean, readable document (no monospace). */
function Formatted({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) {
      out.push(
        <ul key={`u${k}`} className="my-1.5 list-disc space-y-1 pl-5 marker:text-brand-2">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) return bullets.push(line.replace(/^[-•*]\s+/, ""));
    flush(i);
    if (!line) return;
    const letters = line.replace(/[^A-Za-z]/g, "");
    const isHeading = letters.length >= 3 && letters === letters.toUpperCase() && line.length < 48;
    if (i === 0 || (out.length === 0 && isHeading)) {
      out.push(<div key={i} className="text-[1.15rem] font-semibold tracking-tight">{isHeading ? line.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : line}</div>);
    } else if (isHeading) {
      out.push(
        <div key={i} className="mb-1 mt-5 border-b border-line pb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-brand">
          {line}
        </div>,
      );
    } else if (out.length <= 2 && /[@|+]|\d{5,}/.test(line)) {
      out.push(<div key={i} className="text-[0.85rem] text-muted">{line}</div>);
    } else if (line.includes("|") && /(19|20)\d{2}|present/i.test(line)) {
      out.push(<p key={i} className="mt-3 font-semibold text-ink">{line}</p>);
    } else if (line.includes("|") && line.length < 90) {
      out.push(<p key={i} className="mt-3 font-medium text-ink">{line}</p>);
    } else {
      out.push(<p key={i} className="my-1">{line}</p>);
    }
  });
  flush(lines.length);
  return <div className="text-[0.9rem] leading-relaxed text-slate-700">{out}</div>;
}

export function ResumePreview({ value, onChange, page }: { value: string; onChange: (v: string) => void; page?: boolean }) {
  const [editing, setEditing] = useState(false);
  const words = value.split(/\s+/).filter(Boolean).length;
  return (
    <section className={`card flex flex-col fade-up ${page ? "" : "xl:sticky xl:top-6 xl:h-[calc(100vh-3.5rem)]"}`}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-semibold">Resume</span>
        <span className="flex items-center gap-3">
          <span className="text-[0.82rem] text-faint">{words} words</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? <><Check size={14} /> Done</> : <><Pencil size={13} /> Edit</>}
          </button>
        </span>
      </div>
      {editing ? (
        <textarea
          autoFocus
          className={`thin-scroll flex-1 resize-none border-0 bg-transparent text-[0.9rem] leading-relaxed text-slate-700 outline-none ${page ? "mx-auto block min-h-[70vh] w-full max-w-[860px] px-8 py-8" : "min-h-[420px] px-5 py-4 xl:min-h-0"}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className={page ? "px-6 py-8 sm:px-10" : "thin-scroll min-h-[420px] flex-1 overflow-y-auto px-6 py-5 xl:min-h-0"}>
          <div className={page ? "mx-auto max-w-[860px] text-[1.02rem]" : ""}>
          {value.trim() ? <Formatted text={value} /> : <p className="text-muted">No resume yet.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
