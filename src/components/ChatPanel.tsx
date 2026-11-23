"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";
import { useVoice } from "./useVoice";

export type StepDef = {
  key: string;
  n: number;
  title: string;
  short: string;
  when: string;
  prompt: string;
};

type Props = {
  sessionId: string;
  initialMessages: Message[];
  steps?: StepDef[];
  /** Turn on voice controls (mic + read replies aloud). */
  voice?: boolean;
  /** Small buttons that send a fixed message, e.g. "ready", "stop". */
  quickReplies?: string[];
  /** Sent automatically if the session has no messages yet. */
  autoStart?: { prompt: string; step: string };
  /** Called after each assistant reply finishes (e.g. to refresh server data). */
  onReply?: (text: string, step: string | null) => void;
  placeholder?: string;
};

type LocalMsg = Pick<Message, "role" | "content" | "step"> & { id: string; pending?: boolean };

export function ChatPanel({ sessionId, initialMessages, steps, voice, quickReplies, autoStart, onReply, placeholder }: Props) {
  const [messages, setMessages] = useState<LocalMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [openStep, setOpenStep] = useState<StepDef | null>(null);
  const [draft, setDraft] = useState("");
  const [speakReplies, setSpeakReplies] = useState(!!voice);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const v = useVoice();

  const doneSteps = useMemo(
    () => new Set(messages.filter((m) => m.role === "assistant" && m.step).map((m) => m.step!)),
    [messages],
  );
  const nextStep = steps?.find((s) => !doneSteps.has(s.key));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(content: string, step: string | null = null) {
    if (!content.trim() || busy) return;
    setBusy(true);
    v.stopSpeaking();
    const userMsg: LocalMsg = { id: `u${Date.now()}`, role: "user", content, step };
    const aiId = `a${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: aiId, role: "assistant", content: "", step, pending: true }]);

    let text = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content, step }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        text = `⚠️ ${data.error ?? "Something went wrong."}`;
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += dec.decode(value, { stream: true });
          const t = text;
          setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, content: t } : x)));
        }
      }
    } catch {
      text = text || "⚠️ Network problem. Check your connection and try again.";
    }
    setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, content: text, pending: false } : x)));
    setBusy(false);
    if (voice && speakReplies && text && !text.startsWith("⚠️")) v.speak(text);
    onReply?.(text, step);
  }

  useEffect(() => {
    if (autoStart && !started.current && initialMessages.length === 0) {
      started.current = true;
      send(autoStart.prompt, autoStart.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPrompt(s: StepDef) {
    setOpenStep(s);
    setDraft(s.prompt);
  }

  function micClick() {
    if (v.listening) v.stopListening();
    else v.startListening((t) => send(t));
  }

  return (
    <div className="flex flex-col gap-4">
      {steps && steps.length > 0 && (
        <div className="card p-3">
          <div className="flex flex-wrap gap-2">
            {steps.map((s) => {
              const done = doneSteps.has(s.key);
              const isNext = nextStep?.key === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => openPrompt(s)}
                  disabled={busy}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    openStep?.key === s.key
                      ? "border-accent bg-accent-soft text-accent"
                      : isNext
                        ? "border-accent/50 bg-white hover:bg-accent-soft"
                        : "border-line bg-white hover:bg-[#f6f3ee]"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${
                      done ? "bg-accent text-white" : "bg-[#efebe4] text-muted"
                    }`}
                  >
                    {done ? "✓" : s.n}
                  </span>
                  {s.short}
                </button>
              );
            })}
          </div>
          {openStep && (
            <div className="mt-3 border-t border-line pt-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">
                    Prompt {openStep.n}: {openStep.title}
                  </div>
                  <div className="text-sm text-muted">{openStep.when}</div>
                </div>
                <button className="text-sm text-muted hover:text-ink" onClick={() => setOpenStep(null)}>
                  Close
                </button>
              </div>
              <p className="mt-3 text-xs text-muted">
                Your resume and this job&apos;s details are attached automatically. Edit the prompt if you like, then run it.
              </p>
              <textarea className="field mt-2 font-mono text-xs leading-relaxed" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    const s = openStep;
                    setOpenStep(null);
                    send(draft, s.key);
                  }}
                >
                  Run prompt {openStep.n}
                </button>
                <button className="btn btn-ghost" onClick={() => setDraft(openStep.prompt)}>
                  Reset
                </button>
              </div>
            </div>
          )}
          {!openStep && nextStep && messages.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              Start with <strong className="text-ink">Prompt {nextStep.n}: {nextStep.title}</strong> — click it above.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} steps={steps} onSpeak={voice ? () => v.speak(m.content) : undefined} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 -mx-1 bg-gradient-to-t from-paper via-paper to-transparent px-1 pb-3 pt-4">
        {quickReplies && quickReplies.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button key={q} className="btn btn-ghost py-1 text-xs" disabled={busy} onClick={() => send(q)}>
                Say “{q}”
              </button>
            ))}
          </div>
        )}
        {v.listening && (
          <div className="mb-2 rounded-lg bg-warm-soft px-3 py-2 text-sm text-warm">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-warm" />
            Listening… {v.transcript || "start speaking"}
          </div>
        )}
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            rows={Math.min(6, Math.max(1, input.split("\n").length))}
            placeholder={placeholder ?? "Reply, answer its questions, or ask for changes…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = input;
                setInput("");
                send(t);
              }
            }}
          />
          {voice && v.supported.listen && (
            <button
              className={`btn ${v.listening ? "bg-warm text-white" : "btn-ghost"}`}
              onClick={micClick}
              disabled={busy}
              title={v.listening ? "Stop and send" : "Answer by voice"}
            >
              {v.listening ? "■ Send" : "🎙 Speak"}
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={busy || !input.trim()}
            onClick={() => {
              const t = input;
              setInput("");
              send(t);
            }}
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        {voice && (
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
            {v.supported.speak && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={speakReplies} onChange={(e) => setSpeakReplies(e.target.checked)} />
                Read replies aloud
              </label>
            )}
            {v.speaking && (
              <button className="underline" onClick={v.stopSpeaking}>
                Stop voice
              </button>
            )}
            {!v.supported.listen && <span>Voice input works in Chrome, Edge and Safari. You can still type.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ msg, steps, onSpeak }: { msg: LocalMsg; steps?: StepDef[]; onSpeak?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const step = steps?.find((s) => s.key === msg.step);

  if (msg.role === "user") {
    const isLibraryPrompt = !!msg.step && msg.content.length > 280;
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#efebe4] px-4 py-2.5 text-sm">
          {isLibraryPrompt && !expanded ? (
            <button className="text-left" onClick={() => setExpanded(true)}>
              <span className="font-medium">▸ {step ? `Prompt ${step.n}: ${step.title}` : "Library prompt"}</span>
              <span className="ml-2 text-xs text-muted">show</span>
            </button>
          ) : (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card px-5 py-4">
      {step && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Prompt {step.n} · {step.title}</div>}
      {msg.pending && !msg.content ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" /> Thinking…
        </div>
      ) : (
        <div className="prose-ai">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content.replace(/===\s*RESUME (START|END)\s*===/g, "---")}</ReactMarkdown>
        </div>
      )}
      {!msg.pending && msg.content && (
        <div className="mt-3 flex gap-3 text-xs text-muted">
          <button
            className="hover:text-ink"
            onClick={async () => {
              await navigator.clipboard.writeText(msg.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {onSpeak && (
            <button className="hover:text-ink" onClick={onSpeak}>
              Read aloud
            </button>
          )}
        </div>
      )}
    </div>
  );
}
