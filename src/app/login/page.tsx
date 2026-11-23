"use client";

import { useState } from "react";
import { ArrowRight, FileText, Mic, Target } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/client-ui";

const FEATURES = [
  { icon: Target, title: "Know your match", sub: "An honest score for every job" },
  { icon: FileText, title: "Resume per job", sub: "Tailored, ATS-safe, truthful" },
  { icon: Mic, title: "Practise out loud", sub: "Interviews and salary talks" },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (res.ok) return window.location.assign("/");
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not log in.");
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-side p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-500/25 blur-3xl" style={{ animation: "breathe 9s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-48 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-indigo-600/25 blur-3xl" style={{ animation: "breathe 11s ease-in-out infinite" }} />
        <div className="relative"><Logo light /></div>
        <div className="relative my-auto max-w-md">
          <h1 className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight">
            Get hired faster.
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">Stay honest.</span>
          </h1>
          <div className="mt-10 space-y-3">
            {FEATURES.map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className="fade-up flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Icon size={18} /></div>
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-white/55">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm fade-up">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Log in with your email or phone.</p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="id">Email or phone</label>
              <input id="id" className="field py-3" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 98765 43210" required />
            </div>
            <div>
              <label className="label" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="field py-3" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          {error && <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad fade-up">{error}</p>}
          <button className="btn btn-primary mt-6 w-full py-3" disabled={busy}>
            {busy ? <Spinner /> : <>Log in <ArrowRight size={16} /></>}
          </button>
          <p className="mt-6 text-center text-xs text-faint">Forgot your password? Ask your admin.</p>
        </form>
      </section>
    </main>
  );
}
