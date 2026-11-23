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
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <ProfileReview key={version} userId={userId} initial={draft} onSaved={() => router.refresh()} />
      <aside className="space-y-4">
        <div className="card p-5 fade-up">
          <div className="mb-3 flex items-center gap-2 font-medium"><RefreshCw size={16} /> New resume?</div>
          {replacing ? (
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
          ) : (
            <button className="btn btn-ghost w-full" onClick={() => setReplacing(true)}>Upload and refill</button>
          )}
          <p className="mt-2 text-xs text-muted">Review the changes, then save.</p>
        </div>
        <PasswordCard loginId={loginId} />
      </aside>
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
      <div className="mb-1 flex items-center gap-2 font-medium"><KeyRound size={16} /> Login</div>
      <p className="mb-3 truncate text-xs text-muted">{loginId}</p>
      <input type="password" className="field" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="btn btn-ghost mt-2 w-full" onClick={change} disabled={!pw}>Change password</button>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
