import { getDocumentProxy } from "unpdf";

/**
 * Every clickable link in a PDF, paired with the words it sits on - e.g.
 * { text: "CAPEX Recovery App (HooLiv)", url: "https://..." }. The AI reads a PDF's text but not the
 * addresses behind linked words, so these are handed to it separately to keep the links.
 */
export async function pdfLinks(bytes: Uint8Array): Promise<{ text: string; url: string }[]> {
  const pdf = await getDocumentProxy(bytes);
  const out: { text: string; url: string }[] = [];
  const seen = new Set<string>();
  for (let n = 1; n <= Math.min(pdf.numPages, 6); n++) {
    const page = await pdf.getPage(n);
    const links = (await page.getAnnotations()).filter((a) => a.subtype === "Link" && typeof a.url === "string" && /^(https?:|mailto:)/i.test(a.url));
    if (!links.length) continue;
    type Item = { str: string; transform: number[]; width: number };
    const items = (await page.getTextContent()).items.filter((i) => "str" in i) as unknown as Item[];
    for (const a of links) {
      const [x0, y0, x1, y1] = a.rect as number[];
      // words whose box sits inside the link area (same line, horizontally within it)
      const text = items
        .filter((i) => {
          const x = i.transform[4], y = i.transform[5];
          return y >= y0 - 2 && y <= y1 + 2 && x >= x0 - 2 && x + i.width <= x1 + 2;
        })
        .map((i) => i.str)
        .join("")
        .trim();
      const url = a.url as string;
      const label = text || url.replace(/^(https?:\/\/|mailto:)/i, "").replace(/\/$/, "");
      const key = `${label}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: label, url });
    }
  }
  return out;
}
