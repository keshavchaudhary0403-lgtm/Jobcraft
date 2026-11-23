"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResumeDrop } from "@/components/ResumeDrop";
import { ProfileReview, draftFrom, type ProfileDraft } from "@/components/ProfileReview";

export function Onboarding({ userId, first }: { userId: string; first: string | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  return (
    <div className="mt-12">
      <div className="mb-2 flex gap-1.5">
        {[0, 1].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i === 0 || draft ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
      {!draft ? (
        <>
          <h1 className="mt-8 text-3xl font-semibold tracking-tight fade-up">
            {first ? `Welcome, ${first}.` : "Welcome."} <span className="text-gradient">Let&apos;s start with your resume.</span>
          </h1>
          <p className="mb-8 mt-2 text-muted fade-up">We&apos;ll fill in your profile from it.</p>
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
          <h1 className="mt-8 text-3xl font-semibold tracking-tight fade-up">Does this look right?</h1>
          <p className="mb-8 mt-2 text-muted fade-up">Fix anything that&apos;s off — everything we write uses these facts.</p>
          <ProfileReview userId={userId} initial={draft} cta="Looks good — continue" onSaved={() => router.push("/jobs/new")} />
        </>
      )}
    </div>
  );
}
