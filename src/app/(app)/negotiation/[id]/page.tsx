import { SessionView } from "@/components/SessionView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionView id={id} kind="negotiation" />;
}
