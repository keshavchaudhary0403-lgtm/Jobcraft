"use client";

import { useCallback, useEffect, useState } from "react";
import { AI_MODELS } from "@/lib/models";

type U = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  monthly_limit_inr: number | null;
  spent_inr: number;
  created_at: string;
};
type Settings = {
  ai_model: string;
  default_monthly_limit_inr: number | null;
  total_monthly_limit_inr: number | null;
  usd_to_inr: number;
};

const rupees = (n: number) => `₹${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-IN")}`;
const toNum = (v: string) => (v.trim() === "" ? null : Number(v));

export function AdminUsers({ meId }: { meId: string }) {
  const [users, setUsers] = useState<U[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [total, setTotal] = useState(0);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.users) {
      setUsers(data.users);
      setSettings(data.settings);
      setTotal(data.total_spent_inr);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setMsg(`Created. Login: ${f.phone || f.email}`);
      setF({ full_name: "", email: "", phone: "", password: "" });
      load();
    } else setMsg(data.error);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const data = await res.json();
    setMsg(data.ok ? "Updated ✓" : data.error);
    load();
  }

  async function saveSettings(body: Partial<Settings>) {
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setMsg(data.ok ? "Settings saved ✓" : data.error);
    load();
  }

  const budget = settings?.total_monthly_limit_inr;
  const budgetPct = budget ? Math.min(100, (total / budget) * 100) : 0;

  return (
    <div className="space-y-8">
      {settings && (
        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-medium">AI &amp; spending</h2>
              <p className="text-xs text-muted">Limits reset on the 1st of every month (India time). When a limit is reached, AI features pause for that user.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{rupees(total)}</div>
              <div className="text-xs text-muted">spent this month{budget != null ? ` of ${rupees(budget)}` : ""}</div>
            </div>
          </div>
          {budget != null && (
            <div className="h-2 overflow-hidden rounded-full bg-[#efebe4]">
              <div className={`h-full ${budgetPct >= 90 ? "bg-warm" : "bg-accent"}`} style={{ width: `${budgetPct}%` }} />
            </div>
          )}

          <div>
            <label className="label">AI model (for everyone)</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(AI_MODELS).map(([id, m]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => saveSettings({ ai_model: id })}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    settings.ai_model === id ? "border-accent bg-accent-soft" : "border-line bg-white hover:bg-[#f6f3ee]"
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="mt-1 text-xs text-muted">{m.note}</div>
                  <div className="mt-2 text-xs text-muted">
                    ${m.input} in · ${m.output} out per 1M tokens
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Default limit per user / month (₹)</label>
              <input
                key={`d${settings.default_monthly_limit_inr}`}
                type="number"
                min={0}
                className="field"
                placeholder="No limit"
                defaultValue={settings.default_monthly_limit_inr ?? ""}
                onBlur={(e) => toNum(e.target.value) !== settings.default_monthly_limit_inr && saveSettings({ default_monthly_limit_inr: toNum(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">Applies to everyone without their own limit — including new users.</p>
            </div>
            <div>
              <label className="label">Total budget, all users / month (₹)</label>
              <input
                key={`t${settings.total_monthly_limit_inr}`}
                type="number"
                min={0}
                className="field"
                placeholder="No limit"
                defaultValue={settings.total_monthly_limit_inr ?? ""}
                onBlur={(e) => toNum(e.target.value) !== settings.total_monthly_limit_inr && saveSettings({ total_monthly_limit_inr: toNum(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">A safety cap for your OpenAI credits.</p>
            </div>
            <div>
              <label className="label">1 US$ = ₹</label>
              <input
                key={`r${settings.usd_to_inr}`}
                type="number"
                min={1}
                step="0.5"
                className="field"
                defaultValue={settings.usd_to_inr}
                onBlur={(e) => Number(e.target.value) !== settings.usd_to_inr && saveSettings({ usd_to_inr: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-muted">OpenAI bills in dollars; used to show ₹.</p>
            </div>
          </div>
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </section>
      )}

      <form onSubmit={create} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="font-medium sm:col-span-2">Add a user</h2>
        <div>
          <label className="label">Name</label>
          <input className="field" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone (10 digits, or with country code)</label>
          <input className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="9876543210" />
        </div>
        <div>
          <label className="label">Email (optional if phone given)</label>
          <input type="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
          <span className="text-xs text-muted">New users get the default monthly limit.</span>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 font-medium">Spent this month</th>
              <th className="px-4 py-3 font-medium">Monthly limit (₹)</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const limit = u.monthly_limit_inr ?? settings?.default_monthly_limit_inr ?? null;
              const over = limit != null && u.spent_inr >= limit;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.full_name || "—"} {u.is_admin && <span className="ml-1 rounded bg-accent-soft px-1.5 text-xs text-accent">admin</span>}
                    {!u.is_active && <span className="ml-1 rounded bg-warm-soft px-1.5 text-xs text-warm">paused</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.phone ? `+${u.phone}` : ""}
                    {u.phone && u.email ? " · " : ""}
                    {u.email ?? ""}
                  </td>
                  <td className={`px-4 py-3 ${over ? "font-medium text-warm" : ""}`}>
                    {rupees(u.spent_inr)}
                    {limit != null && <span className="text-xs text-muted"> / {rupees(limit)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      key={`${u.id}${u.monthly_limit_inr}`}
                      type="number"
                      min={0}
                      className="field w-28 py-1.5"
                      placeholder={settings?.default_monthly_limit_inr != null ? `Default ${settings.default_monthly_limit_inr}` : "Default"}
                      defaultValue={u.monthly_limit_inr ?? ""}
                      onBlur={(e) => toNum(e.target.value) !== u.monthly_limit_inr && patch(u.id, { monthly_limit_inr: toNum(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <button
                        className="text-accent hover:underline"
                        onClick={() => {
                          const pw = prompt(`New password for ${u.full_name || u.phone || u.email}:`);
                          if (pw) patch(u.id, { password: pw });
                        }}
                      >
                        Reset password
                      </button>
                      {u.id !== meId && (
                        <>
                          <button className="hover:underline" onClick={() => patch(u.id, { is_active: !u.is_active })}>
                            {u.is_active ? "Pause" : "Unpause"}
                          </button>
                          <button className="hover:underline" onClick={() => patch(u.id, { is_admin: !u.is_admin })}>
                            {u.is_admin ? "Remove admin" : "Make admin"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-muted">Leave a user&apos;s limit blank to use the default. Set 0 to block AI for that user.</p>
      </div>
    </div>
  );
}
