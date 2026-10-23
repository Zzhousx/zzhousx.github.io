(() => {
  "use strict";
  const p = window.PROFILE;
  const messages = window.TRANSLATIONS;
  const $ = id => document.getElementById(id);
  // Start in English every time, regardless of browser language or past visits.
  let language = "en";
  let filter = "all";
  const openCitations = new Set();
  const t = key => messages[language][key] || messages.en[key] || key;
  const local = (item, key) => language === "zh" && item[key + "Zh"] ? item[key + "Zh"] : item[key] || "";
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const safeURL = raw => {
    if (!raw || typeof raw !== "string") return "";
    try {
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const link = (label, url, cls) => {
    const href = safeURL(url);
    if (!href) return null;
    const a = el("a", cls, label);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  };

  function renderProfile() {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = local(p, "name") + " | " + t("pageTitle");
    document.querySelector('meta[name="description"]').content = local(p, "intro");
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
      button.setAttribute("aria-label", t(button.dataset.language === "en" ? "english" : "chinese"));
    });
    ["name", "footer-name"].forEach(id => { $(id).textContent = local(p, "name"); });
    ["role", "affiliation", "location", "intro"].forEach(id => { $(id).textContent = local(p, id); });
    $("year").textContent = new Date().getFullYear();
    $("updated").textContent = local(p, "updated");
    $("social").replaceChildren();
    [["ORCID", p.links.orcid], ["DBLP", p.links.dblp], [t("scholar"), p.links.scholar]].forEach(([label, url]) => {
      const a = link(label, url);
      if (a) $("social").append(a);
    });
    const cv = safeURL(p.cv);
    $("cv").hidden = !cv;
    if (cv) $("cv").href = cv;

    $("news-list").replaceChildren();
    p.news.forEach(item => {
      const row = el("div", "news-item"), body = el("p");
      const text = local(item, "text");
      body.append(link(text, item.url) || document.createTextNode(text));
      row.append(el("time", "news-date", item.date), body);
      $("news-list").append(row);
    });
    $("news").hidden = !p.news.length;

    $("experience").hidden = !p.education.length;
    document.querySelector('nav a[href="#experience"]').hidden = !p.education.length;
    $("education-list").replaceChildren();
    p.education.forEach(item => {
      const row = el("article", "timeline-item"), body = el("div");
      body.append(el("h3", "", local(item, "title")), el("p", "", local(item, "place")));
      row.append(el("time", "", item.date), body);
      $("education-list").append(row);
    });
    $("service").hidden = !p.service.length;
    $("service-list").replaceChildren();
    p.service.forEach(item => {
      const row = el("div", "service-item");
      row.append(el("h3", "", local(item, "title")), el("p", "", local(item, "text")));
      $("service-list").append(row);
    });
    $("patent-list").replaceChildren();
    (p.patents || []).forEach((item, index) => {
      const row = el("article", "patent-item"), body = el("div");
      row.append(el("span", "patent-number", String(index + 1).padStart(2, "0")), body);
      body.append(el("h3", "", local(item, "title")));
      const inventors = el("p", "patent-inventors");
      const names = local(item, "inventors").split(language === "zh" ? "、" : ", ");
      names.forEach((name, i) => {
        if (i) inventors.append(document.createTextNode(language === "zh" ? "、" : ", "));
        inventors.append(name === local(p, "name") ? el("strong", "", name) : document.createTextNode(name));
      });
      body.append(inventors);
      if (item.reference) body.append(el("p", "patent-reference", t("reference") + item.reference));
      $("patent-list").append(row);
    });
    $("patents").hidden = !(p.patents || []).length;
    const awards = p.awards || [];
    $("awards").hidden = !awards.length;
    $("award-list").replaceChildren();
    awards.forEach(item => {
      const row = el("article", "award-item"), body = el("div");
      body.append(el("h3", "", local(item, "title")));
      const event = el("p");
      event.append(link(local(item, "event"), item.url) || document.createTextNode(local(item, "event")));
      body.append(event);
      row.append(el("time", "award-date", item.date), body);
      $("award-list").append(row);
    });
    $("contact-affiliation").replaceChildren();
    ["role", "affiliation", "location"].forEach((field, index) => {
      if (index) $("contact-affiliation").append(el("br"));
      $("contact-affiliation").append(document.createTextNode(local(p, field)));
    });
    $("contact-email").replaceChildren();
    const validEmail = p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
    $("contact").hidden = !validEmail;
    if (validEmail) {
      const a = el("a", "email-link", p.email);
      a.href = "mailto:" + p.email;
      $("contact-email").append(a);
    }
    renderPapers();
  }

  function citationPanel(paper) {
    const panel = el("div", "citation-panel");
    const pre = el("pre", "", paper.bibtex);
    pre.lang = "en";
    const copy = el("button", "copy-button", t("copy"));
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(paper.bibtex);
        copy.textContent = t("copied");
        setTimeout(() => { copy.textContent = t("copy"); }, 1800);
      } catch {
        const selection = getSelection(), range = document.createRange();
        range.selectNodeContents(pre);
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = t("copyFallback");
      }
    });
    panel.append(pre, copy);
    return panel;
  }

  function renderPapers() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const papers = [...p.publications].sort((a, b) => b.year - a.year).filter(paper =>
      (filter === "all" || paper.type === filter) &&
      [paper.title, paper.titleZh, paper.authors, paper.venue, paper.year].join(" ").toLocaleLowerCase().includes(query)
    );
    $("publication-list").replaceChildren();
    if (!papers.length) {
      $("publication-list").append(el("p", "no-results", t("noResults")));
      return;
    }
    papers.forEach(paper => {
      const key = paper.key || paper.doi;
      const row = el("article", "publication"), body = el("div");
      row.append(el("span", "pub-year", String(paper.year)), body);
      body.append(el("h3", "", local(paper, "title")));
      if (language === "zh" && paper.titleZh) {
        const original = el("p", "pub-original-title", paper.title);
        original.lang = "en";
        body.append(original);
      }
      const authors = el("p", "pub-authors");
      authors.lang = "en";
      paper.authors.split(", ").forEach((name, index) => {
        if (index) authors.append(document.createTextNode(", "));
        authors.append(name === p.name ? el("strong", "", name) : document.createTextNode(name));
        if ((paper.correspondingAuthors || []).includes(name)) authors.append(el("sup", "", "*"));
      });
      const venue = el("p", "pub-venue", paper.venue);
      venue.lang = "en";
      body.append(authors, venue);
      const links = el("div", "pub-links");
      [["PDF", paper.pdf], ["DOI", paper.doi]].forEach(([label, url]) => {
        const a = link(label, url);
        if (a) links.append(a);
      });
      if (paper.bibtex) {
        const button = el("button", "", t("cite"));
        button.type = "button";
        button.setAttribute("aria-label", t("citeLabel") + local(paper, "title"));
        button.setAttribute("aria-expanded", String(openCitations.has(key)));
        button.addEventListener("click", () => {
          const panel = body.querySelector(".citation-panel");
          if (panel) {
            panel.remove();
            openCitations.delete(key);
          } else {
            body.append(citationPanel(paper));
            openCitations.add(key);
          }
          button.setAttribute("aria-expanded", String(openCitations.has(key)));
        });
        links.append(button);
      }
      body.append(links);
      if (openCitations.has(key)) body.append(citationPanel(paper));
      $("publication-list").append(row);
    });
  }

  if (p.portrait && safeURL(p.portrait)) {
    const img = el("img");
    img.src = safeURL(p.portrait);
    img.alt = p.name;
    img.width = 1179;
    img.height = 1179;
    img.onerror = () => { $("portrait").hidden = true; };
    $("portrait").replaceChildren(img);
    $("portrait").hidden = false;
  }
  document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => {
      const next = button.dataset.language;
      if (!["en", "zh"].includes(next) || next === language) return;
      language = next;
      renderProfile();
    });
  });
  $("filters").addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    document.querySelectorAll("#filters button").forEach(node => {
      node.classList.toggle("selected", node === button);
      node.setAttribute("aria-pressed", String(node === button));
    });
    renderPapers();
  });
  $("search").addEventListener("input", renderPapers);
  renderProfile();
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll("nav a").forEach(a => {
          const active = a.hash === "#" + entry.target.id;
          a.classList.toggle("active", active);
          if (active) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-15% 0px -60% 0px", threshold: 0 });
    ["about", "publications", "experience", "patents", "awards", "contact"].forEach(id => {
      if (!$(id).hidden) observer.observe($(id));
    });
  }
})();
