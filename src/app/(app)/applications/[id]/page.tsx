import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { buildPrompt, STEP_META, WORKSPACE_STEPS } from "@/lib/prompts";
import type { Application, Message, Session } from "@/lib/types";
import { Workspace } from "./Workspace";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, user } = await requireUser();

  const { data: app } = await supabase.from("applications").select("*").eq("id", id).single<Application>();
  if (!app) notFound();

  let { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("application_id", id)
    .eq("kind", "workspace")
    .limit(1)
    .maybeSingle<Session>();
  if (!session) {
    const { data } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, application_id: id, kind: "workspace", title: `${app.role} @ ${app.company}` })
      .select("*")
      .single<Session>();
    session = data;
  }
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", session!.id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const steps = WORKSPACE_STEPS.map((k) => ({ key: k, ...STEP_META[k], prompt: buildPrompt(k, { profile, app }) }));

  return (
    <>
      <Link href="/applications" className="text-sm text-muted hover:text-ink">← All applications</Link>
      <Workspace app={app} sessionId={session!.id} messages={messages ?? []} steps={steps} hasResume={!!profile.master_resume} />
    </>
  );
}
