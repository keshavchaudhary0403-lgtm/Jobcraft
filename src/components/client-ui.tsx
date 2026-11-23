"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-ink text-on-brand shadow-lg"><Spinner size={20} /></span>
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
  return <span className={`text-[12px] tabular-nums ${n > max ? "text-bad" : "text-faint"}`}>{n}/{max}{unit === "words" ? " words" : ""}</span>;
}

/**
 * Custom dropdown — replaces native <select>.
 * The list is rendered in a portal with fixed positioning, so cards/tables never clip it;
 * it opens upwards when there isn't room below.
 */
export function Menu<T extends string>({
  value,
  options,
  onChange,
  render,
  align = "right",
  bare,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  render: (current: { value: T; label: string }) => React.ReactNode;
  align?: "left" | "right";
  /** Trigger is just the rendered content (e.g. a coloured chip) — no button chrome. */
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  function place() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const needed = Math.min(options.length * 52 + 16, 320);
    const vertical = below < needed && r.top > below ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 };
    const horizontal = align === "right" ? { right: window.innerWidth - r.right } : { left: r.left };
    setPos({ ...vertical, ...horizontal });
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const shut = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", shut, true);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", shut, true);
      window.removeEventListener("resize", shut);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={bare ? "inline-flex rounded-full" : "btn btn-ghost btn-sm gap-2"}
        onClick={() => {
          if (!open) place();
          setOpen(!open);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {render(current)}
        {!bare && <ChevronDown size={14} className="text-faint" />}
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={list} style={{ position: "fixed", ...pos }} className="pop z-[60] min-w-52 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-xl" role="listbox">
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
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[14px] transition ${o.value === value ? "bg-brand-soft/60" : "hover:bg-line-2"}`}
              >
                <span>
                  <span className="block font-medium">{o.label}</span>
                  {o.hint && <span className="block whitespace-nowrap text-[12px] text-muted">{o.hint}</span>}
                </span>
                {o.value === value && <Check size={14} className="shrink-0 text-brand" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
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
          <div className="text-[20px] font-semibold leading-[25px]">{title}</div>
          <button className="btn-quiet" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Number field that never saves while typing. Save / Cancel appear only when the value changes.
 * Enter = save, Esc = cancel. Blank = "no value" (null).
 */
export function SaveableNumber({
  value,
  onSave,
  placeholder,
  prefix = "₹",
  size = "md",
}: {
  value: number | null;
  onSave: (v: number | null) => Promise<unknown> | void;
  placeholder?: string;
  prefix?: string;
  size?: "sm" | "md";
}) {
  const original = value == null ? "" : String(value);
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  // Follow the saved value when it changes elsewhere (after save / reload).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(original);
  }, [original]);

  const dirty = draft.trim() !== original;
  async function save() {
    const t = draft.trim();
    const n = t === "" ? null : Number(t);
    if (n != null && (!Number.isFinite(n) || n < 0)) return setErr("Enter 0 or more");
    setErr("");
    setSaving(true);
    await onSave(n);
    setSaving(false);
  }
  const h = size === "sm" ? "h-8 text-[14px]" : "";
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className={`relative ${size === "sm" ? "w-28" : "flex-1"}`}>
          {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-faint">{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            className={`field ${h} ${prefix ? "pl-7" : ""} ${dirty ? "border-brand" : ""}`}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) save();
              if (e.key === "Escape") setDraft(original);
            }}
          />
        </div>
        {dirty && (
          <>
            <button type="button" className={`btn btn-primary ${size === "sm" ? "btn-sm h-8" : ""}`} onClick={save} disabled={saving} title="Save (Enter)">
              {saving ? <Spinner size={13} /> : <Check size={14} />} Save
            </button>
            <button type="button" className="btn-quiet" onClick={() => { setDraft(original); setErr(""); }} title="Cancel (Esc)" aria-label="Cancel">
              <X size={15} />
            </button>
          </>
        )}
      </div>
      {err && <p className="mt-1 text-[12px] text-bad">{err}</p>}
    </div>
  );
}

type AskOpts = {
  title: string;
  body?: React.ReactNode;
  confirm: string;
  danger?: boolean;
  input?: { label: string; defaultValue?: string; placeholder?: string; type?: string; prefix?: string };
};

/**
 * App-styled replacement for window.confirm / window.prompt.
 * const [ask, dialog] = useAsk(); render {dialog}; then `await ask({...})`
 * → null if cancelled, the typed value (or "") if confirmed.
 */
export function useAsk() {
  const [state, setState] = useState<{ opts: AskOpts; resolve: (v: string | null) => void } | null>(null);
  const ask = useCallback((opts: AskOpts) => new Promise<string | null>((resolve) => setState({ opts, resolve })), []);
  const finish = (v: string | null) => {
    state?.resolve(v);
    setState(null);
  };
  const dialog = state ? <AskDialog key={state.opts.title} opts={state.opts} onDone={finish} /> : null;
  return [ask, dialog] as const;
}

function AskDialog({ opts, onDone }: { opts: AskOpts; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(opts.input?.defaultValue ?? "");
  const blocked = !!opts.input && !v.trim();
  return (
    <Modal open onClose={() => onDone(null)} title={opts.title} width={440}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!blocked) onDone(opts.input ? v.trim() : "");
        }}
      >
        {opts.body && <div className="text-[14px] leading-[1.43] text-slate-700">{opts.body}</div>}
        {opts.input && (
          <div className={opts.body ? "mt-4" : ""}>
            <label className="label">{opts.input.label}</label>
            <div className="relative">
              {opts.input.prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">{opts.input.prefix}</span>}
              <input
                autoFocus
                type={opts.input.type ?? "text"}
                className={`field ${opts.input.prefix ? "pl-7" : ""}`}
                placeholder={opts.input.placeholder}
                value={v}
                onChange={(e) => setV(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(null)}>Cancel</button>
          <button type="submit" autoFocus={!opts.input} disabled={blocked} className={`btn ${opts.danger ? "bg-bad text-white hover:opacity-90" : "btn-primary"}`}>{opts.confirm}</button>
        </div>
      </form>
    </Modal>
  );
}
