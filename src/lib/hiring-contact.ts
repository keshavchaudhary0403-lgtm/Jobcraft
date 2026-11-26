/**
 * The job's hiring contact(s), kept in applications.hiring_contact as plain text so prompts can read it:
 *   "Priya Sharma, Head of Category <https://www.linkedin.com/in/priya/>; Rahul Jain, Recruiter <https://...>"
 * Each person may have a profile link in <...>. Older values are just a name - still valid.
 */
export type HiringPerson = { label: string; url: string | null };

const LINKEDIN_IN = /^https:\/\/(www\.)?linkedin\.com\/in\/[^/?#\s<>]+\/?$/i;

export function hiringPeople(value: string | null | undefined): HiringPerson[] {
  return (value ?? "")
    .split(/\s*;\s*/)
    .map((part) => {
      const m = part.match(/^(.*?)\s*<(https?:\/\/[^>\s]+)>\s*$/);
      const label = (m ? m[1] : part).trim();
      const url = m && LINKEDIN_IN.test(m[2]) ? m[2] : null;
      return { label, url };
    })
    .filter((p) => p.label);
}

/** Names and titles only (no links) - for prompts and the "Who did you find?" box. */
export function hiringLabel(value: string | null | undefined): string {
  return hiringPeople(value).map((p) => p.label).join("; ");
}

/** From the Chrome extension: up to 3 people named on the job page, as the stored text. */
export function hiringFromContacts(input: unknown): string | null {
  if (!Array.isArray(input)) return null;
  const clean = (s: unknown, max: number) => String(s ?? "").replace(/[;<>\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const parts = input.slice(0, 3).flatMap((c) => {
    const name = clean(c?.name, 60);
    if (!name) return [];
    const title = clean(c?.title, 120);
    const url = String(c?.url ?? "").trim();
    return [`${name}${title ? `, ${title}` : ""}${LINKEDIN_IN.test(url) ? ` <${url}>` : ""}`];
  });
  return parts.length ? parts.join("; ").slice(0, 900) : null;
}
