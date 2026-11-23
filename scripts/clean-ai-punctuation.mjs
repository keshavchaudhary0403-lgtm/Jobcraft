// One-off: replace long dashes, curly quotes and ellipsis characters in stored AI text.
// Usage: node scripts/clean-ai-punctuation.mjs [--dry]   (reads .env.local; writes a JSON backup first)
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const dry = process.argv.includes("--dry");
const api = (path, opts = {}) =>
  fetch(`${SB}/rest/v1/${path}`, { ...opts, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", prefer: "return=minimal", ...(opts.headers ?? {}) } });

const clean = (t) => t.replace(/\s*[—–]\s*/g, (m) => (/\s/.test(m) ? " - " : "-")).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...");
const deep = (v) => (typeof v === "string" ? clean(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);

const TARGETS = [
  { table: "applications", cols: ["analysis", "tailored_resume", "resume_result", "outreach"] },
  { table: "profiles", cols: ["master_resume", "strongest_proof", "extra_notes", "linkedin_result"] },
  { table: "sessions", cols: ["meta"] },
  { table: "messages", cols: ["content"], filter: "role=eq.assistant" },
];

const backup = {};
let total = 0;
for (const { table, cols, filter } of TARGETS) {
  const rows = await (await api(`${table}?select=id,${cols.join(",")}${filter ? `&${filter}` : ""}&limit=10000`)).json();
  backup[table] = rows;
  let changed = 0;
  for (const row of rows) {
    const patch = {};
    for (const c of cols) if (row[c] != null) { const n = deep(row[c]); if (JSON.stringify(n) !== JSON.stringify(row[c])) patch[c] = n; }
    if (!Object.keys(patch).length) continue;
    changed++;
    if (!dry) { const r = await api(`${table}?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify(patch) }); if (!r.ok) console.error(table, row.id, r.status, await r.text()); }
  }
  total += changed;
  console.log(`${table}: ${changed} of ${rows.length} rows ${dry ? "would change" : "cleaned"}`);
}
const out = new URL(`../.backup-before-clean-${Date.now()}.json`, import.meta.url);
fs.writeFileSync(out, JSON.stringify(backup));
console.log(`Done. ${total} rows. Backup: ${out.pathname}`);
