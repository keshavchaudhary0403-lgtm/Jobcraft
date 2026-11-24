"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, Phone, PhoneOff, SkipForward } from "lucide-react";
import { cleanAi } from "@/lib/clean-ai";
import { Orb } from "./RealtimeCall";
import { Spinner } from "./client-ui";

type Turn = { id: string; role: "user" | "assistant"; text: string };
type Phase = "off" | "starting" | "listening" | "hearing" | "thinking" | "speaking";

/** Text to read aloud: no hidden tags, no markdown. */
const speakable = (t: string) =>
  cleanAi(t)
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/_\((.*?)\)_/g, "$1")
    .trim();

/**
 * Claude voice call: hands-free loop of listen -> transcribe -> the chosen AI model replies
 * (e.g. Claude, through the normal chat route) -> natural voice reads it out -> listen again.
 */
export function VoiceLoop({
  sessionId,
  aiName,
  kind,
  history,
  kickoff,
  modelName,
  asked,
}: {
  sessionId: string;
  aiName: string;
  kind: "interview" | "negotiation";
  history: { role: "user" | "assistant"; content: string }[];
  /** Hidden first message when the session has no messages at all (same as chat mode). */
  kickoff: { prompt: string; step: string } | null;
  modelName: string;
  /** Highest question number asked so far in this round (any mode). */
  asked: number;
}) {
  const [turns, setTurns] = useState<Turn[]>(() => history.map((m, i) => ({ id: `h${i}`, role: m.role, text: cleanAi(m.content) })));
  const [phase, setPhase] = useState<Phase>("off");
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const [finished, setFinished] = useState(false);
  const [qMax, setQMax] = useState(asked);
  const live = useRef(false);
  const kicked = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const skip = useRef<(() => void) | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const questions = qMax;

  useEffect(() => {
    const box = bottom.current?.closest("[data-voice-scroll]") as HTMLElement | null;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [turns]);
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    live.current = false;
    skip.current?.();
    audio.current?.pause();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setPhase("off");
  }

  /** Record one answer: starts when speech is heard, stops after ~1.3 s of silence (max 2 min). */
  function listen(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const s = stream.current;
      if (!s) return resolve(null);
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const rec = new MediaRecorder(s);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      let heard = false;
      let quietSince = 0;
      const startedAt = performance.now();
      const finish = (keep: boolean) => {
        clearInterval(timer);
        ctx.close();
        rec.onstop = () => resolve(keep && heard ? new Blob(chunks, { type: rec.mimeType }) : null);
        if (rec.state !== "inactive") rec.stop();
        else resolve(null);
      };
      skip.current = () => finish(false);
      rec.start(250);
      const timer = setInterval(() => {
        if (!live.current) return finish(false);
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > 0.035) {
          if (!heard) setPhase("hearing");
          heard = true;
          quietSince = now;
        } else if (heard && now - quietSince > 1300) finish(true);
        if (now - startedAt > 120_000) finish(true);
      }, 80);
    });
  }

  /** Send to the chat route (the person's AI model), return the full reply. */
  async function ask(content: string, step: string, show: boolean): Promise<string> {
    if (show) setTurns((t) => [...t, { id: crypto.randomUUID(), role: "user", text: content }]);
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, content, step, spoken: true }) });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "The AI didn't answer. Try again.");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, role: "assistant", text: "" }]);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += dec.decode(value, { stream: true });
      const q = Math.max(0, ...[...full.matchAll(/\[\[Q(\d)\]\]/g)].map((x) => Number(x[1])));
      if (q) setQMax((m) => Math.max(m, q));
      const shown = cleanAi(full);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, text: shown } : x)));
    }
    if (full.startsWith("⚠️") || /\n\n⚠️/.test(full)) throw new Error(full.replace(/^[\s\S]*⚠️\s*/, ""));
    return full;
  }

  /** Voice one piece of text; returns an object URL for the mp3. */
  async function voiceOf(words: string) {
    const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, text: words, kind }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't play the voice.");
    return URL.createObjectURL(await res.blob());
  }

  /**
   * Read a reply aloud; resolves when finished or skipped. Sentences are voiced in parallel and
   * played in order, so the first one starts as soon as it is ready instead of after the whole reply.
   */
  async function say(text: string) {
    const words = speakable(text);
    if (!words || !live.current) return;
    setPhase("speaking");
    const parts = (words.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [words]).map((x) => x.trim()).filter(Boolean);
    // Merge very short pieces so the voice doesn't sound choppy.
    const chunks: string[] = [];
    for (const p of parts) {
      if (chunks.length && p.length < 25) chunks[chunks.length - 1] += ` ${p}`;
      else chunks.push(p);
    }
    const urls = chunks.map((c) => voiceOf(c));
    let skipped = false;
    for (const pending of urls) {
      const url = await pending;
      if (skipped || !live.current) { URL.revokeObjectURL(url); continue; }
      await new Promise<void>((resolve) => {
        const a = new Audio(url);
        audio.current = a;
        const done = () => { skip.current = null; URL.revokeObjectURL(url); resolve(); };
        skip.current = () => { skipped = true; a.pause(); done(); };
        a.onended = done;
        a.onerror = done;
        a.play().catch(done);
      });
    }
  }

  async function loop(firstReply: string | null) {
    let reply = firstReply;
    while (live.current) {
      if (reply) {
        await say(reply);
        if (/\[\[END\]\]/.test(reply)) {
          stop();
          setEnded(true);
          setFinished(true);
          window.dispatchEvent(new CustomEvent("jc:practice-ended", { detail: { sessionId } }));
          return;
        }
      }
      if (!live.current) return;
      setPhase("listening");
      const blob = await listen();
      if (!live.current) return;
      if (!blob) { reply = null; continue; }
      setPhase("thinking");
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("audio", blob, "answer.webm");
      const t = await fetch("/api/voice/transcribe", { method: "POST", body: fd }).then((r) => r.json());
      if (t.error) throw new Error(t.error);
      if (!t.text) { reply = null; continue; }
      reply = await ask(t.text, "voice", true);
    }
  }

  async function start() {
    setError("");
    setEnded(false);
    setPhase("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      live.current = true;
      let first: string | null;
      if (kickoff && !kicked.current) {
        // Brand-new session: same hidden opening as chat mode, then the call starts.
        kicked.current = true;
        const opening = await ask(kickoff.prompt, kickoff.step, false);
        first = kind === "interview" ? await ask("ready", "voice", true) : opening;
      } else {
        // Session already has a conversation (voice or chat): carry on from it.
        first = await ask("(We're continuing on a voice call - pick up naturally from where we stopped.)", "voice_resume", false);
      }
      await loop(first);
    } catch (e) {
      stop();
      const msg = e instanceof Error ? e.message : "";
      setError(/Permission|NotAllowed/i.test(msg) ? "Allow the microphone in your browser, then try again." : msg || "Something went wrong. Try again.");
    }
  }

  const on = phase !== "off";
  const orb = phase === "speaking" ? "ai" : phase === "hearing" ? "you" : on ? "idle" : "off";
  const title =
    phase === "starting" ? "Connecting..." : phase === "speaking" ? `${aiName} is speaking` : phase === "hearing" ? "Listening..." : phase === "listening" ? "Your turn - just talk" : phase === "thinking" ? `${aiName} is thinking...` : finished ? "This round is finished" : ended ? "Call ended" : "Ready when you are";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="dark-card flex shrink-0 flex-wrap items-center gap-5 p-5 fade-up">
        <Orb state={orb} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[0.78rem]">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">{modelName} voice</span>
            {on && kind === "interview" && <span className="rounded-full bg-mustard px-2.5 py-0.5 font-semibold text-side">Question {Math.min(Math.max(questions, 1), 6)} of 6</span>}
          </div>
          <div className="mt-2 font-display text-[1.35rem] font-bold leading-tight">{title}</div>
          <p className="mt-0.5 text-[0.84rem] text-cream/85">
            {on ? "Talk, then pause - it replies when you stop. Tap Skip to cut it short." : finished ? (kind === "interview" ? "Your scorecard is on the right. Start a new round for fresh questions." : "Your feedback is in the transcript. Start a new talk to practise again.") : `${modelName} plays the ${kind === "interview" ? "interviewer" : "HR manager"} and speaks out loud. Headphones help.`}
          </p>
          {kind === "interview" && <div className="mt-3 grid max-w-xs grid-cols-6 gap-1">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={`h-1.5 rounded-full ${n <= questions ? "bg-mustard" : "bg-white/15"}`} />)}</div>}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto [&>.btn]:flex-1 sm:[&>.btn]:flex-none">
          {!on && finished ? null : !on ? (
            <button onClick={start} className="btn btn-clay h-12 px-6 text-[1rem]"><Phone size={17} /> {ended || turns.length ? "Continue call" : "Start call"}</button>
          ) : (
            <>
              {(phase === "speaking" || phase === "hearing") && (
                <button onClick={() => skip.current?.()} className="flex h-12 items-center gap-1.5 rounded-full bg-white/10 px-4 font-semibold text-cream transition hover:bg-white/20">
                  <SkipForward size={16} /> {phase === "speaking" ? "Skip" : "Done"}
                </button>
              )}
              {phase === "starting" || phase === "thinking" ? <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Spinner /></span> : null}
              <button onClick={stop} className="btn h-12 bg-bad px-6 text-[1rem] text-white hover:opacity-90"><PhoneOff size={17} /> End call</button>
            </>
          )}
        </div>
        {error && <p className="flex w-full items-start gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[0.86rem] font-medium text-white"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
      </div>

      <div data-voice-scroll className="card thin-scroll min-h-[320px] flex-1 overflow-y-auto p-5 xl:min-h-0">
        <div className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">Transcript</div>
        {turns.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center text-center text-muted">
            <div><Mic size={22} className="mx-auto text-brand" /><p className="mt-3 max-w-sm text-[0.92rem]">What you both say appears here, and the full transcript is saved.</p></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.filter((t) => t.text).map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end fade-up">
                  <div className="max-w-[85%] rounded-[18px] rounded-br-md bg-side px-4 py-2.5 text-[0.92rem] text-cream">{t.text}</div>
                </div>
              ) : (
                <div key={t.id} className="max-w-[90%] fade-up">
                  <div className="mb-1 text-[0.8rem] font-semibold text-faint">{aiName}</div>
                  <div className="whitespace-pre-wrap rounded-[18px] rounded-tl-md px-4 py-3 text-[0.95rem] leading-relaxed" style={{ background: "var(--color-cream)" }}>{t.text}</div>
                </div>
              ),
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>
    </div>
  );
}
