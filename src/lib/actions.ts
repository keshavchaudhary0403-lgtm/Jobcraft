"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";

/** Create a new AI session (a fresh "chat") and open it. */
export async function startSession(kind: SessionKind, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && k !== "application_id" && !k.startsWith("$")) meta[k] = v.trim();
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

  const base = kind === "interview" ? "/interview" : kind === "negotiation" ? "/negotiation" : "/linkedin";
  redirect(`${base}/${data.id}`);
}

export async function deleteSession(id: string, back: string) {
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", id);
  redirect(back);
}
