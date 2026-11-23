"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";

type Defaults = { city: string; current_ctc: string; experience: string; strongest_proof: string };

export function NegotiationForm({
  apps,
  preselect,
  defaults,
}: {
  apps: Pick<Application, "id" | "company" | "role" | "status" | "company_type">[];
  preselect?: string;
  defaults: Defaults;
}) {
  const initial = apps.find((a) => a.id === preselect) ?? apps.find((a) => a.status === "offer") ?? null;
  const [appId, setAppId] = useState(initial?.id ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [companyType, setCompanyType] = useState(initial?.company_type ?? "");

  function pick(id: string) {
    setAppId(id);
    const a = apps.find((x) => x.id === id);
    if (a) {
      setRole(a.role);
      setCompanyType(a.company_type ?? "");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Which offer?</label>
        <select name="application_id" className="field" value={appId} onChange={(e) => pick(e.target.value)}>
          <option value="">Not in my applications</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.role} @ {a.company}
              {a.status === "offer" ? " — offer" : ""}
            </option>
          ))}
        </select>
      </div>
      <Field name="role" label="Role offered" value={role} onChange={setRole} required />
      <Field name="company_type" label="Company type" value={companyType} onChange={setCompanyType} placeholder="startup / MNC / agency" required />
      <Field name="city" label="City" defaultValue={defaults.city} required />
      <Field name="offered_ctc" label="Offered CTC" placeholder="e.g. ₹9 LPA" required />
      <Field name="current_ctc" label="Your current CTC" defaultValue={defaults.current_ctc} required />
      <Field name="experience" label="Experience" defaultValue={defaults.experience} placeholder="e.g. about 4 years" required />
      <div className="sm:col-span-2">
        <Field name="market_range" label="Real market range you found (AmbitionBox / Glassdoor)" placeholder="e.g. ₹8 to ₹12 LPA" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Your strongest proof (1–2 real results with numbers)</label>
        <textarea name="strongest_proof" className="field" rows={3} defaultValue={defaults.strongest_proof} required />
      </div>
    </div>
  );
}

function Field(props: {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{props.label}</label>
      <input
        name={props.name}
        className="field"
        required={props.required}
        placeholder={props.placeholder}
        {...(props.onChange ? { value: props.value, onChange: (e) => props.onChange!(e.target.value) } : { defaultValue: props.defaultValue })}
      />
    </div>
  );
}
