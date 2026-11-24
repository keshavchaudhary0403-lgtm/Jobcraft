"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  Gauge,
  Mic,
  PieChart,
  UserRound,
  UserX,
  Bot,
  ChevronRight,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
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
import { Panel } from "@/components/ui";
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
const MODE_CLS: Record<AiMode, string> = { real: "bg-good-soft text-good", demo: "bg-ocean-soft text-ocean", off: "bg-line-2 text-muted" };
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
  resume_import: "Resume upload",
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
  const [stats, setStats] = useState<{ daily: Record<string, number>; calls: Record<string, number>; active: number; events: number }>({ daily: {}, calls: {}, active: 0, events: 0 });
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
      setStats({ daily: data.daily ?? {}, calls: data.calls ?? {}, active: data.active_users ?? 0, events: data.events ?? 0 });
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
  const model = settings ? AI_MODELS[settings.ai_model as keyof typeof AI_MODELS] : null;
  const budget = settings?.total_monthly_limit_inr ?? null;
  const open = users.find((u) => u.id === openId) ?? null;
  const demoUser = users.find((u) => u.is_demo);

  const voiceOnCount = users.filter((u) => u.voice_enabled).length;
  const chapterSub: Record<Section, string> = {
    overview: settings ? `${rupees(total)} spent` : "...",
    people: `${users.length} ${users.length === 1 ? "person" : "people"}`,
    ai: model ? model.label.split(" -")[0] : "...",
    features: `Voice on for ${voiceOnCount}`,
    demo: settings ? (settings.demo_enabled ? "On" : "Off") : "...",
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Admin<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">People, AI spending and what each person can use.</p>
        </div>
        <button className="btn btn-clay h-11" onClick={() => setAdding(true)}><Plus size={16} /> Add user</button>
      </header>

      <div className="mt-6 space-y-5">
        {/* Chapters */}
        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 fade-up">
          {SECTIONS.map(({ key, label, icon: Icon }, i) => {
            const on = section === key;
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`flex items-center gap-3 rounded-[20px] border-[1.5px] px-4 py-3.5 text-left transition ${on ? "border-side bg-side text-cream" : "border-line bg-card hover:border-brand/40"}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${on ? "bg-cream text-side" : "bg-line-2 text-muted"}`}><Icon size={16} /></span>
                <span className="min-w-0">
                  <span className="block font-display text-[1.05rem] font-bold leading-tight">{label}</span>
                  <span className={`block truncate text-[0.78rem] ${on ? "text-cream/65" : "text-muted"}`}>{String(i + 1).padStart(2, "0")} · {chapterSub[key]}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {!settings ? (
            <div className="space-y-3"><div className="skeleton h-28 rounded-[22px]" /><div className="skeleton h-64 rounded-[22px]" /></div>
          ) : section === "overview" ? (
            <AdminOverview
              users={users}
              settings={settings}
              total={total}
              byFeature={byFeature}
              stats={stats}
              limitOf={limitOf}
              onPerson={setOpenId}
              go={setSection}
            />
          ) : section === "people" ? (
            <div className="space-y-4 fade-up">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                  <input className="field h-11 rounded-full pl-11" placeholder="Search by name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2 text-[0.84rem]">
                  {AI_MODES.map((m) => (
                    <span key={m.value} className={`chip ${MODE_CLS[m.value]}`}>{m.label} · {users.filter((u) => u.ai_mode === m.value).length}</span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger">
                {shown.map((u) => {
                  const limit = limitOf(u);
                  const pct = limit ? Math.min(100, (u.spent_inr / limit) * 100) : 0;
                  const custom = u.feature_limits ? Object.keys(u.feature_limits).length : 0;
                  return (
                    <button key={u.id} onClick={() => setOpenId(u.id)} className="card card-hover flex flex-col p-5 text-left">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mustard text-[0.85rem] font-bold text-side">{initials(nameOf(u))}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate font-display text-[1.1rem] font-bold leading-tight">{nameOf(u)}{u.is_admin && <Shield size={14} className="shrink-0 text-brand" aria-label="Admin" />}</div>
                          <div className="truncate text-[0.8rem] text-muted">{[u.phone && `+${u.phone}`, u.email].filter(Boolean).join(" · ") || "-"}</div>
                        </div>
                        <SpendRing pct={limit != null ? pct : null} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className={`chip ${MODE_CLS[u.ai_mode]}`}>{AI_MODES.find((m) => m.value === u.ai_mode)?.label}</span>
                        {u.voice_enabled && <span className="chip bg-plum-soft text-plum"><AudioLines size={12} /> Voice</span>}
                        {u.is_demo && <span className="chip bg-ocean-soft text-ocean">Demo login</span>}
                        {custom > 0 && <span className="chip bg-line-2 text-muted">{custom} custom limit{custom > 1 ? "s" : ""}</span>}
                        {!u.is_active && <span className="chip bg-clay-soft text-clay">Paused</span>}
                      </div>
                      <div className="mt-auto flex items-baseline justify-between border-t border-line pt-3 mt-4 text-[0.86rem]">
                        <span className="text-muted">This month</span>
                        <span className="tabular-nums"><b className="font-display text-[1.05rem]">{rupees(u.spent_inr)}</b> <span className="text-muted">/ {limit != null ? rupees(limit) : "no limit"}</span></span>
                      </div>
                    </button>
                  );
                })}
                {!q && (
                  <button onClick={() => setAdding(true)} className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-clay/50 text-clay transition hover:border-clay hover:bg-clay-soft/50">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-clay text-white"><Plus size={20} /></span>
                    <span className="font-display text-[1.05rem] font-bold">Add a person</span>
                  </button>
                )}
              </div>
            </div>
          ) : section === "ai" ? (
            <div className="grid gap-5 fade-up xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section className="card p-5">
                <div className="card-head"><span className="ico"><Bot size={15} /></span><span className="flex-1">AI model</span><span className="text-[0.82rem] font-normal text-muted">Used for everyone</span></div>
                <div className="grid gap-2.5">
                  {Object.entries(AI_MODELS).map(([id, m]) => {
                    const on = (pendingModel ?? settings.ai_model) === id;
                    return (
                      <button key={id} data-on={on} onClick={() => setPendingModel(id === settings.ai_model ? null : id)} className="option flex flex-col gap-2 p-4">
                        <span className="flex w-full items-center gap-2">
                          <span className={`h-4 w-4 shrink-0 rounded-full border-[5px] ${on ? "border-brand" : "border-line"}`} />
                          <span className="flex-1 font-semibold">{m.label.split(" -")[0]}</span>
                          {id === settings.ai_model && <span className="chip bg-good-soft text-good">Live</span>}
                        </span>
                        <span className="text-[0.82rem] leading-snug text-muted">{m.note}</span>
                        <span className="text-[0.78rem] tabular-nums text-faint">${m.input} in · ${m.output} out per 1M tokens</span>
                      </button>
                    );
                  })}
                </div>
                {pendingModel && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-clay-soft px-4 py-3 fade-up">
                    <span className="text-[0.9rem]">Switch everyone to <b>{AI_MODELS[pendingModel as keyof typeof AI_MODELS]?.label.split(" -")[0]}</b>?</span>
                    <span className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setPendingModel(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={async () => { await saveSettings({ ai_model: pendingModel }); setPendingModel(null); }}>Save</button>
                    </span>
                  </div>
                )}
              </section>
              <section className="card p-5">
                <div className="card-head"><span className="ico"><IndianRupee size={15} /></span><span className="flex-1">Spending limits</span><span className="text-[0.82rem] font-normal text-muted">Resets on the 1st</span></div>
                {budget != null && (
                  <div className="mb-5 rounded-2xl p-4" style={{ background: "var(--color-cream)" }}>
                    <div className="flex items-baseline justify-between text-[0.86rem]"><span className="text-muted">Used this month</span><span className="tabular-nums"><b className="font-display text-[1.25rem]">{rupees(total)}</b> <span className="text-muted">of {rupees(budget)}</span></span></div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${total / budget >= 0.9 ? "bg-bad" : "bg-brand"}`} style={{ width: `${Math.max(2, Math.min(100, (total / budget) * 100))}%` }} /></div>
                  </div>
                )}
                <div className="space-y-4">
                  <LimitField label="Default per person / month" value={settings.default_monthly_limit_inr} onSave={(v) => saveSettings({ default_monthly_limit_inr: v })} hint="For everyone without their own limit, including new people." />
                  <LimitField label="Total budget, everyone / month" value={settings.total_monthly_limit_inr} onSave={(v) => saveSettings({ total_monthly_limit_inr: v })} hint="Safety cap for your OpenAI credits." />
                  <div className="border-t border-line pt-4">
                    <label className="label">Dollar to rupee</label>
                    <div className="flex items-center gap-2">
                      <div className="field flex items-center justify-between" style={{ background: "var(--color-cream)" }}>
                        <span className="font-medium tabular-nums">₹{settings.usd_to_inr}</span>
                        {settings.fx_auto && <span className="flex items-center gap-1 text-[0.8rem] text-good"><span className="h-1.5 w-1.5 rounded-full bg-good" /> live</span>}
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
            <div className="space-y-5 fade-up">
              <div>
                <h2 className="text-[1.45rem] font-bold leading-none">Default feature limits</h2>
                <p className="mt-1.5 text-[0.9rem] text-muted">For everyone unless set on a person. Blank = built-in default · 0 = off. On top of each monthly ₹ limit.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {FEATURE_KEYS.map((f) => (
                  <div key={f} className="card flex flex-col p-5">
                    <div className="font-display text-[1.1rem] font-bold leading-tight">{FEATURES[f].label}</div>
                    <div className="mt-1 flex-1 text-[0.84rem] leading-snug text-muted">{FEATURES[f].desc}</div>
                    <div className="mt-4 flex items-center gap-2">
                      <SaveableNumber
                        size="sm"
                        prefix=""
                        value={settings.feature_limits?.[f] ?? null}
                        placeholder={String(FEATURES[f].def)}
                        onSave={(v) => saveSettings({ feature_limits: { ...settings.feature_limits, [f]: v ?? undefined } as FeatureLimits })}
                      />
                      <span className="text-[0.84rem] text-muted">per {FEATURES[f].per}</span>
                    </div>
                  </div>
                ))}
              </div>
              <section className="card grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <div>
                  <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-plum text-white"><AudioLines size={16} /></span><h2 className="text-[1.35rem] font-bold leading-none">Realistic voice</h2></div>
                  <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">A live AI interviewer and HR manager that listens and talks back ({REALTIME_MODEL}). About <b className="text-ink">₹1.5 per minute</b>, counted in each person&apos;s limit. Needs Real AI.</p>
                  <div className="mt-4 font-display text-[2rem] font-bold leading-none">{voiceOnCount}<span className="text-[1rem] font-medium text-muted"> of {users.length} people on</span></div>
                  <button className="mt-2 text-[0.86rem] font-semibold text-brand hover:underline" onClick={() => setSection("people")}>Switch it per person →</button>
                </div>
                <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
            <section className="grid gap-5 fade-up lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className={`relative overflow-hidden rounded-[22px] p-7 ${settings.demo_enabled ? "dark-card" : "card"}`}>
                <div className={`text-[0.78rem] font-semibold uppercase tracking-[0.14em] ${settings.demo_enabled ? "text-white/55" : "text-muted"}`}>Demo login</div>
                <div className="mt-2 font-display text-[3rem] font-bold leading-none">{settings.demo_enabled ? "On" : "Off"}<span className="text-clay">.</span></div>
                <p className={`mt-3 max-w-lg text-[0.95rem] leading-relaxed ${settings.demo_enabled ? "text-white/75" : "text-muted"}`}>
                  {settings.demo_enabled
                    ? <>Anyone can click <b>Explore the demo</b> on the login page and look around a sample account. Sample data resets every day.</>
                    : <>Turn on to show an <b>Explore the demo</b> button on the login page. Visitors get a sample account - no sign-up, no password.</>}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    className={`btn h-11 ${settings.demo_enabled ? "bg-cream text-side hover:bg-white" : "btn-clay"}`}
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
                  {settings.demo_enabled && (
                    <button className="btn h-11 text-white ring-1 ring-white/25 hover:bg-white/10" disabled={demoBusy} onClick={async () => { if ((await ask({ title: "Reset demo data", body: "Restore the demo account's sample resume and jobs. Anything visitors changed is removed.", confirm: "Reset" })) !== null) demoAction("reset", "Demo data reset"); }}>
                      <RotateCcw size={15} /> Reset demo data
                    </button>
                  )}
                </div>
              </div>
              <div className="card flex flex-col p-6">
                <div className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">Demo account</div>
                {demoUser ? (
                  <>
                    <dl className="mt-4 grid grid-cols-2 gap-4">
                      <div><dt className="text-[0.8rem] text-muted">AI mode</dt><dd className="font-display text-[1.3rem] font-bold">{AI_MODES.find((m) => m.value === demoUser.ai_mode)?.label}</dd></div>
                      <div><dt className="text-[0.8rem] text-muted">Spent this month</dt><dd className="font-display text-[1.3rem] font-bold">{rupees(demoUser.spent_inr)}</dd></div>
                      <div><dt className="text-[0.8rem] text-muted">Voice</dt><dd className="font-display text-[1.3rem] font-bold">{demoUser.voice_enabled ? "On" : "Off"}</dd></div>
                      <div><dt className="text-[0.8rem] text-muted">Status</dt><dd className="font-display text-[1.3rem] font-bold">{demoUser.is_active ? "Active" : "Paused"}</dd></div>
                    </dl>
                    <button className="btn btn-ghost mt-auto h-11 w-full" onClick={() => setOpenId(demoUser.id)}>Demo account settings <ChevronRight size={14} /></button>
                  </>
                ) : (
                  <p className="mt-3 text-muted">The demo account is created the first time you turn demo login on.</p>
                )}
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
      {toast && <div className="pop fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-side px-5 py-2.5 text-[0.9rem] text-cream shadow-xl">{toast}</div>}
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
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[data-modal]") && close();
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-side/40 p-4 backdrop-blur-[2px]" onMouseDown={close}>
      <div className="pop flex max-h-[88vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] bg-bg shadow-2xl" onMouseDown={(e) => e.stopPropagation()} aria-label={`${name} settings`}>
        <header className="flex items-center gap-3 border-b border-line bg-card px-6 py-4">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-mustard text-[0.85rem] font-bold text-side">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-display text-[1.2rem] font-bold">{name}{u.is_admin && <Shield size={14} className="text-brand" />}{me && <span className="chip bg-line-2 text-muted">You</span>}</div>
            <div className="truncate text-[0.84rem] text-muted">{[u.phone && `+${u.phone}`, u.email].filter(Boolean).join(" · ") || (u.is_demo ? "Shared demo account" : "-")}</div>
          </div>
          <button className="btn-quiet" onClick={close} aria-label="Close"><X size={17} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Block title="AI" sub="What powers this person's AI features.">
            <div className="grid grid-cols-3 gap-2">
              {AI_MODES.map((m) => (
                <button key={m.value} data-on={d.ai_mode === m.value} onClick={() => setD({ ...d, ai_mode: m.value, voice_enabled: m.value === "real" ? d.voice_enabled : false })} className="option p-2.5 text-left">
                  <span className="block text-[0.9rem] font-semibold">{m.label}</span>
                  <span className="block text-[0.78rem] leading-snug text-muted">{m.hint}</span>
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
                    <div className="inline-flex gap-0.5 rounded-full bg-line-2 p-0.5">
                      {(["default", "custom", "off"] as LimitMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setLimit(f, { mode: m, n: m === "custom" && !x.n ? String(def || FEATURES[f].def) : x.n })}
                          className={`h-7 rounded-full px-3 text-[0.8rem] font-semibold capitalize transition ${x.mode === m ? (m === "off" ? "bg-bad text-white" : "bg-side text-cream") : "text-muted hover:text-ink"}`}
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
                <Row label="Active" hint={d.is_active ? "Can log in and use Jobcraft" : "Paused - can't use AI features"}>
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

        <footer className="flex items-center gap-3 border-t border-line bg-card px-6 py-3.5">
          <span className={`flex-1 text-[0.86rem] ${err ? "text-bad" : "text-muted"}`}>{err || (dirty ? "Unsaved changes" : "No changes")}</span>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={!dirty || saving} onClick={save}>{saving && <Spinner size={14} />} Save</button>
        </footer>
      </div>
    </div>
  );
}

function SpendRing({ pct }: { pct: number | null }) {
  const size = 46, stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = pct ?? 0;
  const color = v >= 90 ? "var(--color-bad)" : v >= 70 ? "var(--color-mustard)" : "var(--brand)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title={pct == null ? "No limit" : `${Math.round(v)}% of limit used`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        {pct != null && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(v, 2) / 100)} />}
      </svg>
      <span className="absolute text-[0.78rem] font-bold tabular-nums">{pct == null ? "∞" : `${Math.round(v)}%`}</span>
    </div>
  );
}

function Block({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3">
        <div className="font-display text-[1.05rem] font-bold">{title}</div>
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
    onDone(`Created - login: ${f.phone || f.email}`);
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
          <p className="mt-1 text-[0.8rem] text-faint">No email or OTP is sent - share the login yourself. They get the default limits; change them in People.</p>
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


/* ─────────────────────────── Overview ─────────────────────────── */

function AdminOverview({
  users,
  settings,
  total,
  byFeature,
  stats,
  limitOf,
  onPerson,
  go,
}: {
  users: U[];
  settings: Settings;
  total: number;
  byFeature: Record<string, number>;
  stats: { daily: Record<string, number>; calls: Record<string, number>; active: number; events: number };
  limitOf: (u: U) => number | null;
  onPerson: (id: string) => void;
  go: (s: Section) => void;
}) {
  // India "today" and month geometry (fixed for this view)
  const [nowMs] = useState(() => Date.now());
  const nowIst = new Date(nowMs + 5.5 * 3600 * 1000);
  const y = nowIst.getUTCFullYear();
  const m = nowIst.getUTCMonth();
  const today = nowIst.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const projected = today > 0 ? (total / today) * daysInMonth : total;
  const budget = settings.total_monthly_limit_inr;
  const monthName = nowIst.toLocaleString("en-IN", { month: "long", timeZone: "UTC" });

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { d, key, v: stats.daily[key] ?? 0, future: d > today };
  });
  const features = Object.entries(byFeature).sort((a, b) => b[1] - a[1]);
  const people = users
    .map((u) => ({ u, limit: limitOf(u) }))
    .sort((a, b) => b.u.spent_inr - a.u.spent_inr);
  const idle = users.filter((u) => u.is_active && u.spent_inr === 0 && !u.is_demo).length;
  const nearest = people.filter((p) => p.limit).sort((a, b) => b.u.spent_inr / (b.limit as number) - a.u.spent_inr / (a.limit as number))[0];

  // Insights as short stat tiles: one number, a few words.
  const insights: { tone: number; icon: typeof Gauge; value: string; label: string; go?: () => void }[] = [];
  if (budget != null)
    insights.push(
      projected > budget
        ? { tone: 4, icon: Gauge, value: rupees(projected), label: "projected, over budget", go: () => go("ai") }
        : { tone: 2, icon: Gauge, value: `${Math.round((projected / budget) * 100)}%`, label: "of budget by month end" },
    );
  if (features[0] && total > 0)
    insights.push({ tone: 1, icon: PieChart, value: `${Math.round((features[0][1] / total) * 100)}%`, label: `on ${SPEND_LABEL[features[0][0]] ?? features[0][0]}`, go: () => go("features") });
  if (nearest && nearest.limit)
    insights.push({ tone: nearest.u.spent_inr / nearest.limit >= 0.7 ? 4 : 0, icon: UserRound, value: `${Math.round((nearest.u.spent_inr / nearest.limit) * 100)}%`, label: `${nameOf(nearest.u).split(" ")[0]}'s limit used`, go: () => onPerson(nearest.u.id) });
  if (idle > 0) insights.push({ tone: 3, icon: UserX, value: String(idle), label: idle === 1 ? "person not using AI" : "people not using AI", go: () => go("people") });
  const voiceOn = users.filter((u) => u.voice_enabled).length;
  insights.push({ tone: 0, icon: Mic, value: `${voiceOn}/${users.length}`, label: "with realistic voice", go: () => go("features") });

  return (
    <div className="space-y-5 fade-up">
      {/* Headline band */}
      <section className="dark-card grid gap-6 p-7 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-6">
          <BudgetDonut spent={total} budget={budget} />
          <div>
            <div className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/55">Spent in {monthName}</div>
            <div className="mt-1 font-display text-[3.2rem] font-bold leading-none tabular-nums">{rupees(total)}</div>
            <div className="mt-1.5 text-[0.9rem] text-white/60">{budget != null ? `of ${rupees(budget)} budget` : "No total budget set"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Projected by month end", value: rupees(projected), sub: `Day ${today} of ${daysInMonth}`, warn: budget != null && projected > budget, go: () => go("ai") },
            { label: "Active this month", value: `${stats.active}/${users.length}`, sub: "Used AI at least once", go: () => go("people") },
            { label: "Per active person", value: stats.active ? rupees(total / stats.active) : "-", sub: `${stats.events.toLocaleString("en-IN")} AI requests`, go: () => go("people") },
          ].map((k) => (
            <button key={k.label} onClick={k.go} className="rounded-2xl bg-white/[.07] p-4 text-left transition hover:bg-white/[.12]">
              <div className="text-[0.78rem] text-white/55">{k.label}</div>
              <div className={`mt-1 font-display text-[1.8rem] font-bold leading-none tabular-nums ${k.warn ? "text-clay-2" : ""}`}>{k.value}</div>
              <div className="mt-1.5 text-[0.76rem] text-white/45">{k.sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Two balanced columns */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
        <Panel title="Daily AI spend" sub={`${monthName} · India time`} icon={<TrendingUp size={15} />}>
          <DailyBars days={days} />
        </Panel>
        <Panel title="Insights" icon={<Lightbulb size={15} />} bodyClass="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {insights.map((x, i) => {
            const Tag = x.go ? "button" : "div";
            return (
              <Tag key={i} onClick={x.go} className={`flex flex-col items-start gap-2 rounded-2xl border border-line bg-card p-3.5 text-left ${x.go ? "transition hover:border-brand/40 hover:shadow-sm" : ""}`}>
                <span data-tone={x.tone} className="tone-chip grid h-8 w-8 place-items-center rounded-xl bg-line-2"><x.icon size={15} /></span>
                <span className="font-display text-[1.45rem] font-bold leading-none tabular-nums">{x.value}</span>
                <span className="text-[0.8rem] leading-snug text-muted">{x.label}</span>
              </Tag>
            );
          })}
        </Panel>
        </div>
        <div className="space-y-5">
        <Panel title="Where the money goes" sub="Spend by feature this month" icon={<IndianRupee size={15} />}>
          {features.length === 0 ? (
            <p className="text-muted">No AI use yet this month.</p>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <FeatureDonut parts={features.map(([f, v], i) => ({ label: SPEND_LABEL[f] ?? f, v, color: PALETTE[i % PALETTE.length] }))} total={total} />
              <ul className="w-full space-y-2.5">
                {features.map(([f, v], i) => (
                  <li key={f} className="flex items-center gap-2.5 text-[0.9rem]" title={`${stats.calls[f] ?? 0} requests`}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="flex-1 truncate font-medium">{SPEND_LABEL[f] ?? f}</span>
                    <span className="tabular-nums text-muted">{total ? Math.round((v / total) * 100) : 0}%</span>
                    <b className="w-16 text-right font-display tabular-nums">{rupees(v)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="People and their limits" sub="Spend this month against each person's limit" icon={<Users size={15} />} bodyClass="divide-y divide-line">
          {people.map(({ u, limit }) => {
            const pct = limit ? Math.min(100, (u.spent_inr / limit) * 100) : 0;
            const level = !limit ? "No limit" : pct >= 90 ? "Almost out" : pct >= 70 ? "Getting close" : "Fine";
            return (
              <button key={u.id} onClick={() => onPerson(u.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-line-2/60">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mustard text-[0.8rem] font-bold text-side">{initials(nameOf(u))}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-[0.9rem]">
                    <span className="truncate font-medium">{nameOf(u)}</span>
                    <span className="shrink-0 tabular-nums text-muted">{rupees(u.spent_inr)}{limit != null && <> / {rupees(limit)}</>}</span>
                  </div>
                  {limit != null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : pct >= 70 ? "bg-mustard" : "bg-brand"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className={`w-24 shrink-0 text-right text-[0.78rem] ${pct >= 90 ? "text-bad" : pct >= 70 ? "text-mid" : "text-muted"}`}>{level}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={15} className="shrink-0 text-faint" />
              </button>
            );
          })}
        </Panel>
        </div>
      </div>
    </div>
  );
}

/** One bar per day of the month (single hue). Hover any day for its exact spend. */
function DailyBars({ days }: { days: { d: number; key: string; v: number; future: boolean }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...days.map((x) => x.v), 0);
  const top = max > 0 ? niceCeil(max) : 1;
  const ticks = [top, top / 2, 0];
  const h = hover != null ? days[hover] : null;
  return (
    <div>
      <div className="mb-3 flex h-6 items-baseline gap-2 text-[0.9rem]">
        {h ? (
          <>
            <span className="font-semibold tabular-nums">{rupees(h.v)}</span>
            <span className="text-muted">on {new Date(h.key + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}{h.future ? " (upcoming)" : ""}</span>
          </>
        ) : (
          <span className="text-muted">Hover a day to see its spend</span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex h-44 w-11 shrink-0 flex-col justify-between text-right text-[0.78rem] tabular-nums text-faint">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{rupees(t)}</span>)}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((t, i) => (
            <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {days.map((x, i) => (
              <div key={x.key} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                <div
                  className={`w-full rounded-t-[4px] transition-all duration-500 ${x.future ? "bg-transparent" : hover === i ? "bg-brand-ink" : "bg-brand"}`}
                  style={{ height: x.v > 0 ? `${Math.max(2, (x.v / top) * 100)}%` : x.future ? "0%" : "2px", opacity: x.v > 0 || x.future ? 1 : 0.25 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[52px] mt-1.5 flex justify-between text-[0.78rem] tabular-nums text-faint">
        {[1, 8, 15, 22, days.length].map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

function niceCeil(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// Distinct hues in a fixed order so no two spend categories look alike.
const PALETTE = ["#004e98", "#ff6700", "#1f9d61", "#d98200", "#7a5af0", "#0e9384", "#5b8fd0", "#e0559a", "#a3aec0"];

function FeatureDonut({ parts, total }: { parts: { label: string; v: number; color: string }[]; total: number }) {
  const size = 150, stroke = 20, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const sum = parts.reduce((t, p) => t + p.v, 0) || 1;
  const segs = parts.map((p, i) => ({ ...p, len: (p.v / sum) * c, start: parts.slice(0, i).reduce((t, x) => t + (x.v / sum) * c, 0) }));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        {segs.map((p) => <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeDasharray={`${Math.max(p.len - (segs.length > 1 ? 3 : 0), 1)} ${c}`} strokeDashoffset={-p.start}><title>{p.label}</title></circle>)}
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-[1.4rem] font-bold leading-none tabular-nums">{rupees(total)}</div>
        <div className="text-[0.78rem] text-muted">this month</div>
      </div>
    </div>
  );
}

function BudgetDonut({ spent, budget }: { spent: number; budget: number | null }) {
  const size = 120, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = budget ? Math.min(1, spent / budget) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
        {budget != null && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 0.9 ? "var(--clay-2)" : "var(--mustard)"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(pct, 0.02))} />}
      </svg>
      <span className="absolute font-display text-[1.4rem] font-bold tabular-nums">{budget != null ? `${Math.round(pct * 100)}%` : "-"}</span>
    </div>
  );
}
