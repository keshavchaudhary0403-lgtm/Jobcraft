"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  Bot,
  ChevronRight,
  Gauge,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { AI_MODELS, REALTIME_MODEL, VOICES } from "@/lib/models";
import { FEATURES, FEATURE_KEYS, effectiveLimit, type FeatureKey, type FeatureLimits } from "@/lib/features";
import { Kpi, Panel } from "@/components/ui";
import { Modal, SaveableNumber, Spinner, useAsk } from "@/components/client-ui";

type AiMode = "real" | "demo" | "off";
type U = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  monthly_limit_inr: number | null;
  ai_mode: AiMode;
  is_demo: boolean;
  voice_enabled: boolean;
  feature_limits: FeatureLimits | null;
  spent_inr: number;
  created_at: string;
};
type Settings = {
  ai_model: string;
  default_monthly_limit_inr: number | null;
  total_monthly_limit_inr: number | null;
  usd_to_inr: number;
  fx_auto: boolean;
  fx_updated_at: string | null;
  fx_source: string | null;
  demo_enabled: boolean;
  voice_name: string;
  feature_limits: FeatureLimits;
};
type Section = "overview" | "people" | "ai" | "features" | "demo";

const AI_MODES: { value: AiMode; label: string; hint: string }[] = [
  { value: "real", label: "Real AI", hint: "Uses OpenAI and your credits" },
  { value: "demo", label: "Demo", hint: "Sample answers, no cost" },
  { value: "off", label: "Off", hint: "AI features blocked" },
];
const MODE_CLS: Record<AiMode, string> = { real: "bg-brand-soft text-brand-ink", demo: "bg-sky text-[#3a4fa0]", off: "bg-slate-100 text-slate-500" };
const SPEND_LABEL: Record<string, string> = {
  analysis: "Match analysis",
  resume: "Tailored resumes",
  outreach: "Outreach",
  linkedin: "LinkedIn",
  chat: "Practice chat",
  voice: "Voice calls",
  interview_report: "Scorecards",
  offer_check: "Offer checks",
  parse_resume: "Resume upload",
  detect_job: "Job auto-fill",
};
const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "people", label: "People", icon: Users },
  { key: "ai", label: "AI & spending", icon: IndianRupee },
  { key: "features", label: "Features & limits", icon: SlidersHorizontal },
  { key: "demo", label: "Demo login", icon: PlayCircle },
];

