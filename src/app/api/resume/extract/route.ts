import { createClient } from "@/lib/supabase/server";
import { claude, MODEL } from "@/lib/claude";

export const maxDuration = 120;

/** Upload a resume PDF → get clean plain text back (so users don't have to retype it). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (file.type !== "application/pdf") return Response.json({ error: "Please upload a PDF." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "PDF must be under 8 MB." }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const res = await claude().messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            {
              type: "text",
              text: "Convert this resume to clean plain text. Keep every word, number, date and section exactly as written — do not summarise, rewrite or add anything. Use simple section headings in CAPS and '- ' for bullet points. Output only the resume text.",
            },
          ],
        },
      ],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return Response.json({ text });
  } catch (err) {
    console.error("resume extract", err);
    return Response.json({ error: "Could not read that PDF. Paste the text instead." }, { status: 500 });
  }
}
