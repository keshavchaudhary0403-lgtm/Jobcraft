"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { DocEditor, KIND_CLS, kindOf } from "./DocEditor";

/** Turns plain resume text into a clean, readable document (same rules as the editor). */
function Formatted({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let n = 0;
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
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) return bullets.push(line.replace(/^[-•*]\s+/, ""));
    flush(i);
    if (!line) return;
    const k = kindOf(line, n++);
    const shown = k === "name" && line === line.toUpperCase() ? line.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : line;
    out.push(<div key={i} className={KIND_CLS[k]}>{shown}</div>);
  });
  flush(-1);
  return <div className="text-[0.9rem] leading-relaxed text-slate-700">{out}</div>;
}

export function ResumePreview({ value, onChange, page }: { value: string; onChange: (v: string) => void; page?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [before, setBefore] = useState(value);
  const words = value.split(/\s+/).filter(Boolean).length;
  return (
    <section className={`card flex flex-col fade-up ${page ? "" : "xl:sticky xl:top-6 xl:h-[calc(100vh-3.5rem)]"}`}>
      <div className={`flex items-center justify-between border-b border-line px-5 py-3 ${page ? "sticky top-[3.4rem] z-10 rounded-t-[inherit] bg-white" : ""}`}>
        <span className="font-bold">Resume</span>
        <span className="flex items-center gap-3">
          <span className="text-[0.82rem] text-faint">{words} words</span>
          {editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => { onChange(before); setEditing(false); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}><Check size={14} /> Done</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => { setBefore(value); setEditing(true); }}><Pencil size={13} /> Edit</button>
          )}
        </span>
      </div>
      {editing ? (
        <div className={page ? "px-6 py-6 sm:px-10" : "thin-scroll min-h-[420px] flex-1 overflow-y-auto px-5 py-4 xl:min-h-0"}>
          <DocEditor
            value={value}
            onChange={onChange}
            toolbarTop={page ? "top-[6.6rem]" : "top-0"}
            className={`text-[0.9rem] leading-relaxed text-slate-700 ${page ? "mx-auto max-w-[860px] text-[1.02rem]" : ""}`}
          />
        </div>
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