const rupees = (n: number) => `₹${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-IN")}`;
const nameOf = (u: U) => u.full_name || u.email || (u.phone ? `+${u.phone}` : "User");
const initials = (s: string) => s.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function AdminUsers({ meId }: { meId: string }) {
  const [users, setUsers] = useState<U[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [total, setTotal] = useState(0);
  const [byFeature, setByFeature] = useState<Record<string, number>>({});
  const [section, setSectionRaw] = useState<Section>("overview");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [ask, dialog] = useAsk();

  const setSection = (s: Section) => {
    setSectionRaw(s);
    window.history.replaceState(null, "", `/admin?section=${s}`);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section") as Section | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s && SECTIONS.some((x) => x.key === s)) setSectionRaw(s);
  }, []);

  const load = useCallback(async () => {
    const data = await fetch("/api/admin/users").then((r) => r.json());
    if (data.users) {
      setUsers(data.users);
      setSettings(data.settings);
      setTotal(data.total_spent_inr);
      setByFeature(data.by_feature ?? {});
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2000);
  };
  async function patch(id: string, body: Record<string, unknown>) {
    const data = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).then((r) => r.json());
    flash(data.ok ? "Saved" : data.error);
    await load();
    return !!data.ok;
  }
  async function saveSettings(body: Partial<Settings>) {
    const data = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    flash(data.ok ? "Saved" : data.error);
    await load();
  }
  async function demoAction(action: "enable" | "disable" | "reset", done: string) {
    setDemoBusy(true);
    const data = await fetch("/api/admin/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => r.json());
    setDemoBusy(false);
    flash(data.ok ? done : data.error);
    load();
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? users.filter((u) => [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(t))) : users;
  }, [users, q]);

  const limitOf = (u: U) => u.monthly_limit_inr ?? settings?.default_monthly_limit_inr ?? null;
  const ranked = users
    .map((u) => ({ u, limit: limitOf(u), ratio: limitOf(u) ? u.spent_inr / (limitOf(u) as number) : 0 }))
    .filter((x) => x.u.spent_inr > 0)
    .sort((a, b) => b.ratio - a.ratio || b.u.spent_inr - a.u.spent_inr);
  const top = ranked[0];
  const model = settings ? AI_MODELS[settings.ai_model as keyof typeof AI_MODELS] : null;
  const budget = settings?.total_monthly_limit_inr ?? null;
  const open = users.find((u) => u.id === openId) ?? null;
  const demoUser = users.find((u) => u.is_demo);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">Admin</h1>
          <p className="mt-0.5 text-muted">People, AI spending and what each person can use.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add user</button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* Section menu */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:p-0">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-left text-[0.92rem] font-semibold transition ${
                section === key ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:bg-white/70 hover:text-ink"
              }`}
            >
              <Icon size={16} className={section === key ? "text-brand" : ""} />
              <span className="flex-1">{label}</span>
              {key === "people" && <span className="rounded-full bg-line-2 px-2 text-[0.75rem] tabular-nums text-muted">{users.length}</span>}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {!settings ? (
            <div className="space-y-3"><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" /></div>
          ) : section === "overview" ? (
            <div className="space-y-5 fade-up">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 stagger">
                <button className="text-left" onClick={() => setSection("ai")}>
                  <Kpi
                    icon={<IndianRupee size={16} />}
                    label="AI spend this month"
                    value={rupees(total)}
                    progress={budget != null ? { value: total, max: budget, limit: true, caption: `of ${rupees(budget)} total budget` } : undefined}
                    note={budget == null ? "No total budget set" : undefined}
                  />
                </button>
                <button className="text-left" onClick={() => top && setOpenId(top.u.id)}>
                  <Kpi
                    tone="rose"
                    icon={<Gauge size={16} />}
                    label="Closest to their limit"
                    value={top ? rupees(top.u.spent_inr) : "—"}
                    progress={top && top.limit != null ? { value: top.u.spent_inr, max: top.limit, limit: true, caption: `${nameOf(top.u)} · limit ${rupees(top.limit)}` } : undefined}
                    note={!top ? "No AI use yet this month" : top.limit == null ? `${nameOf(top.u)} · no limit` : undefined}
                  />
                </button>
                <button className="text-left" onClick={() => setSection("people")}>
                  <Kpi
                    tone="sun"
                    icon={<Users size={16} />}
                    label="People"
                    value={users.length}
                    breakdown={[
                      { label: "active", n: users.filter((u) => u.is_active).length, cls: "bg-brand" },
                      { label: "paused", n: users.filter((u) => !u.is_active).length, cls: "bg-[#d6d0ea]" },
                    ]}
                  />
                </button>
                <button className="text-left" onClick={() => setSection("ai")}>
                  <Kpi
                    tone="lilac"
                    icon={<Bot size={16} />}
                    label="AI model"
                    value={<span className="text-[1.25rem]">{model?.label.split(" —")[0] ?? "—"}</span>}
                    note={<>Default limit <b className="font-semibold text-ink">{settings.default_monthly_limit_inr != null ? rupees(settings.default_monthly_limit_inr) : "none"}</b> per person · $1 = ₹{settings.usd_to_inr}</>}
                  />
                </button>
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-2">
                <Panel title="Spend by feature" sub="This month, all people" icon={<IndianRupee size={15} />}>
                  {Object.keys(byFeature).length === 0 ? (
                    <p className="text-muted">No AI use yet this month.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(byFeature)
                        .sort((a, b) => b[1] - a[1])
                        .map(([f, v]) => {
                          const max = Math.max(...Object.values(byFeature));
                          return (
                            <div key={f}>
                              <div className="flex justify-between text-[0.9rem]">
                                <span>{SPEND_LABEL[f] ?? f}</span>
                                <span className="tabular-nums text-muted">{rupees(v)}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-2">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </Panel>

                <Panel title="At a glance" icon={<LayoutDashboard size={15} />} bodyClass="divide-y divide-line">
                  {[
                    { label: "Realistic voice", value: `${users.filter((u) => u.voice_enabled).length} of ${users.length} people`, go: () => setSection("features") },
                    { label: "AI switched off", value: `${users.filter((u) => u.ai_mode === "off").length} people`, go: () => setSection("people") },
                    { label: "Custom feature limits", value: `${users.filter((u) => u.feature_limits && Object.keys(u.feature_limits).length).length} people`, go: () => setSection("people") },
                    { label: "Demo login", value: settings.demo_enabled ? "On" : "Off", go: () => setSection("demo") },
                  ].map((r) => (
                    <button key={r.label} onClick={r.go} className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-line-2/60">
                      <span className="text-muted">{r.label}</span>
                      <span className="flex items-center gap-2 font-semibold">{r.value} <ChevronRight size={15} className="text-faint" /></span>
                    </button>
                  ))}
                </Panel>
              </div>
            </div>
          ) : section === "people" ? (
            <div className="space-y-4 fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[1.15rem] font-semibold">People</h2>
                  <p className="text-[0.88rem] text-muted">Click anyone to change their AI, voice, spending and feature limits.</p>
                </div>
                <div className="relative w-64">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input className="field h-9 pl-9" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/70 text-left text-[0.8rem] text-muted">
                      <th className="px-4 py-2.5 font-medium">Person</th>
                      <th className="px-4 py-2.5 font-medium">AI</th>
                      <th className="px-4 py-2.5 font-medium">Voice</th>
                      <th className="px-4 py-2.5 font-medium">This month</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="w-px px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-2">
                    {shown.map((u) => {
                      const limit = limitOf(u);
                      const pct = limit ? Math.min(100, (u.spent_inr / limit) * 100) : 0;
                      const custom = u.feature_limits ? Object.keys(u.feature_limits).length : 0;
                      return (
                        <tr key={u.id} onClick={() => setOpenId(u.id)} className="cursor-pointer transition hover:bg-brand-soft/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-semibold text-brand-ink">{initials(nameOf(u))}</div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                  {nameOf(u)}
                                  {u.is_admin && <Shield size={13} className="text-brand" aria-label="Admin" />}
                                  {u.is_demo && <span className="chip bg-sky py-0 text-[0.72rem] text-[#3a4fa0]">Demo login</span>}
                                  {custom > 0 && <span className="chip bg-line-2 py-0 text-[0.72rem] text-muted">{custom} custom limit{custom > 1 ? "s" : ""}</span>}
                                </div>
                                <div className="truncate text-[0.82rem] text-muted">{[u.phone && `+${u.phone}`, u.email].filter(Boolean).join(" · ") || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={`chip ${MODE_CLS[u.ai_mode]}`}>{AI_MODES.find((m) => m.value === u.ai_mode)?.label}</span></td>
                          <td className="px-4 py-3">{u.voice_enabled ? <span className="chip bg-brand-soft text-brand-ink"><AudioLines size={12} /> On</span> : <span className="text-[0.85rem] text-faint">Off</span>}</td>
                          <td className="px-4 py-3">
                            <div className="text-[0.9rem] tabular-nums">{rupees(u.spent_inr)} <span className="text-muted">/ {limit != null ? rupees(limit) : "no limit"}</span></div>
                            {limit != null && (
                              <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-line-2">
                                <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : pct >= 70 ? "bg-orange-400" : "bg-brand"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{u.is_active ? <span className="chip bg-good-soft text-good">Active</span> : <span className="chip bg-slate-100 text-slate-500">Paused</span>}</td>
                          <td className="px-4 py-3 text-right"><span className="btn btn-ghost btn-sm">Manage <ChevronRight size={14} /></span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : section === "ai" ? (
            <div className="grid items-start gap-4 fade-up xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section className="card p-5">
                <div className="card-head"><span className="ico"><Bot size={15} /></span><span className="flex-1">AI model</span><span className="text-[0.82rem] font-normal text-muted">Used for everyone</span></div>
                <div className="space-y-2.5">
                  {Object.entries(AI_MODELS).map(([id, m]) => (
                    <button key={id} data-on={(pendingModel ?? settings.ai_model) === id} onClick={() => setPendingModel(id === settings.ai_model ? null : id)} className="option flex w-full items-center gap-4 p-3.5">
                      <span className={`h-4 w-4 shrink-0 rounded-full border-[5px] ${(pendingModel ?? settings.ai_model) === id ? "border-brand" : "border-line"}`} />
                      <span className="flex-1">
                        <span className="block font-medium">{m.label}</span>
                        <span className="block text-[0.85rem] text-muted">{m.note}</span>
                      </span>
                      <span className="text-right text-[0.8rem] tabular-nums text-faint">${m.input} in<br />${m.output} out</span>
                    </button>
                  ))}
                </div>
                {pendingModel && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3 fade-up">
                    <span className="text-[0.9rem]">Switch everyone to <b>{AI_MODELS[pendingModel as keyof typeof AI_MODELS]?.label.split(" —")[0]}</b>?</span>
                    <span className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setPendingModel(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={async () => { await saveSettings({ ai_model: pendingModel }); setPendingModel(null); }}>Save</button>
                    </span>
                  </div>
                )}
              </section>
              <section className="card p-5">
                <div className="card-head"><span className="ico"><IndianRupee size={15} /></span><span className="flex-1">Spending limits</span><span className="text-[0.82rem] font-normal text-muted">Resets on the 1st</span></div>
                <div className="space-y-4">
                  <LimitField label="Default per person / month" value={settings.default_monthly_limit_inr} onSave={(v) => saveSettings({ default_monthly_limit_inr: v })} hint="For everyone without their own limit, including new people." />
                  <LimitField label="Total budget, everyone / month" value={settings.total_monthly_limit_inr} onSave={(v) => saveSettings({ total_monthly_limit_inr: v })} hint="Safety cap for your OpenAI credits." />
                  <div className="border-t border-line pt-4">
                    <label className="label">Dollar to rupee</label>
                    <div className="flex items-center gap-2">
                      <div className="field flex items-center justify-between bg-slate-50">
                        <span className="font-medium tabular-nums">₹{settings.usd_to_inr}</span>
                        {settings.fx_auto && <span className="flex items-center gap-1 text-[0.8rem] text-good"><span className="h-1.5 w-1.5 rounded-full bg-green-600" /> live</span>}
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={async () => {
                          if (!settings.fx_auto) return saveSettings({ fx_auto: true });
                          const v = await ask({ title: "Set a fixed rate", body: "Stops the live rate. Costs are converted with this number until you switch back.", input: { label: "1 US$ =", prefix: "₹", type: "number", defaultValue: String(settings.usd_to_inr) }, confirm: "Save rate" });
                          if (v && Number(v) > 0) saveSettings({ usd_to_inr: Number(v) });
                        }}
                      >
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
          ) : section === "features" ? (
            <div className="space-y-4 fade-up">
              <Panel
                title="Default feature limits"
                sub="Apply to everyone unless you set something different on a person. 0 switches a feature off."
                icon={<SlidersHorizontal size={15} />}
                bodyClass="divide-y divide-line"
              >
                {FEATURE_KEYS.map((f) => (
                  <div key={f} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{FEATURES[f].label}</div>
                      <div className="text-[0.86rem] text-muted">{FEATURES[f].desc}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SaveableNumber
                        size="sm"
                        prefix=""
                        value={settings.feature_limits?.[f] ?? null}
                        placeholder={String(FEATURES[f].def)}
                        onSave={(v) => saveSettings({ feature_limits: { ...settings.feature_limits, [f]: v ?? undefined } as FeatureLimits })}
                      />
                      <span className="w-20 text-[0.84rem] text-muted">per {FEATURES[f].per}</span>
                    </div>
                  </div>
                ))}
                <p className="px-5 py-3 text-[0.8rem] text-faint">Blank = built-in default (shown in grey). These are on top of each person&apos;s monthly ₹ limit.</p>
              </Panel>
              <section className="card p-5">
                <div className="card-head">
                  <span className="ico"><AudioLines size={15} /></span>
                  <span className="flex-1">Realistic voice</span>
                  <span className="text-[0.82rem] font-normal text-muted">{users.filter((u) => u.voice_enabled).length} of {users.length} people on · switch it per person in People</span>
                </div>
                <p className="mb-4 max-w-2xl text-[0.92rem] text-slate-700">
                  A live AI interviewer and HR manager that listens and talks back ({REALTIME_MODEL}). About <b>$0.016 / ₹1.5 per minute</b>, counted in each person&apos;s monthly limit. Needs Real AI.
                </p>
                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      data-on={settings.voice_name === v.id}
                      className="option p-3 text-left"
                      onClick={async () => {
                        if (v.id === settings.voice_name) return;
                        if ((await ask({ title: `Voice: ${v.label}`, body: <>Use <b>{v.label}</b> ({v.note.toLowerCase()}) for everyone&apos;s voice practice?</>, confirm: "Use this voice" })) !== null) saveSettings({ voice_name: v.id });
                      }}
                    >
                      <span className="block font-semibold">{v.label}</span>
                      <span className="block text-[0.8rem] text-muted">{v.note}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <section className="card p-5 fade-up">
              <div className="card-head">
                <span className="ico"><PlayCircle size={15} /></span>
                <span className="flex-1">Demo login</span>
                <span className={`chip ${settings.demo_enabled ? "bg-good-soft text-good" : "bg-slate-100 text-slate-500"}`}>{settings.demo_enabled ? "On" : "Off"}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-xl text-[0.92rem] text-slate-700">
                  {settings.demo_enabled ? (
                    <>Anyone can click <b>Explore the demo</b> on the login page and look around a sample account. Its sample data resets every day. AI mode: <b>{AI_MODES.find((m) => m.value === demoUser?.ai_mode)?.label ?? "Demo"}</b>.</>
                  ) : (
                    <>Turn on to show an <b>Explore the demo</b> button on the login page. Visitors get a sample account — no sign-up, no password.</>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {demoUser && <button className="btn btn-ghost" onClick={() => setOpenId(demoUser.id)}>Demo account settings <ChevronRight size={14} /></button>}
                  {settings.demo_enabled && (
                    <button className="btn btn-ghost" disabled={demoBusy} onClick={async () => { if ((await ask({ title: "Reset demo data", body: "Restore the demo account's sample resume and jobs. Anything visitors changed is removed.", confirm: "Reset" })) !== null) demoAction("reset", "Demo data reset"); }}>
                      <RotateCcw size={15} /> Reset demo data
                    </button>
                  )}
                  <button
                    className={`btn ${settings.demo_enabled ? "btn-ghost" : "btn-primary"}`}
                    disabled={demoBusy}
                    onClick={async () => {
                      const on = !settings.demo_enabled;
                      const ok = await ask(on
                        ? { title: "Turn on demo login", body: <>An <b>Explore the demo</b> button appears on the login page. The demo account uses <b>Demo</b> AI (no cost) unless you change it.</>, confirm: "Turn on" }
                        : { title: "Turn off demo login", body: "The Explore the demo button disappears from the login page.", confirm: "Turn off", danger: true });
                      if (ok !== null) demoAction(on ? "enable" : "disable", on ? "Demo login on" : "Demo login off");
                    }}
                  >
                    {demoBusy && <Spinner size={14} />} {settings.demo_enabled ? "Turn off" : "Turn on demo login"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {open && settings && (
        <PersonDrawer
          key={open.id}
          u={open}
          me={open.id === meId}
          settings={settings}
          onClose={() => setOpenId(null)}
          onSave={(body) => patch(open.id, body)}
          ask={ask}
        />
      )}
      {dialog}
      <AddUser open={adding} onClose={() => setAdding(false)} onDone={(m) => { flash(m); load(); }} />
      {toast && <div className="pop fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[0.9rem] text-white shadow-xl">{toast}</div>}
    </>
  );
}

type Ask = ReturnType<typeof useAsk>[0];
type LimitMode = "default" | "custom" | "off";

/** Everything about one person, edited together and saved once. */
function PersonDrawer({ u, me, settings, onClose, onSave, ask }: { u: U; me: boolean; settings: Settings; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean>; ask: Ask }) {
  const name = nameOf(u);
  const initial = {
    ai_mode: u.ai_mode,
    voice_enabled: u.voice_enabled,
    monthly: u.monthly_limit_inr == null ? "" : String(u.monthly_limit_inr),
    is_active: u.is_active,
    is_admin: u.is_admin,
    limits: Object.fromEntries(
      FEATURE_KEYS.map((f) => {
        const v = u.feature_limits?.[f];
        return [f, { mode: (v === undefined ? "default" : v === 0 ? "off" : "custom") as LimitMode, n: v && v > 0 ? String(v) : "" }];
      }),
    ) as Record<FeatureKey, { mode: LimitMode; n: string }>,
  };
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);

  async function close() {
    if (dirty && (await ask({ title: "Discard changes?", body: `Your changes to ${name} haven't been saved.`, confirm: "Discard", danger: true })) === null) return;
    onClose();
  }
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[role=dialog]") && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  });

  async function save() {
    setErr("");
    const monthly = d.monthly.trim() === "" ? null : Number(d.monthly);
    if (monthly != null && !(monthly >= 0)) return setErr("Monthly limit must be 0 or more.");
    const fl: Record<string, number> = {};
    for (const f of FEATURE_KEYS) {
      const x = d.limits[f];
      if (x.mode === "off") fl[f] = 0;
      if (x.mode === "custom") {
        const n = Number(x.n);
        if (!Number.isInteger(n) || n < 1) return setErr(`${FEATURES[f].label}: enter a whole number, 1 or more.`);
        fl[f] = n;
      }
    }
    const risky: string[] = [];
    if (initial.is_active && !d.is_active) risky.push("pause their account");
    if (initial.is_admin !== d.is_admin) risky.push(d.is_admin ? "make them an admin" : "remove their admin access");
    if (initial.ai_mode !== "off" && d.ai_mode === "off") risky.push("turn AI off");
    if (risky.length && (await ask({ title: `Save changes for ${name}?`, body: <>This will {risky.join(", ")}.</>, confirm: "Save changes", danger: true })) === null) return;

    setSaving(true);
    const body: Record<string, unknown> = { ai_mode: d.ai_mode, voice_enabled: d.voice_enabled, monthly_limit_inr: monthly, feature_limits: fl };
    if (!me) {
      body.is_active = d.is_active;
      body.is_admin = d.is_admin;
    }
    const ok = await onSave(body);
    setSaving(false);
    if (ok) onClose();
  }

  const setLimit = (f: FeatureKey, patch: Partial<{ mode: LimitMode; n: string }>) => setD({ ...d, limits: { ...d.limits, [f]: { ...d.limits[f], ...patch } } });
  const defMonthly = settings.default_monthly_limit_inr;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onMouseDown={close}>
      <aside className="flex h-full w-full max-w-[520px] flex-col bg-bg shadow-2xl fade-up" onMouseDown={(e) => e.stopPropagation()} role="complementary" aria-label={`${name} settings`}>
        <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[0.85rem] font-semibold text-brand-ink">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[1.05rem] font-semibold">{name}{u.is_admin && <Shield size={14} className="text-brand" />}{me && <span className="chip bg-line-2 text-muted">You</span>}</div>
            <div className="truncate text-[0.84rem] text-muted">{[u.phone && `+${u.phone}`, u.email].filter(Boolean).join(" · ") || (u.is_demo ? "Shared demo account" : "—")}</div>
          </div>
          <button className="btn-quiet" onClick={close} aria-label="Close"><X size={17} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Block title="AI" sub="What powers this person's AI features.">
            <div className="grid grid-cols-3 gap-2">
              {AI_MODES.map((m) => (
                <button key={m.value} data-on={d.ai_mode === m.value} onClick={() => setD({ ...d, ai_mode: m.value, voice_enabled: m.value === "real" ? d.voice_enabled : false })} className="option p-2.5 text-left">
                  <span className="block text-[0.9rem] font-semibold">{m.label}</span>
                  <span className="block text-[0.75rem] leading-snug text-muted">{m.hint}</span>
                </button>
              ))}
            </div>
            <Row label="Realistic voice" hint={d.ai_mode === "real" ? "Live AI voice for interview and salary practice · ~₹1.5/min" : "Needs Real AI"}>
              <Switch on={d.voice_enabled} disabled={d.ai_mode !== "real"} onChange={(v) => setD({ ...d, voice_enabled: v })} />
            </Row>
          </Block>

          <Block title="Monthly spending" sub={`Blank = default (${defMonthly != null ? rupees(defMonthly) : "no limit"}). 0 = no AI spend.`}>
            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">₹</span>
                <input className="field pl-7" inputMode="decimal" value={d.monthly} placeholder={defMonthly != null ? String(defMonthly) : "No limit"} onChange={(e) => setD({ ...d, monthly: e.target.value.replace(/[^0-9.]/g, "") })} />
              </div>
              <span className="text-[0.88rem] text-muted">Spent <b className="font-semibold text-ink">{rupees(u.spent_inr)}</b> this month</span>
            </div>
          </Block>

          <Block title="Feature limits" sub="Default follows Features & limits. Off blocks the feature for this person.">
            <div className="-mx-1 divide-y divide-line">
              {FEATURE_KEYS.map((f) => {
                const x = d.limits[f];
                const def = effectiveLimit(f, null, settings.feature_limits);
                return (
                  <div key={f} className="flex flex-wrap items-center gap-2 px-1 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.92rem] font-semibold">{FEATURES[f].label}</div>
                      <div className="text-[0.78rem] text-muted">{x.mode === "default" ? `Default: ${def === 0 ? "off" : `${def} per ${FEATURES[f].per}`}` : x.mode === "off" ? "Switched off" : `per ${FEATURES[f].per}`}</div>
                    </div>
                    {x.mode === "custom" && (
                      <input className="field h-8 w-20 text-[0.88rem]" inputMode="numeric" value={x.n} placeholder={String(def || FEATURES[f].def)} onChange={(e) => setLimit(f, { n: e.target.value.replace(/\D/g, "") })} />
                    )}
                    <div className="inline-flex gap-0.5 rounded-lg bg-line-2 p-0.5">
                      {(["default", "custom", "off"] as LimitMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setLimit(f, { mode: m, n: m === "custom" && !x.n ? String(def || FEATURES[f].def) : x.n })}
                          className={`h-7 rounded-md px-2.5 text-[0.8rem] font-semibold capitalize transition ${x.mode === m ? (m === "off" ? "bg-bad text-white" : "bg-white text-ink shadow-sm") : "text-muted hover:text-ink"}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Block>

          <Block title="Account">
            {me ? (
              <p className="text-[0.88rem] text-muted">You can&apos;t pause yourself or remove your own admin access.</p>
            ) : (
              <>
                <Row label="Active" hint={d.is_active ? "Can log in and use Jobcraft" : "Paused — can't use AI features"}>
                  <Switch on={d.is_active} onChange={(v) => setD({ ...d, is_active: v })} />
                </Row>
                {!u.is_demo && (
                  <Row label="Admin" hint="Can manage people, limits and the AI model">
                    <Switch on={d.is_admin} onChange={(v) => setD({ ...d, is_admin: v })} />
                  </Row>
                )}
              </>
            )}
            {!u.is_demo && (
              <button
                className="btn btn-ghost btn-sm mt-3"
                onClick={async () => {
                  const pw = await ask({ title: "Reset password", body: <>Set a new password for <b>{name}</b>. Share it with them yourself.</>, input: { label: "New password", placeholder: "At least 6 characters" }, confirm: "Set password" });
                  if (pw) onSave({ password: pw });
                }}
              >
                <KeyRound size={13} /> Reset password
              </button>
            )}
          </Block>
        </div>

        <footer className="flex items-center gap-3 border-t border-line bg-white px-5 py-3.5">
          <span className={`flex-1 text-[0.86rem] ${err ? "text-bad" : "text-muted"}`}>{err || (dirty ? "Unsaved changes" : "No changes")}</span>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>{saving && <Spinner size={14} />} Save</button>
        </footer>
      </aside>
    </div>
  );
}

function Block({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3">
        <div className="font-semibold">{title}</div>
        {sub && <div className="text-[0.8rem] text-muted">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 first:mt-0">
      <div>
        <div className="text-[0.92rem] font-medium">{label}</div>
        {hint && <div className="text-[0.78rem] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function LimitField({ label, value, onSave, hint }: { label: string; value: number | null; onSave: (v: number | null) => Promise<unknown> | void; hint: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <SaveableNumber value={value} onSave={onSave} placeholder="No limit" />
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
          <p className="mt-1 text-[0.8rem] text-faint">No email or OTP is sent — share the login yourself. They get the default limits; change them in People.</p>
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

function Switch({ on, onChange, disabled, title }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
