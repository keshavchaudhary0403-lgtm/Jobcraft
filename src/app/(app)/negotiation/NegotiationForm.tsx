"use client";

import { useState } from "react";
import { Check, ExternalLink, IndianRupee, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/client-ui";
import type { Application } from "@/lib/types";
import { JobPicker } from "@/components/JobPicker";

/** First one or two numbers in a salary string ("9 LPA", "8-12 LPA"). */
const nums = (s: string) => (s.replace(/,/g, "").match(/\d+(\.\d+)?/g) ?? []).map(Number).filter((n) => n > 0);

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
  const o = nums(offered)[0];
  const m = nums(market);
  const lo = m[0];
  const hi = m[1] ?? m[0];

  function cancel() {
    setVals(saved);
    setSaveMsg("");
    setEdit(false);
  }
  async function save() {
    setSaving(true);
    setSaveMsg("");
    const t = (x: string) => x.trim() || null;
    const { error } = await createClient()
      .from("profiles")
      .update({ current_ctc: t(vals.current_ctc), experience_years: t(vals.experience), city: t(vals.city), strongest_proof: t(vals.strongest_proof) })
      .eq("id", userId);
    setSaving(false);
    if (error) return setSaveMsg("Couldn't save. Try again.");
    setSaved(vals);
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
                <input name="role" className="field" placeholder="Role offered" />
                <input name="company_type" className="field" placeholder="Company type (startup, MNC...)" />
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
            <BigInput label="Offered CTC" name="offered_ctc" placeholder="9 LPA" value={offered} onChange={setOffered} />
            <BigInput label="Market range" name="market_range" placeholder="8-12 LPA" value={market} onChange={setMarket} />
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
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Current CTC</label><input className="field" value={vals.current_ctc} onChange={(e) => setVals({ ...vals, current_ctc: e.target.value })} placeholder="₹12 LPA" /></div>
              <div><label className="label">Experience</label><input className="field" value={vals.experience} onChange={(e) => setVals({ ...vals, experience: e.target.value })} placeholder="5 years" /></div>
              <div><label className="label">City</label><input className="field" value={vals.city} onChange={(e) => setVals({ ...vals, city: e.target.value })} /></div>
              <div className="col-span-3"><label className="label">Best results (with numbers)</label><textarea className="field" rows={3} value={vals.strongest_proof} onChange={(e) => setVals({ ...vals, strongest_proof: e.target.value })} /></div>
              <p className="col-span-3 text-[0.78rem] text-muted">Saving also updates My profile.</p>
            </div>
          ) : (
            <div className="grid flex-1 gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
              <div className="grid gap-2.5">
                {[["Current CTC", saved.current_ctc], ["Experience", saved.experience], ["City", saved.city]].map(([k, v], i) => (
                  <div key={k} data-tone={i % 5} className="tone-soft flex items-center justify-between gap-3 rounded-2xl bg-line-2/70 px-4 py-2.5">
                    <span className="text-[0.8rem] text-muted">{k}</span>
                    <span className="truncate font-display text-[1.1rem] font-bold" title={v}>{v || "-"}</span>
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
          <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-white/55">How the talk plays out</div>
          <ol className="mt-4 flex-1 space-y-3">
            {["See if the offer is below, at or above market", "Get a realistic counter range", "Make your counter - HR pushes back", "Say stop for feedback"].map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display text-[0.9rem] font-bold text-mustard">{i + 1}</span>
                <span className="text-[0.95rem] text-cream/90">{t}</span>
              </li>
            ))}
          </ol>
          <button className="btn btn-clay mt-5 h-12 w-full text-[1rem]" disabled={edit}>Start practice</button>
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

function BigInput({ label, name, placeholder, value, onChange }: { label: string; name: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block rounded-2xl border-[1.5px] border-line bg-card px-4 py-3 transition focus-within:border-brand">
      <span className="text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="mt-1 flex items-center gap-1.5">
        <IndianRupee size={18} className="text-faint" />
        <input name={name} required placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent font-display text-[1.5rem] font-bold outline-none placeholder:text-faint/70" />
      </span>
    </label>
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
  const P = { below: { t: "Below market", c: "text-clay", d: "Push for the range - you have room." }, at: { t: "At market", c: "text-mustard-ink", d: "Fair. Aim for the top of the range." }, above: { t: "Above market", c: "text-good", d: "Strong offer. Negotiate the extras." } } as const;
  return (
    <div className={ready ? "" : "opacity-45"}>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">{ready ? "Where your offer sits" : "Example - type your numbers"}</span>
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
      <p className="mt-1 text-[0.86rem] text-ink/80">{pos ? P[pos].d : "The green band is the market range; the dot is your offer."}</p>
    </div>
  );
}
