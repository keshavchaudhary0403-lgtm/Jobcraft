import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiErrorMessage, checkLimits, logUsage, openai, type ModelId } from "@/lib/ai";

export const maxDuration = 120;

// Copying text out of a PDF is simple work — always use the cheapest model.
const EXTRACT_MODEL: ModelId = "gpt-6-luna";

/** Upload a resume PDF → get clean plain text back (so users don't have to retype it). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_active, monthly_limit_inr").eq("id", user.id).single();
  if (!profile?.is_active) return Response.json({ error: "Your account is paused." }, { status: 403 });
  const admin = createServiceClient();
  const limits = await checkLimits(admin, user.id, profile.monthly_limit_inr);
  if (limits.error) return Response.json({ error: limits.error }, { status: 402 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "Please upload a PDF." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "PDF must be under 8 MB." }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const res = await openai().responses.create({
      model: EXTRACT_MODEL,
      reasoning: { effort: "none" },
      store: false,
      safety_identifier: user.id,
      input: [
        {
          role: "user",
          content: [
            { type: "input_file", filename: file.name || "resume.pdf", file_data: `data:application/pdf;base64,${data}` },
            {
              type: "input_text",
              text: "Convert this resume to clean plain text. Keep every word, number, date and section exactly as written — do not summarise, rewrite or add anything. Use simple section headings in CAPS and '- ' for bullet points. Output only the resume text.",
            },
          ],
        },
      ],
    });
    await logUsage(admin, { userId: user.id, feature: "resume_import", model: EXTRACT_MODEL, usage: res.usage });
    return Response.json({ text: res.output_text.trim() });
  } catch (err) {
    console.error("resume extract", err);
    return Response.json({ error: `${aiErrorMessage(err)} You can paste the text instead.` }, { status: 500 });
  }
}
