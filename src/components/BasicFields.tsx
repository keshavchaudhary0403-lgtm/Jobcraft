"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  ctcInput,
  experienceInput,
  FIELD_ERRORS,
  formatCity,
  formatCtc,
  formatExperience,
  formatLinkedIn,
  formatName,
  formatTitle,
  linkedInInput,
} from "@/lib/profile-format";

type Base = { label: string; value: string; onChange: (v: string) => void; required?: boolean; optional?: boolean; hint?: string; className?: string };

function Label({ label, required, optional }: { label: string; required?: boolean; optional?: boolean }) {
  return (
    <label className="label flex items-center gap-1.5">
      {label}
      {required && <span className="text-clay" aria-label="required">*</span>}
      {optional && <span className="rounded-full bg-line-2 px-1.5 py-px text-[0.7rem] font-semibold text-muted">Optional</span>}
    </label>
  );
}

function Foot({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="mt-1.5 flex items-center gap-1 text-[0.78rem] font-medium text-bad"><AlertCircle size={12} /> {error}</p>;
  if (hint) return <p className="mt-1.5 text-[0.78rem] text-muted">{hint}</p>;
  return null;
}

/** Plain text field that tidies itself when you leave it (name, title, role, city). */
export function TextField({ kind, placeholder, maxLength = 90, ...p }: Base & { kind: "name" | "title" | "city"; placeholder?: string; maxLength?: number }) {
  const fmt = kind === "name" ? formatName : kind === "city" ? formatCity : (v: string) => formatTitle(v, maxLength);
  const missing = p.required && !p.value.trim();
  const [touched, setTouched] = useState(false);
  return (
    <div className={p.className}>
      <Label label={p.label} required={p.required} optional={p.optional} />
      <input
        className={`field ${touched && missing ? "!border-bad/60" : ""}`}
        value={p.value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={() => { setTouched(true); const f = fmt(p.value); if (f !== p.value) p.onChange(f); }}
      />
      <Foot error={touched && missing ? `Add your ${p.label.toLowerCase()}` : undefined} hint={p.hint} />
    </div>
  );
}

/**
 * Field with a fixed prefix/suffix. The user types only the variable part
 * ("15.5", "5+", "your-name"); the stored value is always the full, clean form.
 */
function AffixField({ prefix, suffix, toInput, format, error, placeholder, inputMode, ...p }: Base & {
  prefix?: string; suffix?: string; toInput: (v: string) => string; format: (v: string) => string | null; error: string; placeholder?: string; inputMode?: "decimal" | "text";
}) {
  const [draft, setDraft] = useState<string | null>(null); // what's in the box while typing
  const shown = draft ?? toInput(p.value);
  const bad = !!p.value.trim() && format(p.value) === null;
  const missing = p.required && !p.value.trim() && draft !== null;
  return (
    <div className={p.className}>
      <Label label={p.label} required={p.required} optional={p.optional} />
      <div className={`field flex items-center gap-2 !px-0 focus-within:!border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_16%,transparent)] ${bad || missing ? "!border-bad/60" : ""}`}>
        {prefix && <span className="ml-1 shrink-0 select-none rounded-[10px] bg-line-2 px-2 py-1 text-[0.86rem] font-semibold text-muted">{prefix}</span>}
        <input
          className={`h-full min-w-0 flex-1 bg-transparent outline-none placeholder:font-normal placeholder:text-faint ${prefix ? "" : "pl-[.9rem]"} ${suffix ? "" : "pr-[.9rem]"}`}
          value={shown}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(e) => { setDraft(e.target.value); p.onChange(e.target.value.trim() ? e.target.value : ""); }}
          onBlur={() => {
            const raw = (draft ?? toInput(p.value)).trim();
            setDraft(null);
            if (!raw) return p.onChange("");
            // Try the box as typed, then with the suffix the user didn't need to type.
            const f = format(raw) ?? (suffix ? format(`${raw} ${suffix}`) : null);
            p.onChange(f ?? raw);
          }}
        />
        {suffix && <span className="mr-1 shrink-0 select-none rounded-[10px] bg-line-2 px-2 py-1 text-[0.86rem] font-semibold text-muted">{suffix}</span>}
      </div>
      <Foot error={bad ? error : missing ? `Add your ${p.label.toLowerCase()}` : undefined} hint={p.hint} />
    </div>
  );
}

export const ExperienceField = (p: Base) => (
  <AffixField {...p} suffix="years" placeholder="e.g. 5 or 5+" inputMode="text" toInput={experienceInput} format={formatExperience} error={FIELD_ERRORS.experience_years} />
);
export const CtcField = (p: Base) => (
  <AffixField {...p} prefix="₹" suffix="LPA" placeholder="e.g. 15.5" inputMode="decimal" toInput={ctcInput} format={formatCtc} error={FIELD_ERRORS.current_ctc} />
);
export const LinkedInField = (p: Base) => (
  <AffixField {...p} prefix="linkedin.com/in/" placeholder="your-name" toInput={linkedInInput} format={formatLinkedIn} error={FIELD_ERRORS.linkedin_url} />
);
