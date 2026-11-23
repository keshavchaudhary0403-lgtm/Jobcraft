"use client";

import { useState } from "react";

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
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not log in.");
    setBusy(false);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-accent text-white">
        <div className="font-serif text-2xl">JobPilot</div>
        <div className="max-w-md">
          <h1 className="font-serif text-4xl leading-tight">Your whole job search, one calm place.</h1>
          <p className="mt-4 text-white/80">
            Decode the JD, check your fit, tailor your resume, rewrite LinkedIn, reach the hiring manager,
            then practise the interview and the salary talk — all from your own saved details.
          </p>
        </div>
        <p className="text-sm text-white/60">“The output is only as good as what you put in.”</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <div className="font-serif text-2xl lg:hidden mb-6 text-accent">JobPilot</div>
            <h2 className="text-2xl font-semibold">Log in</h2>
            <p className="text-sm text-muted mt-1">Use the email or phone number your admin gave you.</p>
          </div>
          <div>
            <label className="label" htmlFor="id">Email or phone number</label>
            <input
              id="id"
              className="field"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 98765 43210"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-warm bg-warm-soft rounded-lg px-3 py-2">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          <p className="text-xs text-muted">Forgot your password? Ask your admin to reset it.</p>
        </form>
      </section>
    </main>
  );
}
