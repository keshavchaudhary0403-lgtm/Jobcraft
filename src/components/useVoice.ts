"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in TS DOM lib everywhere). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
  return Ctor ? new Ctor() : null;
}

/** Strip markdown so the voice reads naturally. */
export function speakable(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/₹/g, "rupees ")
    .replace(/\bLPA\b/g, "lakh per annum")
    .trim();
}

/**
 * Browser speech-to-text + text-to-speech. Works in Chrome, Edge and Safari.
 * Free — no extra API needed.
 */
export function useVoice() {
  const [supported, setSupported] = useState({ listen: false, speak: false });
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onDoneRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    // Feature detection must run on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported({ listen: !!getRecognition(), speak: typeof window !== "undefined" && "speechSynthesis" in window });
    return () => {
      recRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const startListening = useCallback((onDone: (text: string) => void) => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    onDoneRef.current = onDone;
    setTranscript("");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      if (text && cb) cb(text);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop(); // triggers onend → onDone(text)
  }, []);

  const cancelListening = useCallback(() => {
    onDoneRef.current = null;
    recRef.current?.abort();
    setListening(false);
    setTranscript("");
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    const voices = window.speechSynthesis.getVoices();
    u.voice =
      voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en-GB")) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { supported, listening, speaking, transcript, startListening, stopListening, cancelListening, speak, stopSpeaking };
}
