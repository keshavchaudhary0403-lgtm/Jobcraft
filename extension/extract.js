/**
 * Runs inside the job page the user is looking at, only when they click the extension.
 * Reads that one page: company, role, location, link and the job description. Nothing else.
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
    const id = new URLSearchParams(location.search).get("currentJobId") || (location.pathname.match(/\/jobs\/view\/(\d+)/) || [])[1];
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
    if (!out.jd) {
      const head = [...document.querySelectorAll("h2, h3")].find((e) => /^about the job$/i.test((e.innerText || "").trim()));
      if (head) {
        let box = head;
        while (box && (box.innerText || "").split(/\s+/).length < 80) box = box.parentElement;
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
    const parts = document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*\|\s*LinkedIn\s*$/i, "").split(/\s*\|\s*/);
    if (!out.role && parts.length >= 2) out.role = parts[0];
    if (!out.company && parts.length >= 2) out.company = parts[1];
    if (!out.location && out.role) {
      let pane = document.querySelector("h2") && [...document.querySelectorAll("h2")].find((e) => /^about the job$/i.test((e.innerText || "").trim()));
      while (pane && !(pane.innerText || "").includes(out.role)) pane = pane.parentElement;
      const line = [...(pane || document).querySelectorAll("p, span, div")].find((e) => {
        const t = (e.innerText || "").trim();
        return e.children.length < 8 && t.length < 160 && /·/.test(t) && /(ago|applicant|clicked apply|reposted|promoted)/i.test(t);
      });
      if (line) out.location = line.innerText.split("·")[0].trim();
    }
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
  if (!out.jd) {
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

  // The user's highlighted text always wins - it's what they chose.
  if (selection.split(/\s+/).length >= 30) { out.jd = selection; out.how = "selection"; }

  out.jd = out.jd.slice(0, 30000);
  out.words = out.jd ? out.jd.split(/\s+/).filter(Boolean).length : 0;
  return out;
}
