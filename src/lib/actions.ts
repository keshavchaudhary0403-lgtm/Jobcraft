"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";

/** Create a new AI session (a fresh "chat") and open it. */
export async function startSession(kind: SessionKind, formData: FormData) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) redirect("/login");

  const meta: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && v.trim() && k !== "application_id" && !k.startsWith("$")) meta[k] = v.trim();
  }
  const applicationId = (formData.get("application_id") as string) || null;

  let title = meta.role || "Session";
  if (applicationId) {
    const { data: app } = await supabase.from("applications").select("company, role").eq("id", applicationId).single();
    if (app) title = `${app.role} @ ${app.company}`;
  } else if (meta.company) title = `${meta.role} @ ${meta.company}`;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, kind, application_id: applicationId, meta, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const base = kind === "interview" ? "/interview" : "/negotiation";
  redirect(`${base}/${data.id}`);
}

/** Practise again: a fresh round for the same job (and the same offer for salary talks). */
export async function restartSession(id: string) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) redirect("/login");
  const { data: old } = await supabase.from("sessions").select("kind, application_id, meta, title").eq("id", id).single();
  if (!old) redirect("/interview");
  // Keep the job and offer details; drop the old round's scorecard. The offer check stays valid for the same offer.
  const { interview_report: _r, report_turns: _t, ...meta } = (old.meta ?? {}) as Record<string, unknown>;
  void _r; void _t;
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, kind: old.kind, application_id: old.application_id, meta, title: old.title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`${old.kind === "interview" ? "/interview" : "/negotiation"}/${data.id}`);
}

export async function deleteSession(id: string, back: string) {
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", id);
  redirect(back);
}
