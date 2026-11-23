"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import type { ParsedResume } from "@/lib/tasks";
import { Working } from "./client-ui";

/** Drag-and-drop a resume PDF (or paste text) → parsed details. */
export function ResumeDrop({ onParsed, compact = false }: { onParsed: (d: ParsedResume) => void; compact?: boolean }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function send(fd: FormData) {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/resume/parse", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.data) onParsed(data.data);
    else setErr(data.error ?? "Couldn't read that. Try again or paste the text.");
  }

  function file(f?: File) {
    if (!f) return;
    if (f.type !== "application/pdf") return setErr("Please use a PDF.");
    const fd = new FormData();
    fd.append("file", f);
    send(fd);
  }

  if (busy) return <Working steps={["Reading your resume…", "Picking out your experience and results…", "Filling in your profile…"]} />;

  if (paste)
    return (
      <div className="card p-4 fade-up">
        <textarea className="field min-h-64 font-mono text-xs" placeholder="Paste your resume text…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex items-center justify-between">
          <button className="btn-quiet rounded-lg text-sm" onClick={() => setPaste(false)}>Upload a PDF instead</button>
          <button
            className="btn btn-primary"
            disabled={text.trim().length < 100}
            onClick={() => {
              const fd = new FormData();
              fd.append("text", text);
              send(fd);
            }}
          >
            Continue
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      </div>
    );

  return (
    <div className="fade-up">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          file(e.dataTransfer.files?.[0]);
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition ${
          compact ? "px-6 py-7" : "px-6 py-14"
        } ${drag ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/50 hover:bg-[#fbfdfd]"}`}
      >
        <div className="ai-gradient pointer-events-none absolute inset-0 opacity-70" />
        <div className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-navy text-white shadow-lg transition group-hover:scale-105 ${compact ? "h-11 w-11" : "h-14 w-14"}`}>
          {drag ? <FileText size={compact ? 20 : 24} /> : <UploadCloud size={compact ? 20 : 24} />}
        </div>
        <div className={`relative font-semibold ${compact ? "mt-3" : "mt-4 text-[1.1rem]"}`}>{drag ? "Drop it here" : "Drop your resume"}</div>
        <div className="relative mt-0.5 text-muted">PDF up to 8 MB · or click to browse</div>
        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => file(e.target.files?.[0])} />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
        No PDF?
        <button className="font-medium text-brand-ink hover:underline" onClick={() => setPaste(true)}>Paste text</button>
      </div>
      {err && <p className="mt-2 text-center text-sm text-bad">{err}</p>}
    </div>
  );
}
