"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, RefreshCw } from "lucide-react";
import { ResumeDrop } from "@/components/ResumeDrop";
import { ProfileReview, type ProfileDraft } from "@/components/ProfileReview";
import { createClient } from "@/lib/supabase/client";

export function ProfileClient({ userId, initial, loginId }: { userId: string; initial: ProfileDraft; loginId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [version, setVersion] = useState(0);
  const [replacing, setReplacing] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5 fade-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium"><RefreshCw size={16} /> New resume?</div>
              <p className="mt-0.5 text-xs text-muted">Upload it and we&apos;ll refill your details for review.</p>
            </div>
            {!replacing && <button className="btn btn-ghost" onClick={() => setReplacing(true)}>Upload</button>}
          </div>
          {replacing && (
            <div className="mt-4">
              <ResumeDrop
                compact
                onParsed={(p) => {
                  setDraft((d) => ({
                    ...d,
                    full_name: p.full_name ?? d.full_name,
                    current_title: p.current_title ?? d.current_title,
                    target_role: p.target_role ?? d.target_role,
                    experience_years: p.experience_years ?? d.experience_years,
                    city: p.city ?? d.city,
                    strongest_proof: p.strongest_proof ?? d.strongest_proof,
                    linkedin_url: p.linkedin_url ?? d.linkedin_url,
                    master_resume: p.resume_text,
                    skills: p.skills.length ? p.skills : d.skills,
                  }));
                  setVersion((v) => v + 1);
                  setReplacing(false);
                }}
              />
            </div>
          )}
        </div>
        <PasswordCard loginId={loginId} />
      </div>
      <ProfileReview key={version} userId={userId} initial={draft} onSaved={() => router.refresh()} />
    </div>
  );
}

function PasswordCard({ loginId }: { loginId: string }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function change() {
    if (pw.length < 6) return setMsg("At least 6 characters.");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password changed");
    setPw("");
  }
  return (
    <div className="card p-5 fade-up">
      <div className="flex items-center gap-2 font-medium"><KeyRound size={16} /> Login</div>
      <p className="mt-0.5 truncate text-xs text-muted">Signed in as {loginId}</p>
      <div className="mt-3 flex gap-2">
        <input type="password" className="field py-2" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-ghost" onClick={change} disabled={!pw}>Change</button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
