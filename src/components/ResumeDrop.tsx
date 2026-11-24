"use client";

import { useRef, useState } from "react";
import { AlertCircle, Check, FileText, UploadCloud } from "lucide-react";
import type { ParsedResume } from "@/lib/tasks";
import { Working } from "./client-ui";

/** Drag-and-drop a resume PDF (or paste text) → parsed details. */
/** `file` is the uploaded PDF's name when it was kept (saved for good when the profile is saved). */
export function ResumeDrop({ onParsed, compact = false }: { onParsed: (d: ParsedResume, file?: string | null) => void; compact?: boolean }) {
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
    if (data.data) onParsed(data.data, data.file ?? null);
    else setErr(data.error ?? "Couldn't read that. Try again or paste the text.");
  }

  function file(f?: File) {
    if (!f) return;
    if (f.type !== "application/pdf") return setErr("Please use a PDF.");
    const fd = new FormData();
    fd.append("file", f);
    send(fd);
  }

  if (busy)
    return (
      <Working
        flat={compact}
        title="Reading your resume"
        sub="About 20 seconds. Nothing is saved until you review it."
        steps={["Reading your resume...", "Picking out your experience and results...", "Keeping your links...", "Filling in your profile..."]}
      />
    );

  if (paste)
    return (
      <div className="fade-up">
        <label className="mb-1.5 block text-[0.84rem] font-semibold">Paste your resume text</label>
        <textarea className="field min-h-64 text-[0.88rem]" placeholder="Paste the full text of your resume..." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-1.5 text-[0.78rem] text-muted">{text.trim().length < 100 ? "Paste at least a few lines." : `${text.trim().split(/\s+/).length} words`}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button className="btn btn-soft btn-sm" onClick={() => setPaste(false)}><UploadCloud size={14} /> Upload a PDF instead</button>
          <button
            className="btn btn-primary h-10 px-5 !shadow-none"
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
        {err && <p className="mt-2 flex items-center gap-1.5 text-[0.86rem] text-bad"><AlertCircle size={14} /> {err}</p>}
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed text-center transition ${compact ? "px-6 py-8" : "px-6 py-14"} ${
          drag ? "border-brand bg-brand-soft" : "border-brand/25 bg-brand-soft/40 hover:border-brand/50 hover:bg-brand-soft/70"
        }`}
      >
        <span className={`grid place-items-center rounded-2xl bg-white text-brand ring-1 ring-brand/15 ${compact ? "h-12 w-12" : "h-14 w-14"}`}>
          {drag ? <FileText size={22} /> : <UploadCloud size={22} />}
        </span>
        <div className={`mt-3 font-bold ${compact ? "text-[1.05rem]" : "text-[1.2rem]"}`}>{drag ? "Drop it here" : "Drop your resume PDF here"}</div>
        <div className="mt-0.5 text-[0.86rem] text-muted">PDF, up to 8 MB</div>
        <span className="btn btn-primary mt-4 h-10 px-5 !shadow-none"><UploadCloud size={15} /> Choose PDF</span>
        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => file(e.target.files?.[0])} />
      </div>
      {err && <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.86rem] text-bad"><AlertCircle size={14} /> {err}</p>}
      <ul className="mt-4 space-y-2 text-[0.86rem] text-muted">
        {["Your details and resume fill in from it", "You review everything before it's saved", "The PDF is kept privately - only you can open it"].map((t) => (
          <li key={t} className="flex items-center gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-good-soft text-good"><Check size={12} strokeWidth={3} /></span>{t}</li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-4 text-[0.86rem] text-muted">
        No PDF?
        <button className="btn btn-soft btn-sm" onClick={() => setPaste(true)}>Paste the text instead</button>
      </div>
    </div>
  );
}
