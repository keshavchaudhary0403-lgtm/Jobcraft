"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UploadCloud } from "lucide-react";
import { ResumeDrop } from "@/components/ResumeDrop";
import { ProfileReview } from "@/components/ProfileReview";
import type { ProfileDraft } from "@/lib/profile-draft";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/client-ui";

export function ProfileClient({ userId, initial, loginId, isDemo, scoreStart }: { userId: string; initial: ProfileDraft; loginId: string; isDemo?: boolean; scoreStart?: number | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [version, setVersion] = useState(0);
  const [upload, setUpload] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <>
      <ProfileReview
        key={version}
        tabs
        userId={userId}
        initial={draft}
        baseline={initial}
        scoreStart={scoreStart}
        onSaved={() => router.refresh()}
        head={{
          loginId,
          actions: (
            <>
              {!isDemo && <button className="btn btn-ghost h-11" onClick={() => setPwOpen(true)}><KeyRound size={15} /> Change password</button>}
              <button className="btn btn-primary h-11" onClick={() => setUpload(true)}><UploadCloud size={15} /> Upload new resume</button>
            </>
          ),
        }}
      />

      <Modal open={upload} onClose={() => setUpload(false)} title="Upload new resume">
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
            setUpload(false);
          }}
        />
        <p className="mt-3 text-[0.85rem] text-muted">Your details refill from it.</p>
      </Modal>
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setMsg("At least 6 characters.");
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) return setMsg(error.message);
    setPw("");
    setMsg("");
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Change password" width={420}>
      <form onSubmit={change} className="space-y-3">
        <input type="password" autoFocus className="field" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <p className="text-[0.85rem] text-bad">{msg}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!pw}>Update</button>
        </div>
      </form>
    </Modal>
  );
}
