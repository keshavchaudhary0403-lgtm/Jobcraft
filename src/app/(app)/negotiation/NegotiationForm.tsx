"use client";

import { CtcField, ExperienceField, TextField } from "@/components/BasicFields";
import { ctcInput, formatCtc, normaliseBasics } from "@/lib/profile-format";

import { useState } from "react";
import { Check, ExternalLink, IndianRupee, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/client-ui";
import type { Application } from "@/lib/types";
import { JobPicker } from "@/components/JobPicker";

/** First one or two numbers in a salary string ("9 LPA", "8-12 LPA"). */
/** "9", "9 LPA", "9,00,000" -> 9 (lakh). */
const lakh = (s: string) => { const f = formatCtc(s); return f ? Number(ctcInput(f)) : undefined; };
/** "8-12", "8 to 12 LPA", "₹8L - ₹12L" -> [8, 12] (lakh). */
const range = (s: string): number[] => s.split(/\s*(?:-|–|—|\bto\b)\s*/i).map((x) => lakh(/\d/.test(x) ? x + (/(l|lakh|lpa|cr|k)\b/i.test(s) && !/(l|lakh|lpa|cr|k)\b/i.test(x) ? " " + (s.match(/(lpa|lakh|cr|l|k)\b/i)?.[1] ?? "") : "") : "")).filter((n): n is number => n != null);

type Defaults = { city: string; current_ctc: string; experience: string; strongest_proof: string };
type A = Pick<Application, "id" | "company" | "role" | "status" | "company_type" | "location" | "analysis">;

export function NegotiationForm({ apps, preselect, defaults, userId }: { apps: A[]; preselect?: string; defaults: Defaults; userId: string }) {
  const firstId = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [appId, setAppId] = useState(firstId);
  const complete = (v: Defaults) => !!(v.current_ctc.trim() && v.experience.trim() && v.city.trim() && v.strongest_proof.trim());
  const [saved, setSaved] = useState(defaults);
  const [vals, setVals] = useState(defaults);
  const [edit, setEdit] = useState(!complete(defaults));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(vals) !== JSON.stringify(saved);
  const [offered, setOffered] = useState("");
  const [market, setMarket] = useState("");
  const o = lakh(offered);
  const m = range(market);
  const lo = m[0];
  const hi = m[1] ?? m[0];
  const [tried, setTried] = useState(false);
  const offerBad = (tried || !!offered.trim()) && o == null;
  const marketBad = (tried || !!market.trim()) && (m.length !== 2 || m[1] < m[0]);
  const fmt = (n: number) => String(Math.round(n * 10) / 10);

  function cancel() {
    setVals(saved);
    setSaveMsg("");
    setEdit(false);
  }
  async function save() {
    setSaving(true);
    setSaveMsg("");
    const t = (x: string) => x.trim() || null;
    const { value: c, errors } = normaliseBasics({ current_ctc: vals.current_ctc, experience_years: vals.experience, city: vals.city });
    if (Object.keys(errors).length) { setSaving(false); return setSaveMsg("Fix the fields marked in red"); }
    const next = { ...vals, current_ctc: c.current_ctc ?? "", experience: c.experience_years ?? "", city: c.city ?? "" };
    setVals(next);
    const { error } = await createClient()
      .from("profiles")
      .update({ current_ctc: t(next.current_ctc), experience_years: t(next.experience), city: t(next.city), strongest_proof: t(vals.strongest_proof) })
      .eq("id", userId);
    setSaving(false);
    if (error) return setSaveMsg("Couldn't save. Try again.");
    setSaved(next);
    setEdit(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }
  const a = apps.find((x) => x.id === appId);
  const q = encodeURIComponent(`${a?.role ?? ""} salary ${a?.location ?? defaults.city}`.trim());

  const editActions = edit ? (
    <span className="flex items-center gap-1.5">
      {complete(saved) && <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>}
      <button type="button" className="btn btn-primary btn-sm" disabled={saving || !complete(vals) || (!dirty && complete(saved))} onClick={save}>
        {saving ? <Spinner size={13} /> : <Check size={14} />} Save
      </button>
    </span>
  ) : (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}><Pencil size={13} /> Edit</button>
  );

  return (
    <div className="space-y-5">
      {/* ── 1 + 2: the offer and the numbers ── */}
      <section className="card grid overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col p-6">
          <StepHead n={1} title="Which offer?" />
          <JobPicker
            compact
            apps={apps}
            preselect={firstId}
            otherLabel="Offer not in my jobs"
            onPick={setAppId}
            otherFields={
              <div className="grid gap-2">
                <div><label className="label">Role offered <span className="text-clay">*</span></label><input name="role" required maxLength={90} className="field" placeholder="e.g. Senior Product Manager" /></div>
                <div><label className="label">Company type <span className="text-clay">*</span></label>
                  <select name="company_type" required className="field" defaultValue="">
                    <option value="" disabled>Choose one</option>
                    {["Startup", "Growth-stage startup", "MNC", "Indian large company", "Agency / consulting", "Government / PSU"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            }
          />
          <div className="mb-4" />
          {a && (
            <>
              <input type="hidden" name="role" value={a.role} />
              <input type="hidden" name="company_type" value={a.company_type ?? "company"} />
            </>
          )}
          <div className="mt-auto flex items-start gap-3 rounded-2xl bg-good-soft px-4 py-3 text-[0.86rem] text-good">
            <IndianRupee size={16} className="mt-0.5 shrink-0" />
            <span>{apps.some((x) => x.status === "offer") ? "Offers are listed first. Check each one before you reply." : "No offer yet? Practise anyway - the first ask is the hardest."}</span>
          </div>
        </div>

        <div className="flex flex-col border-line p-6 lg:border-l" style={{ background: "var(--color-cream)" }}>
          <StepHead n={2} title="Is it fair?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <BigInput label="Offered CTC" placeholder="9" value={offered} onChange={setOffered} bad={offerBad} hint={offerBad ? "Enter the yearly offer in lakh, e.g. 9" : "Yearly, in lakh"} onBlur={() => o != null && setOffered(fmt(o))} />
            <BigInput label="Market range" placeholder="8 - 12" value={market} onChange={setMarket} bad={marketBad} hint={marketBad ? "Enter low and high in lakh, e.g. 8 - 12" : "Low - high, in lakh"} onBlur={() => m.length === 2 && m[1] >= m[0] && setMarket(`${fmt(m[0])} - ${fmt(m[1])}`)} />
            <input type="hidden" name="offered_ctc" value={o != null ? `₹${fmt(o)} LPA` : ""} />
            <input type="hidden" name="market_range" value={m.length === 2 ? `₹${fmt(m[0])} - ₹${fmt(m[1])} LPA` : ""} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.8rem] text-muted">
            Look up the market on
            <a className="pill-link h-6 px-2.5 text-[0.76rem]" target="_blank" rel="noreferrer" href={`https://www.ambitionbox.com/search?q=${q}`}>AmbitionBox <ExternalLink size={10} /></a>
            <a className="pill-link h-6 px-2.5 text-[0.76rem]" target="_blank" rel="noreferrer" href={`https://www.glassdoor.co.in/Search/results.htm?keyword=${q}`}>Glassdoor <ExternalLink size={10} /></a>
          </div>
          <div className="mt-auto pt-6"><MarketScale offered={o} lo={lo} hi={hi} /></div>
        </div>
      </section>

      {/* ── 3 + start ── */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className={`card flex flex-col p-6 ${edit ? "ring-2 ring-clay/30" : ""}`}>
          <StepHead n={3} title="Your leverage" action={editActions} />
          {/* Always submitted with the form */}
          <input type="hidden" name="current_ctc" value={saved.current_ctc} />
          <input type="hidden" name="experience" value={saved.experience} />
          <input type="hidden" name="city" value={saved.city} />
          <input type="hidden" name="strongest_proof" value={saved.strongest_proof} />
          {saveMsg && <p className="mb-2 text-[0.82rem] text-bad">{saveMsg}</p>}
          {justSaved && <p className="mb-2 flex items-center gap-1 text-[0.82rem] text-good"><Check size={13} /> Saved to your profile</p>}
          {edit ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <CtcField label="Current CTC" required value={vals.current_ctc} onChange={(v) => setVals({ ...vals, current_ctc: v })} />
              <ExperienceField label="Experience" required value={vals.experience} onChange={(v) => setVals({ ...vals, experience: v })} />
              <TextField kind="city" label="City" required value={vals.city} onChange={(v) => setVals({ ...vals, city: v })} placeholder="e.g. Bengaluru" />
              <div className="sm:col-span-3"><label className="label">Best results (with numbers)</label><textarea className="field resize-none" rows={3} maxLength={500} value={vals.strongest_proof} placeholder="e.g. Grew monthly revenue from ₹8.5L to ₹25L in 3 months." onChange={(e) => setVals({ ...vals, strongest_proof: e.target.value })} /></div>
              <p className="text-[0.78rem] text-muted sm:col-span-3">Saving also updates My profile.</p>
            </div>
          ) : (
            <div className="grid flex-1 gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
              <div className="grid gap-2.5">
                {[["Current CTC", saved.current_ctc], ["Experience", saved.experience], ["City", saved.city]].map(([k, v], i) => (
                  <div key={k} data-tone={i % 5} className="tone-soft flex items-center justify-between gap-3 rounded-2xl bg-line-2/70 px-4 py-2.5">
                    <span className="text-[0.8rem] text-muted">{k}</span>
                    <span className="truncate font-display text-[1.1rem] font-bold" data-tip={v}>{v || "-"}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col rounded-2xl p-4" style={{ background: "var(--color-mustard-soft)" }}>
                <div className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-mustard-ink">Your strongest proof</div>
                <p className="mt-1.5 font-display text-[1.05rem] font-semibold leading-snug">&ldquo;{saved.strongest_proof || "Add a result with a number"}&rdquo;</p>
                <p className="mt-auto pt-2 text-[0.78rem] text-mustard-ink/80">You&apos;ll use this to justify your counter.</p>
              </div>
            </div>
          )}
        </section>

        <section className="dark-card flex flex-col p-6">
          <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-white/70">How the talk plays out</div>
          <ol className="mt-4 flex-1 space-y-3">
            {["See if the offer is below, at or above market", "Get a realistic counter range", "Make your counter - HR pushes back", "Say \"stop\" any time for feedback"].map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display text-[0.9rem] font-bold text-mustard">{i + 1}</span>
                <span className="text-[0.95rem] text-cream/90">{t}</span>
              </li>
            ))}
          </ol>
          <button className="btn btn-clay mt-5 h-12 w-full text-[1rem]" disabled={edit} onClick={(e) => { if (o == null || m.length !== 2 || m[1] < m[0]) { e.preventDefault(); setTried(true); } }}>Start practice</button>
          {tried && (o == null || m.length !== 2 || m[1] < m[0]) && <p className="mt-2 rounded-xl bg-white/12 px-3 py-2 text-center text-[0.82rem] font-semibold text-white">Add the offered CTC and the market range above first.</p>}
          {edit && <span className="mt-1.5 text-center text-[0.8rem] text-white/60">Save your details first</span>}
        </section>
      </div>
    </div>
  );
}

function StepHead({ n, title, action }: { n: number; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span data-tone={(n - 1) % 5} className="tone-chip grid h-7 w-7 place-items-center rounded-full bg-side font-display text-[0.8rem] font-bold text-cream">{n}</span>
      <h2 className="flex-1 text-[1.2rem] font-bold leading-none">{title}</h2>
      {action}
    </div>
  );
}

function BigInput({ label, placeholder, value, onChange, onBlur, bad, hint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; onBlur: () => void; bad: boolean; hint: string }) {
  return (
    <div>
      <label className={`block rounded-2xl border-[1.5px] bg-card px-4 py-3 transition focus-within:border-brand ${bad ? "border-bad/60" : "border-line"}`}>
        <span className="text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="mt-1 flex items-center gap-1.5">
          <IndianRupee size={18} className="shrink-0 text-faint" />
          <input inputMode="decimal" required placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="w-full min-w-0 bg-transparent font-display text-[1.5rem] font-bold outline-none placeholder:text-faint/70" />
          <span className="shrink-0 rounded-[10px] bg-line-2 px-2 py-1 text-[0.8rem] font-semibold text-muted">LPA</span>
        </span>
      </label>
      <p className={`mt-1.5 text-[0.78rem] ${bad ? "font-medium text-bad" : "text-muted"}`}>{hint}</p>
    </div>
  );
}

/** Where the offer sits against the market range - drawn live as the numbers are typed. */
function MarketScale({ offered, lo, hi }: { offered?: number; lo?: number; hi?: number }) {
  const ready = !!(offered && lo && hi && hi >= lo);
  const L = ready ? lo! : 8, H = ready ? hi! : 12, O = ready ? offered! : 9;
  const min = Math.min(O, L) * 0.85;
  const max = Math.max(O, H) * 1.15;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const pos = !ready ? null : O < L ? "below" : O > H ? "above" : "at";
  const P = { below: { t: "Below market", c: "text-bad", d: "Push for the range - you have room." }, at: { t: "At market", c: "text-mustard-ink", d: "Fair. Aim for the top of the range." }, above: { t: "Above market", c: "text-good", d: "Strong offer. Negotiate the extras." } } as const;
  return (
    <div className={ready ? "" : "opacity-45"}>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">{ready ? "Where your offer sits" : "Example: add your numbers above"}</span>
        {pos && <span className={`font-display text-[1.3rem] font-bold ${P[pos].c}`}>{P[pos].t}</span>}
      </div>
      <div className="relative mt-9 h-4 rounded-full bg-line">
        <span className="absolute inset-y-0 rounded-full bg-good/70" style={{ left: `${pct(L)}%`, width: `${Math.max(pct(H) - pct(L), 1.5)}%` }} />
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(O)}%` }}>
          <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-clay px-2.5 py-0.5 text-[0.78rem] font-bold text-white">Offer ₹{O}</span>
          <span className="block h-7 w-7 rounded-full border-[3px] border-white bg-clay shadow" />
        </span>
      </div>
      <div className="relative mt-2 h-5 text-[0.78rem] text-muted">
        <span className="absolute -translate-x-1/2" style={{ left: `${pct(L)}%` }}>₹{L}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${pct(H)}%` }}>₹{H}</span>
      </div>
      <p className="mt-1 text-[0.86rem] text-ink/80">{pos ? P[pos].d : "Green band is the market range. The dot is the offer."}</p>
    </div>
  );
}
