"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ResumeDrop } from "@/components/ResumeDrop";
import { ProfileReview, draftFrom, type ProfileDraft } from "@/components/ProfileReview";

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
    <div className="grid min-h-screen lg:grid-cols-[400px_1fr]">
      {/* Left rail */}
      <aside className="relative hidden overflow-hidden bg-[#0b1220] p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="relative"><Logo light /></div>
        <div className="relative mt-16">
          <div className="text-sm text-white/50">Set up · about 2 minutes</div>
          <ol className="mt-6 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`flex items-start gap-4 rounded-2xl p-3 transition ${i === step ? "bg-white/[.07]" : ""}`}>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition ${
                    i < step ? "bg-teal-400 text-[#0b1220]" : i === step ? "bg-white text-[#0b1220]" : "border border-white/20 text-white/50"
                  }`}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${i > step ? "text-white/50" : ""}`}>{s.title}</span>
                  <span className="block text-xs text-white/45">{s.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative mt-auto flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="block text-xs text-white/45">Signed in as</span>
            <span className="block truncate">{loginId}</span>
          </span>
          <button onClick={logout} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" title="Log out" aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Main */}
      <main className="ai-gradient flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Logo />
          <button onClick={logout} className="btn-quiet rounded-lg text-sm">Log out</button>
        </div>
        <div className={`mx-auto w-full px-6 py-10 lg:px-14 lg:py-16 ${draft ? "max-w-[1180px]" : "max-w-[880px] lg:my-auto"}`}>
          {!draft ? (
            <>
              <div className="text-sm font-medium text-brand-ink">Step 1 of 3</div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight fade-up">{first ? `Welcome, ${first}.` : "Welcome."}</h1>
              <p className="mb-10 mt-3 text-lg text-muted fade-up">Upload your resume and we&apos;ll set up your profile from it.</p>
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
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-brand-ink">Step 2 of 3</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight fade-up">Does this look right?</h1>
              <p className="mb-8 mt-2 text-muted fade-up">Everything Jobcraft writes uses these facts.</p>
              <ProfileReview userId={userId} initial={draft} cta="Looks good — continue" onSaved={() => router.push("/jobs/new")} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
