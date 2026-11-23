"use client";

import { useEffect, useRef, useState } from "react";
import { Heading, List, Pilcrow } from "lucide-react";

/**
 * Line-by-line resume editor that looks like the formatted resume:
 * name, section headings, job lines and bullets keep their style while you type.
 * - Enter: new line (stays a bullet inside a list) · Backspace at start: remove format / join lines
 * - Type "- " at the start of a line to make it a bullet · paste keeps line breaks
 * mode "plain": headings = ALL CAPS lines (master resume)
 * mode "md": # name, ## section, ### job, *date*, - bullet (tailored resume)
 */

type Md = "h1" | "h2" | "h3" | "em" | null;
type Row = { id: number; text: string; bullet: boolean; md: Md };
export type Kind = "name" | "heading" | "contact" | "role" | "company" | "text";

/** Shared with the read-only view so editing and reading look the same. */
export function kindOf(line: string, nonBlankIdx: number): Kind {
  const letters = line.replace(/[^A-Za-z]/g, "");
  const isHeading = letters.length >= 3 && letters === letters.toUpperCase() && line.length < 48;
  if (nonBlankIdx === 0) return "name";
  if (isHeading) return "heading";
  if (nonBlankIdx <= 2 && /[@|+]|\d{5,}/.test(line)) return "contact";
  if (line.includes("|") && /(19|20)\d{2}|present/i.test(line)) return "role";
  if (line.includes("|") && line.length < 90) return "company";
  return "text";
}

export const KIND_CLS: Record<Kind, string> = {
  name: "text-[1.15em] font-semibold text-ink",
  heading: "mb-1 mt-5 border-b border-line pb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-brand",
  contact: "text-[14px] text-muted",
  role: "mt-3 font-semibold text-ink",
  company: "mt-3 font-medium text-ink",
  text: "my-1",
};

const MD_CLS: Record<Exclude<Md, null> | "text", string> = {
  h1: "mb-0.5 text-[24px] font-semibold text-ink",
  h2: "mb-2 mt-5 border-b border-line pb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand",
  h3: "mt-2.5 font-semibold text-ink",
  em: "text-[14px] text-muted",
  text: "my-0.5",
};

