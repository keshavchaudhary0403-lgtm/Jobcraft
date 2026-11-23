"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, IndianRupee, KeyRound, Pause, Play, Plus, Search, Shield, Users } from "lucide-react";
import { AI_MODELS } from "@/lib/models";
import { StatTile } from "@/components/ui";
import { Modal, Spinner } from "@/components/client-ui";

type U = { id: string; full_name: string | null; email: string | null; phone: string | null; is_admin: boolean; is_active: boolean; monthly_limit_inr: number | null; spent_inr: number; created_at: string };
type Settings = { ai_model: string; default_monthly_limit_inr: number | null; total_monthly_limit_inr: number | null; usd_to_inr: number; fx_auto: boolean; fx_updated_at: string | null; fx_source: string | null };

const rupees = (n: number) => `₹${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-IN")}`;
const toNum = (v: string) => (v.trim() === "" ? null : Number(v));

export function AdminUsers({ meId }: { meId: string }) {
  const [users, setUsers] = useState<U[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"users" | "ai">("users");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const data = await fetch("/api/admin/users").then((r) => r.json());
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

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  async function patch(id: string, body: Record<string, unknown>) {
    const data = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).then((r) => r.json());
    flash(data.ok ? "Saved" : data.error);
    load();
  }
  async function saveSettings(body: Partial<Settings>) {
    const data = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    flash(data.ok ? "Saved" : data.error);
    load();
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? users.filter((u) => [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(t))) : users;
  }, [users, q]);

  const budget = settings?.total_monthly_limit_inr ?? null;
  const model = settings ? AI_MODELS[settings.ai_model as keyof typeof AI_MODELS] : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">Admin</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add user</button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4 stagger">
        <button className="text-left" onClick={() => setTab("ai")}><StatTile interactive icon={<IndianRupee size={18} />} label="Spent this month" value={rupees(total)} sub={budget != null ? `of ${rupees(budget)} budget` : "No budget cap"} /></button>
        <button className="text-left" onClick={() => setTab("users")}><StatTile interactive tone="sun" icon={<Users size={18} />} label="Users" value={users.length} sub={`${users.filter((u) => u.is_active).length} active`} /></button>
        <button className="text-left" onClick={() => setTab("ai")}><StatTile interactive tone="lilac" icon={<Bot size={18} />} label="AI model" value={<span className="text-[1.05rem]">{model?.label.split(" —")[0] ?? "—"}</span>} sub={model ? `$${model.input} / $${model.output} per 1M tokens` : undefined} /></button>
        <button className="text-left" onClick={() => setTab("ai")}><StatTile interactive tone="mint" icon={<span className="text-[0.95rem] font-semibold">$</span>} label="1 US$" value={settings ? `₹${settings.usd_to_inr}` : "—"} sub={settings?.fx_auto ? "Live rate" : "Fixed rate"} /></button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-line-2 p-1">
          {([["users", "Users"], ["ai", "AI & limits"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`h-8 rounded-lg px-3.5 text-[0.9rem] transition ${tab === k ? "bg-white font-medium shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}>{l}</button>
          ))}
        </div>
        {tab === "users" && (
          <div className="relative w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="field h-9 pl-9" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </div>

      {tab === "users" ? (
        <div className="card overflow-hidden fade-up">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-slate-50/70 text-left text-[0.8rem] text-muted">
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">Spent this month</th>
                <th className="px-4 py-2.5 font-medium">Monthly limit</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="w-px px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {shown.map((u) => {
                const limit = u.monthly_limit_inr ?? settings?.default_monthly_limit_inr ?? null;
                const pct = limit ? Math.min(100, (u.spent_inr / limit) * 100) : 0;
                const name = u.full_name || u.email || (u.phone ? `+${u.phone}` : "—");
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-semibold text-brand-ink">{name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium">{name}{u.is_admin && <Shield size={13} className="text-brand" aria-label="Admin" />}</div>
                          <div className="truncate text-[0.82rem] text-muted">{[u.phone && `+${u.phone}`, u.email].filter(Boolean).join(" · ")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="tabular-nums">{rupees(u.spent_inr)}</div>
                      {limit != null && (
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-line-2">
                          <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : "bg-brand"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-faint">₹</span>
                        <input
                          key={`${u.id}${u.monthly_limit_inr}`}
                          type="number"
                          min={0}
                          className="field h-8 pl-6 text-[0.88rem]"
                          placeholder={settings?.default_monthly_limit_inr != null ? `${settings.default_monthly_limit_inr}` : "—"}
                          defaultValue={u.monthly_limit_inr ?? ""}
                          onBlur={(e) => toNum(e.target.value) !== u.monthly_limit_inr && patch(u.id, { monthly_limit_inr: toNum(e.target.value) })}
                          title="Blank = default limit. 0 = no AI."
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">{u.is_active ? <span className="chip bg-good-soft text-good">Active</span> : <span className="chip bg-slate-100 text-slate-500">Paused</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-quiet" title="Reset password" onClick={() => { const pw = prompt(`New password for ${name}:`); if (pw) patch(u.id, { password: pw }); }}><KeyRound size={15} /></button>
                        {u.id !== meId && (
                          <>
                            <button className="btn-quiet" title={u.is_active ? "Pause" : "Unpause"} onClick={() => patch(u.id, { is_active: !u.is_active })}>{u.is_active ? <Pause size={15} /> : <Play size={15} />}</button>
                            <button className={`btn-quiet ${u.is_admin ? "text-brand" : ""}`} title={u.is_admin ? "Remove admin" : "Make admin"} onClick={() => patch(u.id, { is_admin: !u.is_admin })}><Shield size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-line px-4 py-2.5 text-[0.8rem] text-faint">Blank limit = default (₹{settings?.default_monthly_limit_inr ?? "—"}). Set 0 to turn off AI for someone.</div>
        </div>
      ) : (
        settings && (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] fade-up">
            <section className="card p-5">
              <div className="card-head"><span className="ico"><Bot size={15} /></span><span className="flex-1">AI model</span><span className="text-[0.82rem] font-normal text-muted">Used for everyone</span></div>
              <div className="space-y-2.5">
                {Object.entries(AI_MODELS).map(([id, m]) => (
                  <button key={id} data-on={settings.ai_model === id} onClick={() => saveSettings({ ai_model: id })} className="option flex w-full items-center gap-4 p-3.5">
                    <span className={`h-4 w-4 shrink-0 rounded-full border-[5px] ${settings.ai_model === id ? "border-brand" : "border-line"}`} />
                    <span className="flex-1">
                      <span className="block font-medium">{m.label}</span>
                      <span className="block text-[0.85rem] text-muted">{m.note}</span>
                    </span>
                    <span className="text-right text-[0.8rem] tabular-nums text-faint">${m.input} in<br />${m.output} out</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="card p-5">
              <div className="card-head"><span className="ico"><IndianRupee size={15} /></span><span className="flex-1">Spending limits</span><span className="text-[0.82rem] font-normal text-muted">Resets on the 1st</span></div>
              <div className="space-y-4">
              <LimitField label="Default per user / month" value={settings.default_monthly_limit_inr} onSave={(v) => saveSettings({ default_monthly_limit_inr: v })} hint="Applies to everyone without their own limit, including new users." />
              <LimitField label="Total budget, all users / month" value={settings.total_monthly_limit_inr} onSave={(v) => saveSettings({ total_monthly_limit_inr: v })} hint="Safety cap for your OpenAI credits." />
              <div className="border-t border-line pt-4">
                <label className="label">Dollar to rupee</label>
                <div className="flex items-center gap-2">
                  <div className="field flex items-center justify-between bg-slate-50">
                    <span className="font-medium tabular-nums">₹{settings.usd_to_inr}</span>
                    {settings.fx_auto && <span className="flex items-center gap-1 text-[0.8rem] text-good"><span className="h-1.5 w-1.5 rounded-full bg-green-600" /> live</span>}
                  </div>
                  <button className="btn btn-ghost" onClick={() => (settings.fx_auto ? (() => { const v = prompt("Fixed rate: 1 US$ = ₹", String(settings.usd_to_inr)); if (v && Number(v) > 0) saveSettings({ usd_to_inr: Number(v) }); })() : saveSettings({ fx_auto: true }))}>
                    {settings.fx_auto ? "Set fixed" : "Use live"}
                  </button>
                </div>
                {settings.fx_auto && settings.fx_updated_at && (
                  <p className="mt-1 text-[0.8rem] text-faint">{settings.fx_source} · updated {new Date(settings.fx_updated_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · refreshes every 6h</p>
                )}
              </div>
              </div>
            </section>
          </div>
        )
      )}

      <AddUser open={adding} onClose={() => setAdding(false)} onDone={(m) => { flash(m); load(); }} />
      {toast && <div className="pop fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[0.9rem] text-white shadow-xl">{toast}</div>}
    </>
  );
}

function LimitField({ label, value, onSave, hint }: { label: string; value: number | null; onSave: (v: number | null) => void; hint: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">₹</span>
        <input key={`${value}`} type="number" min={0} className="field pl-7" placeholder="No limit" defaultValue={value ?? ""} onBlur={(e) => toNum(e.target.value) !== value && onSave(toNum(e.target.value))} />
      </div>
      <p className="mt-1 text-[0.8rem] text-faint">{hint}</p>
    </div>
  );
}

function AddUser({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [f, setF] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const data = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).then((r) => r.json());
    setBusy(false);
    if (!data.ok) return setErr(data.error);
    onDone(`Created — login: ${f.phone || f.email}`);
    setF({ full_name: "", phone: "", email: "", password: "" });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a user">
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="label">Name</label>
          <input className="field" autoFocus value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Phone</label>
            <input className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98765 43210" />
          </div>
          <div>
            <label className="label">Email <span className="text-faint">· optional</span></label>
            <input type="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <p className="mt-1 text-[0.8rem] text-faint">No email or OTP is sent — share the login yourself. They get the default monthly limit.</p>
        </div>
        {err && <p className="text-[0.85rem] text-bad">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || (!f.phone && !f.email)}>{busy && <Spinner />} Create user</button>
        </div>
      </form>
    </Modal>
  );
}
