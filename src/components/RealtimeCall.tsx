"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Phone, AlertCircle } from "lucide-react";
import { Spinner } from "./client-ui";

type Turn = { id: string; role: "user" | "assistant"; text: string; live?: boolean };
type Status = "idle" | "connecting" | "live" | "ended" | "error";

const MAX_MINUTES = 25;

/**
 * Realistic voice practice: the browser talks to OpenAI Realtime over WebRTC using a
 * short-lived secret from our server. Every finished turn is saved to the session
 * transcript (in order) and every response's cost is logged against the user.
 */
export function RealtimeCall({ sessionId, aiName, kind, history }: { sessionId: string; aiName: string; kind: "interview" | "negotiation"; history: { role: "user" | "assistant"; content: string }[] }) {
  const initialTurns = history.filter((m) => m.role === "assistant" && m.content.includes("?")).length;
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => history.map((m, i) => ({ id: `h${i}`, role: m.role, text: m.content })));
  const [speaking, setSpeaking] = useState<"ai" | "you" | null>(null);
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingUser = useRef<Map<string, (t: string) => void>>(new Map());
  const userWaits = useRef<Promise<string>[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  const questions = turns.filter((t) => t.role === "assistant" && t.text.includes("?")).length;

  const seen = useRef(turns.length);
  useEffect(() => {
    // Follow new captions during a call - but don't jump the page on first load.
    if (turns.length > seen.current) bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    seen.current = turns.length;
  }, [turns]);
  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => {
    if (status === "live" && secs >= MAX_MINUTES * 60) end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs, status]);
  useEffect(() => () => hangUp(), []);

  /** Serialised save so the transcript keeps the spoken order. */
  function save(body: object) {
    queue.current = queue.current.then(() =>
      fetch("/api/voice/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, ...body }), keepalive: true }).catch(() => {}),
    );
  }

  function upsert(id: string, role: Turn["role"], text: string, live: boolean) {
    setTurns((ts) => {
      const i = ts.findIndex((t) => t.id === id);
      if (i === -1) return [...ts, { id, role, text, live }];
      const next = ts.slice();
      next[i] = { ...next[i], text, live };
      return next;
    });
  }

  function onEvent(e: { type: string; [k: string]: unknown }) {
    switch (e.type) {
      case "input_audio_buffer.speech_started": {
        setSpeaking("you");
        const id = String(e.item_id ?? `u${Date.now()}`);
        upsert(id, "user", "...", true);
        // The reply may finish before this transcript does - make the reply wait for it.
        userWaits.current.push(new Promise<string>((res) => pendingUser.current.set(id, res)));
        break;
      }
      case "input_audio_buffer.speech_stopped":
        setSpeaking(null);
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const id = String(e.item_id);
        const text = String(e.transcript ?? "").trim();
        upsert(id, "user", text || "(inaudible)", false);
        if (text) save({ role: "user", content: text });
        pendingUser.current.get(id)?.(text);
        pendingUser.current.delete(id);
        break;
      }
      case "conversation.item.input_audio_transcription.failed": {
        const id = String(e.item_id);
        upsert(id, "user", "(couldn't hear that clearly)", false);
        pendingUser.current.get(id)?.("");
        pendingUser.current.delete(id);
        break;
      }
      case "response.output_audio_transcript.delta": {
        const id = `a${String(e.response_id ?? e.item_id)}`;
        setTurns((ts) => {
          const i = ts.findIndex((t) => t.id === id);
          if (i === -1) return [...ts, { id, role: "assistant", text: String(e.delta ?? ""), live: true }];
          const next = ts.slice();
          next[i] = { ...next[i], text: next[i].text + String(e.delta ?? "") };
          return next;
        });
        break;
      }
      case "response.output_audio_transcript.done": {
        const id = `a${String(e.response_id ?? e.item_id)}`;
        const text = String(e.transcript ?? "").trim();
        upsert(id, "assistant", text, false);
        const waits = userWaits.current.splice(0);
        Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 4000))]).then(() => {
          if (text) save({ role: "assistant", content: text });
        });
        break;
      }
      case "output_audio_buffer.started":
        setSpeaking("ai");
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        setSpeaking(null);
        break;
      case "response.done": {
        const usage = (e.response as { usage?: object } | undefined)?.usage;
        if (usage) save({ usage });
        break;
      }
      case "error": {
        const msg = (e.error as { message?: string } | undefined)?.message;
        if (msg) console.warn("realtime:", msg);
        break;
      }
    }
  }

  async function start() {
    setError("");
    setStatus("connecting");
    try {
      const res = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the call.");

      mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const peer = new RTCPeerConnection();
      pc.current = peer;
      audio.current = new Audio();
      audio.current.autoplay = true;
      peer.ontrack = (ev) => {
        if (audio.current) audio.current.srcObject = ev.streams[0];
      };
      mic.current.getTracks().forEach((t) => peer.addTrack(t, mic.current!));
      const dc = peer.createDataChannel("oai-events");
      dc.onmessage = (m) => {
        try {
          onEvent(JSON.parse(m.data));
        } catch {}
      };
      dc.onopen = () => {
        setStatus("live");
        dc.send(JSON.stringify({ type: "response.create" })); // interviewer speaks first
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setError("The call dropped. Your transcript so far is saved - start again to continue.");
          end();
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${data.secret}`, "Content-Type": "application/sdp" },
      });
      if (!sdp.ok) throw new Error("The voice service didn't answer. Try again.");
      await peer.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
    } catch (e) {
      hangUp();
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Couldn't start the call.";
      setError(/denied|permission|NotAllowed/i.test(msg) ? "Microphone blocked. Allow microphone access in your browser, then try again." : msg);
    }
  }

  function hangUp() {
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    mic.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    pc.current = null;
    mic.current = null;
    if (audio.current) audio.current.srcObject = null;
  }

  async function end() {
    hangUp();
    setSpeaking(null);
    setStatus("ended");
    await Promise.race([queue.current, new Promise((r) => setTimeout(r, 4000))]);
    router.refresh();
  }

  function toggleMute() {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const live = status === "live";
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <div className="dark-card flex flex-wrap items-center gap-5 p-5 fade-up">
        <Orb state={speaking ?? (live ? "idle" : "off")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[0.78rem]">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">Realistic voice</span>
            {live && <span className="rounded-full bg-white/10 px-2.5 py-0.5 tabular-nums">{mm}:{ss}</span>}
            {live && kind === "interview" && <span className="rounded-full bg-mustard px-2.5 py-0.5 font-semibold text-side">Question {Math.min(Math.max(questions, 1), 6)} of 6</span>}
          </div>
          <div className="mt-2 font-display text-[1.35rem] font-bold leading-tight">
            {status === "connecting" ? "Connecting..." : !live ? (status === "ended" ? "Call ended" : "Ready when you are") : speaking === "ai" ? `${aiName} is speaking` : speaking === "you" ? "Listening..." : muted ? "You're muted" : "Your turn - just talk"}
          </div>
          <p className="mt-0.5 text-[0.84rem] text-cream/65">
            {live ? "Speak naturally. You can interrupt, like a real call." : kind === "interview" ? "A live interviewer who listens and talks back. Headphones help." : "A live HR manager. Headphones help."}
          </p>
          {kind === "interview" && (
            <div className="mt-3 grid max-w-xs grid-cols-6 gap-1">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={`h-1.5 rounded-full ${n <= questions ? "bg-mustard" : "bg-white/15"}`} />)}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!live ? (
            <button onClick={start} disabled={status === "connecting"} className="btn btn-clay h-12 px-6 text-[1rem]">
              {status === "connecting" ? <Spinner /> : <Phone size={17} />} {status === "ended" || initialTurns > 0 ? "Continue call" : "Start call"}
            </button>
          ) : (
            <>
              <button onClick={toggleMute} className={`grid h-12 w-12 place-items-center rounded-full transition ${muted ? "bg-bad text-white" : "bg-white/10 text-cream hover:bg-white/20"}`} aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={end} className="btn h-12 bg-bad px-6 text-[1rem] text-white hover:opacity-90"><PhoneOff size={17} /> End call</button>
            </>
          )}
        </div>
        {error && <p className="flex w-full items-start gap-1.5 text-[0.86rem] text-clay-2"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
      </div>

      <div className="card min-h-[320px] p-5">
        <div className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">Transcript</div>
        {turns.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center text-center text-muted">
            <div><Mic size={22} className="mx-auto text-brand" /><p className="mt-3 max-w-sm text-[0.92rem]">Live captions appear here, and the full transcript is saved.</p></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end fade-up">
                  <div className={`max-w-[85%] rounded-[18px] rounded-br-md bg-side px-4 py-2.5 text-[0.92rem] text-cream ${t.live ? "opacity-70" : ""}`}>{t.text}</div>
                </div>
              ) : (
                <div key={t.id} className="max-w-[90%] fade-up">
                  <div className="mb-1 text-[0.8rem] font-semibold text-faint">{aiName}</div>
                  <div className={`rounded-[18px] rounded-tl-md px-4 py-3 text-[0.95rem] leading-relaxed ${t.live ? "text-muted" : ""}`} style={{ background: "var(--color-cream)" }}>{t.text || "..."}</div>
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

function Orb({ state }: { state: "ai" | "you" | "idle" | "off" }) {
  const active = state === "ai" || state === "you";
  const color = state === "you" ? "from-clay-2 to-clay" : "from-brand-2 to-mustard";
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      {active && (
        <>
          <span className={`absolute inset-3 rounded-full bg-gradient-to-br ${color} opacity-25`} style={{ animation: "ripple 2.2s ease-out infinite" }} />
          <span className={`absolute inset-3 rounded-full bg-gradient-to-br ${color} opacity-25`} style={{ animation: "ripple 2.2s ease-out .8s infinite" }} />
        </>
      )}
      <span
        className={`relative h-16 w-16 rounded-full bg-gradient-to-br ${color} shadow-2xl transition-all duration-500 ${state === "off" ? "opacity-60 grayscale-[30%]" : ""}`}
        style={{ animation: active ? "breathe 1.4s ease-in-out infinite" : "breathe 4s ease-in-out infinite" }}
      />
    </div>
  );
}
