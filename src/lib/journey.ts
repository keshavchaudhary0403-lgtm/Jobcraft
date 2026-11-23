import type { Application } from "./types";
import type { Analysis } from "./tasks";

export const questionList = (an: Analysis) => [...new Set([...(an.questions ?? []), ...(an.gaps ?? []).map((g) => g.question).filter((q): q is string => !!q)])];

export const openQs = (a: Application) => {
  const an = a.analysis as Analysis | null;
  return an ? questionList(an).filter((q) => !a.fit_answers?.[q]?.trim()).length : 0;
};

/** The whole journey for one job, in order: decode → questions → resume → outreach → applied → interview → offer. */
export function journey(a: Application, practised: Set<string>) {
  const an = !!a.analysis;
  const sent = ["applied", "interviewing", "offer", "rejected"].includes(a.status);
  const at = (tab?: string) => `/jobs/${a.id}${tab ? `?tab=${tab}` : ""}`;
  const q = openQs(a);
  return [
    { label: "Decoded", done: an, cta: "See match", href: at() },
    { label: "Questions", done: an && q === 0, cta: `Answer ${q} question${q === 1 ? "" : "s"}`, href: at() },
    { label: "Resume", done: !!a.tailored_resume, cta: "Tailor resume", href: at("resume") },
    { label: "Outreach", done: !!a.outreach, cta: "Write outreach", href: at("outreach") },
    { label: "Applied", done: sent, cta: "Mark as applied", href: at() },
    { label: "Interview", done: ["interviewing", "offer"].includes(a.status) || practised.has(a.id), cta: "Practise interview", href: at("practice") },
    { label: "Offer", done: a.status === "offer", cta: "Negotiate", href: "/negotiation" },
  ];
}
