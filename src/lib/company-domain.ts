/** Best guess at a company's website, used only to show its logo. */
const JOB_BOARDS = /(linkedin|naukri|indeed|glassdoor|greenhouse|lever|workday|myworkdayjobs|instahyre|foundit|monster|iimjobs|wellfound|angel|ashbyhq|smartrecruiters|hirist|cutshort|google|bing|apna|shine|timesjobs|freshersworld|internshala|workable|recruitee|bamboohr|zohorecruit|keka|darwinbox|jobvite|icims|taleo|successfactors)\./i;

export function companyDomain(name: string, jobUrl?: string | null): string | null {
  if (jobUrl) {
    try {
      const host = new URL(jobUrl).hostname.toLowerCase();
      if (!JOB_BOARDS.test(host)) {
        const parts = host.replace(/^(www|careers|jobs|career|apply|hiring)\./, "").split(".");
        // keep the registrable part, e.g. careers.acme.co.in -> acme.co.in
        const tail = parts.slice(-3).join(".");
        return /\.(co|com|net|org|gov|ac)\.[a-z]{2}$/.test(tail) ? tail : parts.slice(-2).join(".");
      }
    } catch {}
  }
  const slug = name.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/\b(pvt|private|ltd|limited|inc|llp|technologies|technology|solutions|india)\b/g, "").replace(/[^a-z0-9]/g, "");
  return slug.length >= 2 ? `${slug}.com` : null;
}
