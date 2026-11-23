"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, Mic, PlayCircle, Target } from "lucide-react";
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
  const [demoOn, setDemoOn] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/demo").then((r) => r.json()).then((d) => setDemoOn(!!d.enabled)).catch(() => {});
  }, []);

  async function demo() {
    setDemoBusy(true);
    setError("");
    const res = await fetch("/api/auth/demo", { method: "POST" });
    if (res.ok) return window.location.assign("/");
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Couldn't open the demo.");
    setDemoBusy(false);
  }

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
    <main className="grid min-h-screen bg-bg lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-side p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/30 blur-3xl" style={{ animation: "breathe 9s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-48 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-brand-2/25 blur-3xl" style={{ animation: "breathe 11s ease-in-out infinite" }} />
        <div className="relative"><Logo light /></div>
        <div className="relative my-auto max-w-xl">
          <h1 className="text-[3.2rem] font-bold leading-[1.05] tracking-tight">
            Get hired faster.
            <br />
            <span className="bg-gradient-to-r from-brand-2 to-white bg-clip-text text-transparent">Stay honest.</span>
          </h1>
          <div className="mt-10 space-y-3">
            {FEATURES.map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className="fade-up flex items-center gap-4 rounded-2xl border border-white/12 bg-white/[.06] px-5 py-4 backdrop-blur" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2/80 shadow-lg shadow-black/20"><Icon size={19} /></div>
                <div>
                  <div className="text-[1.05rem] font-semibold">{title}</div>
                  <div className="text-[0.9rem] text-white/65">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="card w-full max-w-[440px] p-8 shadow-[0_30px_80px_-40px_color-mix(in_srgb,var(--brand)_45%,transparent)] fade-up sm:p-10">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-[1.85rem] font-bold leading-tight tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-[0.98rem] text-muted">Log in with your email or phone.</p>
          <div className="mt-8 space-y-4">
            <div>
              <label className="label font-semibold text-ink" htmlFor="id">Email or phone</label>
              <input id="id" className="field h-12 text-[1rem]" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 98765 43210" required />
            </div>
            <div>
              <label className="label font-semibold text-ink" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="field h-12 text-[1rem]" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          {error && <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad fade-up">{error}</p>}
          <button className="btn btn-primary mt-7 h-12 w-full text-[1rem] font-semibold" disabled={busy}>
            {busy ? <Spinner /> : <>Log in <ArrowRight size={16} /></>}
          </button>
          <p className="mt-5 text-center text-[0.88rem] text-muted">Forgot your password? Ask your admin.</p>
          {demoOn && (
            <div className="mt-6 border-t border-line pt-6">
              <button type="button" onClick={demo} disabled={demoBusy} className="btn btn-ghost h-12 w-full text-[1rem] font-semibold">
                {demoBusy ? <Spinner /> : <PlayCircle size={17} className="text-brand" />} Explore the demo
              </button>
              <p className="mt-2 text-center text-[0.82rem] text-faint">No sign-up. Sample data you can play with.</p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
