"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Copy, Loader2, X } from "lucide-react";

export function CopyButton({ text, label = "Copy", className = "", soft = false, icon = false }: { text: string; label?: string; className?: string; soft?: boolean; icon?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn ${soft ? "btn-soft" : "btn-ghost"} btn-sm ${className}`}
      aria-label={icon ? label : undefined}
      data-tip={icon ? (done ? "Copied" : label) : undefined}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check size={14} className="text-good" /> : <Copy size={14} />}
      {!icon && (done ? "Copied" : label)}
    </button>
  );
}

export function Spinner({ size = 15 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />;
}

/**
 * The app's one "AI is working" screen: a titled card with a live step checklist
 * (done = green tick, current = spinner, next = grey) and a slim progress bar.
 * Steps advance on a timer; the last step stays current until the work finishes.
 */
export function Working({ steps, title = "Working on it", sub = "Usually 15-30 seconds. Keep this tab open.", icon, className = "", flat = false }: { steps: string[]; title?: string; sub?: string; icon?: React.ReactNode; className?: string; flat?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 2600);
    return () => clearInterval(t);
  }, [steps.length]);
  const pct = Math.round(((i + 0.6) / steps.length) * 100);
  return (
    <div className={`${flat ? "" : "card p-6 sm:p-7"} fade-up ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-3.5">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-2xl bg-brand/15" style={{ animation: "ripple 2s ease-out infinite" }} />
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand">{icon ?? <Spinner size={19} />}</span>
        </span>
        <div className="min-w-0">
          <div className="text-[1.12rem] font-bold leading-tight">{title}</div>
          <div className="text-[0.84rem] text-muted">{sub}</div>
        </div>
      </div>
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, k) => {
          const state = k < i ? "done" : k === i ? "now" : "next";
          return (
            <li key={s} className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors ${state === "now" ? "bg-brand-soft" : ""}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-good text-white" : state === "now" ? "bg-brand text-white" : "bg-line-2 text-faint"}`}>
                {state === "done" ? <Check size={13} strokeWidth={3} /> : state === "now" ? <Spinner size={12} /> : <span className="text-[0.72rem] font-bold">{k + 1}</span>}
              </span>
              <span className={`text-[0.92rem] ${state === "now" ? "font-semibold text-brand-ink" : state === "done" ? "text-muted" : "text-faint"}`}>{s}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line-2">
        <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Slim inline version for quick re-runs (re-scoring, scoring answers). */
export function WorkingInline({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-2xl bg-brand-soft px-4 py-3 fade-up ${className}`} role="status" aria-live="polite">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white"><Spinner size={13} /></span>
      <span className="text-[0.92rem] font-semibold text-brand-ink">{text}</span>
      <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden"><span className="block h-full w-1/3 rounded-full bg-brand/60" style={{ animation: "slide-x 1.4s ease-in-out infinite" }} /></span>
    </div>
  );
}

export function CharCount({ text, max, unit = "chars" }: { text: string; max: number; unit?: "chars" | "words" }) {
  const n = unit === "words" ? text.trim().split(/\s+/).filter(Boolean).length : text.length;
  return <span className={`text-[0.8rem] tabular-nums ${n > max ? "text-bad" : "text-faint"}`}>{n}/{max}{unit === "words" ? " words" : ""}</span>;
}

/**
 * Custom dropdown - replaces native <select>.
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
  /** Trigger is just the rendered content (e.g. a coloured chip) - no button chrome. */
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
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[0.92rem] transition ${o.value === value ? "bg-brand-soft/60" : "hover:bg-line-2"}`}
              >
                <span>
                  <span className="block font-medium">{o.label}</span>
                  {o.hint && <span className="block whitespace-nowrap text-[0.78rem] text-muted">{o.hint}</span>}
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
    <div data-modal className="fixed inset-0 z-50 grid place-items-center bg-side/40 p-4 backdrop-blur-[3px]" onMouseDown={onClose}>
      <div className="pop flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_30px_70px_-30px_rgba(0,30,70,.55)]" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="font-display text-[1.2rem] font-bold">{title}</div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-line-2 text-muted transition hover:bg-line hover:text-ink" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/** Right-side panel in the app's style: floating card, blue header, light body. */
export function SidePanel({ open, onClose, title, sub, icon, children }: { open: boolean; onClose: () => void; title: string; sub?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-side/40 backdrop-blur-[3px] sm:items-stretch sm:p-3" onMouseDown={onClose}>
      {/* Phones: bottom sheet (page stays visible above). Larger screens: floating side panel. */}
      <div className="side-panel flex h-[86vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-bg shadow-[0_30px_70px_-30px_rgba(0,30,70,.6)] sm:h-full sm:max-w-[480px] sm:rounded-[28px]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-white/60 sm:hidden" style={{ position: "relative", zIndex: 1, marginBottom: -14 }} />
        <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: "var(--hero-bg)" }}>
          {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">{icon}</span>}
          <div className="min-w-0 flex-1">
            <div className="font-display text-[1.2rem] font-bold leading-tight">{title}</div>
            {sub && <div className="flex items-center gap-1.5 truncate text-[0.82rem] text-white/90"><span className="h-2 w-2 shrink-0 rounded-full bg-[#5fd99a] shadow-[0_0_0_3px_rgba(95,217,154,.25)]" />{sub}</div>}
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 transition hover:bg-white/20" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 sm:px-5">{children}</div>
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
  const h = size === "sm" ? "h-8 text-[0.88rem]" : "";
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className={`relative ${size === "sm" ? "w-28" : "flex-1"}`}>
          {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-faint">{prefix}</span>}
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
            <button type="button" className={`btn btn-primary ${size === "sm" ? "btn-sm h-8" : ""}`} onClick={save} disabled={saving} data-tip="Save (Enter)">
              {saving ? <Spinner size={13} /> : <Check size={14} />} Save
            </button>
            <button type="button" className="btn-quiet" onClick={() => { setDraft(original); setErr(""); }} data-tip="Cancel (Esc)" aria-label="Cancel">
              <X size={15} />
            </button>
          </>
        )}
      </div>
      {err && <p className="mt-1 text-[0.8rem] text-bad">{err}</p>}
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
        {opts.body && <div className="text-[0.95rem] leading-relaxed text-slate-700">{opts.body}</div>}
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
