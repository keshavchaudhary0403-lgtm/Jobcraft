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
    <main className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-side p-10 text-cream lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-clay/20 blur-3xl" style={{ animation: "breathe 9s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-48 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-mustard/15 blur-3xl" style={{ animation: "breathe 11s ease-in-out infinite" }} />
        <div className="relative"><Logo light size={34} /></div>

        <div className="relative my-auto py-10">
          <h1 className="text-[4.2rem] font-bold leading-[0.95]">
            Get hired faster<span className="text-clay">.</span>
            <br />
            <span className="text-mustard">Stay honest.</span>
          </h1>

          {/* Product preview */}
          <div className="mt-10 max-w-[560px] rounded-[26px] bg-cream p-6 text-side shadow-[0_40px_80px_-40px_rgba(0,0,0,.6)] fade-up">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(14_55%_90%)] font-display text-[1.2rem] font-bold text-[hsl(14_45%_30%)]">A</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[1.25rem] font-bold leading-tight">Senior Product Manager</div>
                <div className="text-[0.88rem] text-muted">Acme · Bengaluru</div>
              </div>
              <div className="relative grid h-[68px] w-[68px] place-items-center">
                <svg width="68" height="68" className="-rotate-90">
                  <circle cx="34" cy="34" r="28" fill="none" stroke="var(--line)" strokeWidth="8" />
                  <circle cx="34" cy="34" r="28" fill="none" stroke="var(--good)" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * 0.22} />
                </svg>
                <span className="absolute font-display text-[1.05rem] font-bold">78%</span>
              </div>
            </div>
            <ol className="mt-6 grid grid-cols-7">
              {["Decoded", "Questions", "Resume", "Outreach", "Applied", "Interview", "Offer"].map((l, i) => (
                <li key={l} className="relative flex flex-col items-center">
                  {i > 0 && <span className={`absolute right-1/2 top-[11px] h-[2px] w-full ${i <= 3 ? "bg-brand" : "bg-line"}`} />}
                  <span className={`relative z-10 h-6 w-6 rounded-full ${i < 4 ? "bg-brand" : i === 4 ? "bg-clay ring-4 ring-clay-soft" : "border-[1.5px] border-line bg-card"}`} />
                  <span className={`mt-1.5 text-[0.76rem] ${i === 4 ? "font-bold text-clay" : "text-muted"}`}>{l}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 grid max-w-[560px] grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className="fade-up rounded-2xl border border-white/12 bg-white/[.06] p-4" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-white"><Icon size={16} /></span>
                <div className="mt-3 font-display text-[1rem] font-bold leading-tight">{title}</div>
                <div className="mt-0.5 text-[0.8rem] text-cream/80">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-[460px] fade-up">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <h2 className="text-[2.8rem] font-bold leading-none">Welcome back<span className="text-clay">.</span></h2>
          <p className="mt-3 text-[1.02rem] text-muted">Log in with your email or phone.</p>
          <div className="mt-9 space-y-5">
            <div>
              <label className="label font-semibold text-ink" htmlFor="id">Email or phone</label>
              <input id="id" className="field h-13 rounded-2xl text-[1.02rem]" style={{ height: "3.25rem" }} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 98765 43210" required />
            </div>
            <div>
              <label className="label font-semibold text-ink" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="field rounded-2xl text-[1.02rem]" style={{ height: "3.25rem" }} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          {error && <p className="mt-4 rounded-2xl bg-bad-soft px-4 py-2.5 text-sm text-bad fade-up">{error}</p>}
          <button className="btn btn-primary mt-8 w-full text-[1.02rem]" style={{ height: "3.25rem" }} disabled={busy}>
            {busy ? <Spinner /> : <>Log in <ArrowRight size={17} /></>}
          </button>
          <p className="mt-4 text-center text-[0.88rem] text-muted">Forgot your password? Ask your admin.</p>
          {demoOn && (
            <button type="button" onClick={demo} disabled={demoBusy} className="mt-8 flex w-full items-center gap-4 rounded-[22px] border-[1.5px] border-dashed border-clay/50 bg-clay-soft/40 p-4 text-left transition hover:border-clay hover:bg-clay-soft">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay text-white">{demoBusy ? <Spinner /> : <PlayCircle size={20} />}</span>
              <span className="flex-1">
                <span className="block font-display text-[1.1rem] font-bold">Explore the demo</span>
                <span className="block text-[0.84rem] text-muted">No sign-up. Sample data you can play with.</span>
              </span>
              <ArrowRight size={18} className="text-clay" />
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
