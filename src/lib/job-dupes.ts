/** Helpers to spot a job that's already saved: same link, or same company + role. */

/** A link reduced to what identifies the job (no tracking bits, LinkedIn/Naukri made canonical). */
export function jobKey(url?: string | null) {
  if (!url) return "";
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("linkedin.com")) {
      const id = u.searchParams.get("currentJobId") || (u.pathname.match(/\/jobs\/view\/(\d+)/) || [])[1];
      if (id) return `linkedin:${id}`;
    }
    if (host.endsWith("naukri.com")) {
      const id = (u.pathname.match(/-(\d{9,})\/?$/) || [])[1];
      if (id) return `naukri:${id}`;
    }
    return `${host}${u.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function sameJob(a: { job_url?: string | null; company?: string | null; role?: string | null }, b: { job_url?: string | null; company?: string | null; role?: string | null }) {
  const ka = jobKey(a.job_url), kb = jobKey(b.job_url);
  if (ka && kb && ka === kb) return "link" as const;
  if (norm(a.company) && norm(a.company) === norm(b.company) && norm(a.role) && norm(a.role) === norm(b.role)) return "name" as const;
  return null;
}
