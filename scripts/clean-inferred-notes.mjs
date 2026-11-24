// One-off: strip model notes like "(inferred from UC)" from stored job names. Run with --apply to write.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const clean = (t) => (typeof t === "string" ? t.replace(/\s*\([^()]*\b(inferred|likely|assumed|guess(ed)?|probably|unclear|not stated)\b[^()]*\)/gi, "").trim() : t);
const FIELDS = ["company", "role", "location", "company_type", "seniority"];
const { data, error } = await db.from("applications").select(`id, analysis, ${FIELDS.join(", ")}`);
if (error) throw error;
const apply = process.argv.includes("--apply");
for (const r of data) {
  const patch = {};
  for (const f of FIELDS) if (clean(r[f]) !== r[f]) patch[f] = clean(r[f]);
  if (r.analysis) {
    const a = { ...r.analysis }; let changed = false;
    for (const f of FIELDS) if (typeof a[f] === "string" && clean(a[f]) !== a[f]) { a[f] = clean(a[f]); changed = true; }
    if (changed) patch.analysis = a;
  }
  if (!Object.keys(patch).length) continue;
  console.log(r.id, Object.fromEntries(Object.entries(patch).filter(([k]) => k !== "analysis")), patch.analysis ? "+analysis" : "");
  if (apply) { const { error: e } = await db.from("applications").update(patch).eq("id", r.id); if (e) throw e; }
}
console.log(apply ? "applied" : "dry run");
