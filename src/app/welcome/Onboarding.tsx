"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ResumeDrop } from "@/components/ResumeDrop";
import { ProfileReview } from "@/components/ProfileReview";
import { draftFrom, type ProfileDraft } from "@/lib/profile-draft";

const STEPS = [
  { title: "Upload your resume", sub: "PDF or text" },
  { title: "Confirm your details", sub: "Fix anything that's off" },
  { title: "Add your first job", sub: "Paste a job description" },
];

export function Onboarding({ userId, first, loginId }: { userId: string; first: string | null; loginId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const step = draft ? 1 : 0;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-6 lg:px-8">
        <Logo size={32} />
        <div className="flex items-center gap-3 text-[0.88rem] text-muted">
          <span className="hidden truncate sm:inline">Signed in as <b className="font-semibold text-ink">{loginId}</b></span>
          <button onClick={logout} className="btn btn-ghost btn-sm"><LogOut size={14} /> Log out</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-6 pb-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[2.8rem] font-bold leading-none fade-up">{!draft ? (first ? `Welcome, ${first}` : "Welcome") : "Does this look right"}<span className="text-clay">{draft ? "?" : "."}</span></h1>
            <p className="mt-3 text-[1.02rem] text-muted fade-up">{!draft ? "Set up takes about 2 minutes. Start with your resume." : "We read this from your resume. Fix anything that's off."}</p>
          </div>
        </div>

        {/* Steps */}
        <ol className="mt-7 grid gap-3 sm:grid-cols-3 fade-up">
          {STEPS.map((s, i) => {
            const on = i === step;
            const done = i < step;
            return (
              <li key={s.title} className={`flex items-center gap-3 rounded-[20px] border-[1.5px] px-4 py-3.5 ${on ? "border-side bg-side text-cream" : "border-line bg-card"}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[0.9rem] font-bold ${on ? "bg-cream text-side" : done ? "bg-brand text-cream" : "bg-line-2 text-muted"}`}>{done ? <Check size={15} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[1.05rem] font-bold leading-tight">{s.title}</span>
                  <span className={`block text-[0.8rem] ${on ? "text-cream/65" : "text-muted"}`}>{s.sub}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 fade-up">
          {!draft ? (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ResumeDrop
                onParsed={(p) =>
                  setDraft(
                    draftFrom({
                      full_name: p.full_name,
                      current_title: p.current_title,
                      target_role: p.target_role,
                      experience_years: p.experience_years,
                      city: p.city,
                      strongest_proof: p.strongest_proof,
                      master_resume: p.resume_text,
                      linkedin_url: p.linkedin_url,
                      skills: p.skills,
                    }),
                  )
                }
              />
              <aside className="dark-card p-6">
                <div className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-white/55">From your resume we fill in</div>
                <ul className="mt-4 space-y-3">
                  {["Your name, title and city", "The role you're going after", "Your skills and strongest result", "Your full resume, ready to tailor"].map((x) => (
                    <li key={x} className="flex items-center gap-3 text-[0.95rem]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mustard text-side"><Check size={13} strokeWidth={3} /></span>{x}</li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-white/10 pt-4 text-[0.84rem] text-white/60">You check everything before it&apos;s saved. Nothing is invented.</p>
              </aside>
            </div>
          ) : (
            <ProfileReview userId={userId} initial={draft} cta="Looks good — continue" onSaved={() => router.push("/jobs/new")} />
          )}
        </div>
      </main>
    </div>
  );
}
