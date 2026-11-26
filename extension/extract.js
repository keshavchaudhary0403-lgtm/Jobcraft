/**
 * Runs inside the job page the user is looking at, only when they click the extension.
 * Reads that one page: company, role, location, link, the job description and (LinkedIn) the hiring team it names. Nothing else.
 * Must be self-contained (it is injected with chrome.scripting.executeScript).
 */
async function jobcraftExtract() {
  const clean = (t) => (t || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  const text = (el) => (el ? clean(el.innerText || el.textContent || "") : "");
  const first = (...sels) => {
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        const t = text(el);
        if (t) return t;
      }
    }
    return "";
  };
  const firstEl = (...sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && text(el).length > 150) return el;
    }
    return null;
  };
  const selection = clean(String(window.getSelection ? window.getSelection() : ""));
  const host = location.hostname.replace(/^www\./, "");
  const out = { site: host, url: location.href, company: "", role: "", location: "", jd: "", how: "" };

  // ---------- LinkedIn ----------
  if (/(^|\.)linkedin\.com$/.test(host)) {
    out.site = "LinkedIn";
    // LinkedIn swaps jobs without reloading: the address changes first, the tab title and the job panel follow.
    // So read only once the panel for the job in the address is in (and the tab title, "Role | Company | LinkedIn", matches it).
    const titleParts = () => document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*\|\s*LinkedIn\s*$/i, "").split(/\s*\|\s*/);
    const aboutHead = () => [...document.querySelectorAll("h2, h3, h4, p, span, div")].filter((e) => /^about the job$/i.test((e.innerText || "").trim())).pop();
    const jobId = () => new URLSearchParams(location.search).get("currentJobId") || (location.pathname.match(/\/jobs\/view\/(\d+)/) || [])[1] || "";
    // The open job's panel: climb from "About the job" to the block that also holds the job's title link -
    // a link to this job's id (/jobs/view/<id>) whose text is the role. A panel still showing the previous job
    // has no such link. Stay in the job's column so it never reaches the job list on the left.
    // In search results (jobs swap in place) the title is a link to the job's id; on a job's own page it is plain text.
    const inSearch = () => new URLSearchParams(location.search).has("currentJobId");
    const titleLink = (p, id, role) =>
      inSearch()
        ? [...p.querySelectorAll(`a[href*="${id}"]`)].some((a) => (a.innerText || "").trim().split("\n")[0].trim() === role)
        : [...p.querySelectorAll("h1, h2, a, p, span, div")].some((e) => e.children.length <= 3 && (e.innerText || "").trim() === role);
    const paneFor = (id, role) => {
      const head = aboutHead();
      if (!head || !id || !role) return null;
      const left = head.getBoundingClientRect().left;
      let p = head;
      while (p && !titleLink(p, id, role)) {
        p = p.parentElement;
        if (!p || p === document.body) return null;
        const r = p.getBoundingClientRect();
        if (r.width > 0 && r.left < left - 80) return null; // (zero-size wrappers don't count)
      }
      return p;
    };
    const words = (el) => (el?.innerText || "").split(/\s+/).filter(Boolean).length;
    const oldLayout = () => document.querySelector(".job-details-jobs-unified-top-card__job-title, .top-card-layout__title") && document.querySelector("#job-details, .jobs-description__content, .show-more-less-html__markup");
    let ready = false;
    for (let i = 0; i < 24 && !ready; i++) {
      const parts = titleParts();
      // ready = this job's panel is in (its title link matches the tab title) and has its description
      const pane = parts.length >= 2 ? paneFor(jobId(), parts[0]) : null;
      ready = !!oldLayout() || (!!pane && words(pane) > 120);
      if (!ready) await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) out.waiting = true; // still loading - the panel asks to press Recheck
    const id = jobId();
    if (id) out.url = `https://www.linkedin.com/jobs/view/${id}/`;
    out.role = first(
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      ".top-card-layout__title",
      "h1"
    );
    out.company = first(
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a",
      ".topcard__org-name-link",
      ".top-card-layout__second-subline a"
    );
    out.location = first(
      ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
      ".job-details-jobs-unified-top-card__bullet",
      ".jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet"
    ).split(/[·\n]/)[0].trim();
    const jd = firstEl("#job-details", ".jobs-description__content", ".jobs-box__html-content", ".jobs-description", ".show-more-less-html__markup", ".description__text");
    if (jd) { out.jd = text(jd); out.how = "page"; }

    // LinkedIn's newer layout has no stable class names: use the "About the job" heading,
    // and the tab title, which reads "Role | Company | LinkedIn".
    const parts = titleParts();
    if (!out.role && parts.length >= 2) out.role = parts[0];
    if (!out.company && parts.length >= 2) out.company = parts[1];
    // The open job's panel (not the job list on the left, not the rest of the page)
    const pane = paneFor(id, out.role);
    if (!out.jd && pane) {
      const head = [...pane.querySelectorAll("h2, h3, h4, p, span, div")].filter((e) => /^about the job$/i.test((e.innerText || "").trim())).pop();
      if (head) {
        let box = head;
        while (box && box !== pane && words(box) < 80) box = box.parentElement;
        if (box) {
          // open the full description, as the user would by clicking "more"
          const more = [...box.querySelectorAll("button, a, span[role=button]")].find((b) => /^(…\s*)?(see |show )?more$/i.test((b.innerText || b.getAttribute("aria-label") || "").trim()));
          if (more) { more.click(); await new Promise((r) => setTimeout(r, 600)); }
          out.jd = text(box)
            .replace(/^about the job\s*/i, "")
            .split("\n")
            .filter((l) => !/^(null|…\s*more|show less|see less)$/i.test(l.trim()))
            .join("\n");
          out.how = "page";
        }
      }
    }
    const scope = pane;
    // Location sits right after the company in the job's header: "Curefit • Delhi, India (On-site) · 3 days ago"
    if (!out.location && out.company && scope) {
      const esc = out.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("^" + esc + "\\s*[•·]\\s*([^•·\\n]+)");
      const hit = [...scope.querySelectorAll("p, span, div")]
        .filter((e) => (e.innerText || "").length < 200)
        .map((e) => (e.innerText || "").trim().replace(/\s+/g, " "))
        .map((t) => re.exec(t))
        .find(Boolean);
      if (hit) out.location = hit[1].replace(/\s*\((on-site|remote|hybrid)\)\s*$/i, "").trim();
    }
    // "Meet the hiring team": the people LinkedIn names on this job (only when the post shows them).
    out.contacts = [];
    // the heading is an h2 in the older layout and a plain <p> in the newer one: take the innermost element with that text
    const team = [...document.querySelectorAll("h2, h3, h4, p, span, div")].filter((e) => /^meet the hiring team$/i.test((e.innerText || "").trim())).pop();
    if (team) {
      let box = team.parentElement;
      while (box && !box.querySelector('a[href*="/in/"]') && box !== document.body) box = box.parentElement;
      const seen = new Set();
      const noise = /^(message|follow|connect|job poster|verified|premium|·|•|\d+(st|nd|rd|th)\+?( degree connection)?|view .*profile|mutual connection.*)$/i;
      for (const a of box && box !== document.body ? box.querySelectorAll('a[href*="/in/"]') : []) {
        const slug = (a.getAttribute("href").match(/\/in\/([^/?#]+)/) || [])[1];
        if (!slug || seen.has(slug)) continue;
        // the person's card: the largest block around this link that holds no other profile
        let card = a;
        while (card.parentElement && card.parentElement !== box && new Set([...card.parentElement.querySelectorAll('a[href*="/in/"]')].map((l) => (l.getAttribute("href").match(/\/in\/([^/?#]+)/) || [])[1])).size === 1) card = card.parentElement;
        const lines = text(card).split("\n")
          .map((l) => l.replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\b.*$/i, "").replace(/\s*\((he|she|they)\/\w+\)\s*$/i, "").trim())
          .filter((l) => l && !noise.test(l));
        const name = (text(a).split("\n")[0] || lines[0] || "").replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\b.*$/i, "").trim();
        if (!name || name.length > 60 || /linkedin/i.test(name)) continue;
        seen.add(slug);
        const title = lines.find((l) => l !== name && l.length > 3 && l.length < 160) || "";
        out.contacts.push({ name, title, url: `https://www.linkedin.com/in/${slug}/` });
        if (out.contacts.length >= 3) break;
      }
    }

    // fallback: a short "City, Country · 2 days ago" line that isn't the title block
    if (!out.location && scope) {
      const line = [...scope.querySelectorAll("p, span")].find((e) => {
        const t = (e.innerText || "").trim();
        return t.length < 160 && !t.includes("\n") && /·/.test(t) && /(ago|applicant|clicked apply|reposted|people)/i.test(t) && !(out.role && t.includes(out.role));
      });
      if (line) out.location = line.innerText.split("·")[0].trim();
    }
    out.location = out.location.replace(/\s*\((on-site|remote|hybrid)\)\s*$/i, "").trim();
    // never guess from the whole LinkedIn page (it reads the menus and the job list)
    out.noGuess = true;
  }

  // ---------- Naukri ----------
  else if (/(^|\.)naukri\.com$/.test(host)) {
    out.site = "Naukri";
    out.url = location.href.split("?")[0];
    out.role = first('h1[class*="jd-header-title"]', 'header h1', "h1");
    out.company = first('[class*="jd-header-comp-name"] a', '[class*="jd-header-comp-name"]', '[class*="comp-name"] a').replace(/\s*\d(\.\d)?\s*(\d+\s*)?Reviews?.*$/i, "").trim();
    out.location = first('[class*="jhc__location"] a', '[class*="location"] a', '[class*="jhc__location"]').split(/\n/)[0].trim();
    const jd = firstEl('[class*="dang-inner-html"]', 'section[class*="job-desc"]', '[class*="JDC__job-desc"]', '.job-desc', '[class*="job-desc"]');
    if (jd) {
      // keep "Role / Industry / Key skills" details that Naukri lists under the description
      const details = text(document.querySelector('[class*="other-details"]'));
      // key-skill tags sit side by side with no separator - read each tag on its own
      const skills = [...new Set([...document.querySelectorAll('[class*="key-skill"] a, [class*="key-skill"] span[class*="chip"], [class*="key-skill"] [class*="chip"]')].map(text).filter((t) => t && t.length < 60))];
      out.jd = clean(text(jd) + (details ? "\n\n" + details : "") + (skills.length ? "\n\nKey skills: " + skills.join(", ") : ""));
      out.how = "page";
    }
  }

  // ---------- Any other careers page: the biggest block of readable text ----------
  if (!out.jd && !out.noGuess) {
    let best = null, score = 0;
    for (const el of document.querySelectorAll("main, article, section, [role=main], div")) {
      if (el.closest("nav, header, footer, aside")) continue;
      const t = el.innerText || "";
      if (t.length < 400) continue;
      const blocks = el.querySelectorAll("p, li").length;
      const links = el.querySelectorAll("a").length;
      const s = Math.min(t.length, 12000) / 100 + blocks * 3 - links * 2;
      if (s > score) { score = s; best = el; }
    }
    if (best) { out.jd = text(best); out.how = "guess"; }
    out.role = out.role || first("h1");
    out.company = out.company || (document.querySelector('meta[property="og:site_name"]')?.content || "").trim();
  }

  // ---------- Company logo and website (for Jobcraft's company identity) ----------
  const key = (t) => (t || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  const ck = key(out.company);
  if (ck.length >= 2) {
    // the logo image the site shows for this company (alt text names the company)
    const logo = [...document.querySelectorAll("img")]
      .filter((i) => key(i.alt).includes(ck) && /logo|company/i.test(i.alt || "") && (i.currentSrc || i.src).startsWith("https://"))
      .sort((x, y) => (y.naturalWidth || y.width) - (x.naturalWidth || x.width))[0];
    if (logo) out.logoUrl = logo.currentSrc || logo.src;
    // a link the page labels as the company's website (Naukri shows "<Company> website")
    const boards = /(linkedin|licdn|naukri|naukimg|infoedge|ambitionbox|indeed|glassdoor|google|facebook|twitter|x\.com|instagram|youtube|apple|play\.)/i;
    const site = [...document.querySelectorAll('a[href^="http"]')].find((l) => /website/i.test(l.innerText || l.getAttribute("aria-label") || "") && !boards.test(l.href));
    if (site) out.website = site.href;
  }

  // The user's highlighted text always wins - it's what they chose.
  if (selection.split(/\s+/).length >= 30) { out.jd = selection; out.how = "selection"; }

  out.jd = out.jd.slice(0, 30000);
  out.words = out.jd ? out.jd.split(/\s+/).filter(Boolean).length : 0;
  return out;
}
