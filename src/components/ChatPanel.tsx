"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Mic, Square, Volume2, VolumeX } from "lucide-react";
import type { Message } from "@/lib/types";
import { useVoice } from "./useVoice";
import { CopyButton } from "./client-ui";

type Props = {
  sessionId: string;
  initialMessages: Message[];
  /** Voice "call" mode: big mic, replies read aloud. */
  voice?: boolean;
  /** One-tap replies, e.g. "Ready". */
  quickReplies?: string[];
  /** Hidden instruction sent automatically when the session is empty. */
  autoStart?: { prompt: string; step: string };
  suggestions?: string[];
  placeholder?: string;
  /** Label for the AI side, e.g. "Interviewer". */
  aiName?: string;
};

type LocalMsg = Pick<Message, "role" | "content" | "step"> & { id: string; pending?: boolean };

export function ChatPanel({ sessionId, initialMessages, voice, quickReplies, autoStart, suggestions, placeholder, aiName = "Coach" }: Props) {
  const [messages, setMessages] = useState<LocalMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(!!voice);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const v = useVoice();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(content: string, step: string | null = null) {
    if (!content.trim() || busy) return;
    setBusy(true);
    v.stopSpeaking();
    const aiId = `a${Date.now()}`;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", content, step }, { id: aiId, role: "assistant", content: "", step, pending: true }]);
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
      text = text || "⚠️ Network problem. Try again.";
    }
    setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, content: text, pending: false } : x)));
    setBusy(false);
    if (voice && speakOn && text && !text.startsWith("⚠️")) v.speak(text);
  }

  useEffect(() => {
    if (autoStart && !started.current && initialMessages.length === 0) {
      started.current = true;
      send(autoStart.prompt, autoStart.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = messages.filter((m) => !(m.role === "user" && m.step)); // hide backend prompts
  const state = v.listening ? "listening" : busy ? "thinking" : v.speaking ? "speaking" : "idle";

  return (
    <div className="flex flex-col gap-4">
      {voice && (
        <div className="dark-card flex flex-wrap items-center gap-5 p-5 fade-up">
          <VoiceOrb state={state} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[1.35rem] font-bold leading-tight">
              {state === "listening" ? "Listening..." : state === "thinking" ? `${aiName} is thinking...` : state === "speaking" ? `${aiName} is speaking` : "Your turn"}
            </div>
            <div className="mt-0.5 min-h-5 text-[0.86rem] text-cream/65">{v.listening ? v.transcript || "Tap ■ when you finish your answer" : v.supported.listen ? "Tap the mic and answer out loud - or type below." : "Voice works in Chrome, Edge and Safari. You can type below."}</div>
          </div>
          <div className="flex items-center gap-2">
            {v.supported.speak && (
              <button className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-cream transition hover:bg-white/20" onClick={() => { setSpeakOn(!speakOn); v.stopSpeaking(); }} aria-label="Toggle voice replies">
                {speakOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            )}
            {v.supported.listen && (
              <button
                onClick={() => (v.listening ? v.stopListening() : v.startListening((t) => send(t)))}
                disabled={busy}
                className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-xl transition hover:scale-105 disabled:opacity-40 ${v.listening ? "bg-bad" : "bg-clay"}`}
                aria-label={v.listening ? "Stop and send" : "Answer by voice"}
              >
                {v.listening ? <Square size={20} fill="currentColor" /> : <Mic size={24} />}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        {visible.length === 0 && !busy && suggestions && (
          <div className="flex flex-wrap gap-2 fade-up">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="chip border border-line bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-brand/40 hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        )}
        {visible.map((m) => (
          <Bubble key={m.id} msg={m} aiName={aiName} onSpeak={voice ? () => v.speak(m.content) : undefined} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pb-4 pt-3">
        {quickReplies && quickReplies.length > 0 && (
          <div className="mb-2 flex gap-2">
            {quickReplies.map((q) => (
              <button key={q} className="chip border border-line bg-white px-3 py-1.5 text-sm hover:border-brand/40" disabled={busy} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="card flex items-end gap-2 p-2 focus-within:border-brand/50">
          <textarea
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-faint"
            rows={1}
            placeholder={placeholder ?? "Message..."}
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
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay text-white transition hover:bg-[#c9532f] disabled:opacity-30"
            disabled={busy || !input.trim()}
            onClick={() => {
              const t = input;
              setInput("");
              send(t);
            }}
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function VoiceOrb({ state }: { state: "idle" | "listening" | "thinking" | "speaking" }) {
  const active = state !== "idle";
  const color = state === "listening" ? "from-[#f0a27f] to-[#e0653f]" : "from-[#9cc5b2] to-[#e2a92c]";
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      {active && (
        <>
          <span className={`absolute inset-2 rounded-full bg-gradient-to-br ${color} opacity-25`} style={{ animation: "ripple 2.2s ease-out infinite" }} />
          <span className={`absolute inset-2 rounded-full bg-gradient-to-br ${color} opacity-25`} style={{ animation: "ripple 2.2s ease-out .8s infinite" }} />
        </>
      )}
      <span
        className={`relative h-16 w-16 rounded-full bg-gradient-to-br ${color} shadow-2xl transition-all duration-500`}
        style={{ animation: active ? "breathe 1.6s ease-in-out infinite" : "breathe 4s ease-in-out infinite", boxShadow: "0 20px 60px -20px color-mix(in srgb, var(--brand) 60%, transparent), inset 0 -10px 30px rgba(255,255,255,.25)" }}
      />
    </div>
  );
}

function Bubble({ msg, aiName, onSpeak }: { msg: LocalMsg; aiName: string; onSpeak?: () => void }) {
  if (msg.role === "user")
    return (
      <div className="flex justify-end fade-up">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-side px-4 py-2.5 text-[0.92rem] text-cream">{msg.content}</div>
      </div>
    );
  return (
    <div className="fade-up">
      <div className="mb-1 text-xs font-medium text-faint">{aiName}</div>
      <div className="rounded-[18px] rounded-tl-md border-[1.5px] border-line bg-card px-4 py-3">
        {msg.pending && !msg.content ? (
          <div className="flex gap-1 py-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-clay/60" style={{ animation: `breathe 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        ) : (
          <div className="prose-ai">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {!msg.pending && msg.content && (
        <div className="mt-1.5 flex gap-1">
          <CopyButton text={msg.content} className="border-0 bg-transparent px-2 py-1 text-faint shadow-none hover:text-ink" />
          {onSpeak && (
            <button className="btn-quiet rounded-lg text-xs" onClick={onSpeak}><Volume2 size={13} /></button>
          )}
        </div>
      )}
    </div>
  );
}
