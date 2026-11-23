import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Application, Message, Session } from "@/lib/types";
import { JobView } from "./JobView";

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { supabase, user } = await requireUser();
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
      .insert({ user_id: user.id, application_id: id, kind: "workspace", title: "Coach" })
      .select("*")
      .single<Session>();
    session = data;
  }
  const [{ data: messages }, { data: interviews }] = await Promise.all([
    supabase.from("messages").select("*").eq("session_id", session!.id).order("created_at").returns<Message[]>(),
    supabase.from("sessions").select("*").eq("application_id", id).eq("kind", "interview").order("updated_at", { ascending: false }).returns<Session[]>(),
  ]);

  return <JobView initialTab={tab} app={app} coachSessionId={session!.id} coachMessages={messages ?? []} interviews={interviews ?? []} />;
}