let uid = 0;
function parse(value: string, mode: "plain" | "md"): Row[] {
  return value.split("\n").map((raw) => {
    const id = ++uid;
    if (mode === "md") {
      const h = raw.match(/^(#{1,3})\s+(.*)$/);
      if (h) return { id, text: h[2], bullet: false, md: (["h1", "h2", "h3"] as const)[h[1].length - 1] };
      const em = raw.match(/^\*([^*].*[^*]|[^*])\*$/);
      if (em) return { id, text: em[1], bullet: false, md: "em" };
    }
    const b = raw.match(/^\s*[-•*]\s+(.*)$/);
    if (b) return { id, text: b[1], bullet: true, md: null };
    return { id, text: raw, bullet: false, md: null };
  });
}
function serialize(rows: Row[]): string {
  return rows
    .map((r) => {
      if (r.bullet) return `- ${r.text}`;
      if (r.md === "h1") return `# ${r.text}`;
      if (r.md === "h2") return `## ${r.text}`;
      if (r.md === "h3") return `### ${r.text}`;
      if (r.md === "em") return r.text ? `*${r.text}*` : "";
      return r.text;
    })
    .join("\n");
}

export function DocEditor({ value, onChange, mode = "plain", className = "", toolbarTop = "top-2" }: { value: string; onChange: (v: string) => void; mode?: "plain" | "md"; className?: string; toolbarTop?: string }) {
  const [rows, setRows] = useState(() => parse(value, mode));
  const [focusId, setFocusId] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLTextAreaElement>());
  const pending = useRef<{ id: number; pos: number } | null>(null);

  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    const el = refs.current.get(p.id);
    if (el) {
      el.focus();
      el.setSelectionRange(p.pos, p.pos);
    }
    pending.current = null;
  });

  function commit(next: Row[], focus?: { id: number; pos: number }) {
    if (focus) pending.current = focus;
    setRows(next);
    onChange(serialize(next));
  }

  function change(i: number, text: string) {
    const r = rows[i];
    if (text.includes("\n")) {
      // pasted or typed line breaks → split into rows
      const parts = parse(text, mode);
      parts[0] = { ...parts[0], bullet: parts[0].bullet || r.bullet, md: parts[0].md ?? r.md };
      const next = [...rows.slice(0, i), ...parts, ...rows.slice(i + 1)];
      const last = parts[parts.length - 1];
      return commit(next, { id: last.id, pos: last.text.length });
    }
    let row: Row = { ...r, text };
    if (!r.bullet && !r.md && /^[-•*]\s/.test(text)) row = { ...row, bullet: true, text: text.replace(/^[-•*]\s/, "") };
    if (mode === "md" && !r.bullet && !r.md) {
      const h = text.match(/^(#{1,3})\s(.*)$/);
      if (h) row = { ...row, md: (["h1", "h2", "h3"] as const)[h[1].length - 1], text: h[2] };
    }
    const next = rows.slice();
    next[i] = row;
    commit(next, row.text !== text ? { id: row.id, pos: row.text.length } : undefined);
  }

  function key(i: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const r = rows[i];
    const start = el.selectionStart;
    const collapsed = start === el.selectionEnd;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (r.bullet && !r.text.trim()) {
        const next = rows.slice();
        next[i] = { ...r, bullet: false };
        return commit(next, { id: r.id, pos: 0 });
      }
      const before = r.text.slice(0, start);
      const after = r.text.slice(el.selectionEnd);
      const nr: Row = { id: ++uid, text: after, bullet: r.bullet, md: null };
      const next = [...rows.slice(0, i), { ...r, text: before }, nr, ...rows.slice(i + 1)];
      return commit(next, { id: nr.id, pos: 0 });
    }
    if (e.key === "Backspace" && collapsed && start === 0) {
      if (r.bullet || r.md) {
        e.preventDefault();
        const next = rows.slice();
        next[i] = { ...r, bullet: false, md: null };
        return commit(next, { id: r.id, pos: 0 });
      }
      if (i > 0) {
        e.preventDefault();
        const prev = rows[i - 1];
        const next = [...rows.slice(0, i - 1), { ...prev, text: prev.text + r.text }, ...rows.slice(i + 1)];
        return commit(next, { id: prev.id, pos: prev.text.length });
      }
    }
    if (e.key === "Delete" && collapsed && start === r.text.length && i < rows.length - 1) {
      e.preventDefault();
      const nx = rows[i + 1];
      const next = [...rows.slice(0, i), { ...r, text: r.text + nx.text }, ...rows.slice(i + 2)];
      return commit(next, { id: r.id, pos: r.text.length });
    }
    if (e.key === "ArrowUp" && collapsed && start === 0 && i > 0) {
      e.preventDefault();
      pending.current = { id: rows[i - 1].id, pos: rows[i - 1].text.length };
      setRows(rows.slice());
    }
    if (e.key === "ArrowDown" && collapsed && start === r.text.length && i < rows.length - 1) {
      e.preventDefault();
      pending.current = { id: rows[i + 1].id, pos: 0 };
      setRows(rows.slice());
    }
  }

  function setFormat(f: "heading" | "bullet" | "text") {
    const i = rows.findIndex((r) => r.id === focusId);
    if (i < 0) return;
    const r = rows[i];
    let row: Row;
    if (f === "bullet") row = { ...r, bullet: true, md: null };
    else if (f === "text") row = { ...r, bullet: false, md: null, text: mode === "plain" && kindOf(r.text, 1) === "heading" ? r.text.charAt(0) + r.text.slice(1).toLowerCase() : r.text };
    else row = mode === "md" ? { ...r, bullet: false, md: "h2" } : { ...r, bullet: false, text: r.text.toUpperCase() };
    const next = rows.slice();
    next[i] = row;
    commit(next, { id: r.id, pos: row.text.length });
  }

  const current = rows.find((r) => r.id === focusId);
  const curFormat = !current ? null : current.bullet ? "bullet" : current.md === "h2" || (mode === "plain" && kindOf(current.text, 1) === "heading") ? "heading" : "text";

  let nonBlank = 0;
  return (
    <div className={className}>
      <div className={`sticky ${toolbarTop} z-[5] mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur`}>
        {([
          ["heading", "Section heading", Heading],
          ["bullet", "Bullet", List],
          ["text", "Plain text", Pilcrow],
        ] as const).map(([f, l, Icon]) => (
          <button
            key={f}
            type="button"
            disabled={!current}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setFormat(f)}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition disabled:opacity-40 ${curFormat === f ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-line-2 hover:text-ink"}`}
          >
            <Icon size={13} /> {l}
          </button>
        ))}
        <span className="ml-auto hidden pr-1 text-[12px] text-faint md:block">Enter = new line · type “- ” for a bullet</span>
      </div>

      <div>
        {rows.map((r, i) => {
          const blank = !r.text.trim() && !r.bullet && !r.md;
          let cls: string;
          if (mode === "md") cls = r.bullet ? "my-0.5" : MD_CLS[r.md ?? "text"];
          else if (r.bullet) cls = "my-0.5";
          else cls = blank ? "" : KIND_CLS[kindOf(r.text.trim(), nonBlank)];
          if (!blank) nonBlank++;
          return (
            <div key={r.id} className={`flex items-start gap-2 ${cls}`}>
              {r.bullet && <span className="mt-[0.62em] h-[5px] w-[5px] shrink-0 rounded-full bg-brand-2" />}
              <textarea
                ref={(el) => {
                  if (el) refs.current.set(r.id, el);
                  else refs.current.delete(r.id);
                }}
                rows={1}
                value={r.text}
                spellCheck
                placeholder={blank && focusId === r.id ? "Empty line" : undefined}
                onFocus={() => setFocusId(r.id)}
                onChange={(e) => change(i, e.target.value)}
                onKeyDown={(e) => key(i, e)}
                className={`-mx-1.5 block w-full resize-none overflow-hidden rounded-md border-0 bg-transparent px-1.5 outline-none transition-colors [field-sizing:content] [text-transform:inherit] placeholder:text-faint hover:bg-line-2/60 focus:bg-brand-soft/60 ${blank ? "min-h-[1em] text-[0.6em]" : ""}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
