(function () {
  const { PTB } = globalThis;
  const listEl = document.getElementById("list");
  const titleEl = document.getElementById("popup-title");

  function message(key, fallback) {
    if (globalThis.PTB && PTB.i18n) return PTB.i18n.t(key, fallback);
    return globalThis.chrome?.i18n?.getMessage?.(key) || fallback || key;
  }

  function makeElement(tagName, className, text) {
    const el = document.createElement(tagName);
    if (className) {
      el.className = className;
    }
    if (text !== undefined) {
      el.textContent = text;
    }
    return el;
  }

  function clearList() {
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }
  }

  function setEmptyState() {
    clearList();
    listEl.appendChild(makeElement("p", "empty-state", message("emptyList", "No bookmarks yet.")));
  }

  function getRealmLabel(bookmark) {
    return globalThis.PTB && PTB.realmLabel
      ? PTB.realmLabel(bookmark.realm)
      : (bookmark.realm || "").toUpperCase();
  }

  function createIcon(bookmark) {
    const iconWrap = makeElement("div", "bookmark-icon");

    if (bookmark.iconUrl) {
      const img = document.createElement("img");
      img.src = bookmark.iconUrl;
      img.alt = "";
      img.loading = "lazy";
      iconWrap.appendChild(img);
      return iconWrap;
    }

    iconWrap.textContent = (bookmark.title || bookmark.league || "?").trim().slice(0, 1).toUpperCase();
    return iconWrap;
  }

  function createButton(label, className, onClick) {
    const button = makeElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  const ICO = {
    chevronsRight: [
      ["path", { d: "m6 17 5-5-5-5" }],
      ["path", { d: "m13 17 5-5-5-5" }],
    ],
    trash: [
      ["path", { d: "M10 11v6" }],
      ["path", { d: "M14 11v6" }],
      ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
      ["path", { d: "M3 6h18" }],
      ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
    ],
    pencil: [
      ["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }],
      ["path", { d: "m15 5 4 4" }],
    ],
    globe: [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }],
      ["path", { d: "M2 12h20" }],
    ],
  };

  function lucideEl(name, size) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 16));
    svg.setAttribute("height", String(size || 16));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    (ICO[name] || []).forEach((item) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", item[0]);
      const attrs = item[1] || {};
      Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
      svg.appendChild(node);
    });
    return svg;
  }

  function iconButton(className, name, title, onClick) {
    const button = makeElement("button", className);
    button.type = "button";
    button.title = title;
    button.appendChild(lucideEl(name));
    button.addEventListener("click", onClick);
    return button;
  }

  // 기본은 현재(활성) 탭에서 이동, Ctrl/⌘+클릭은 새 탭.
  function navigateActiveTab(url) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const t = tabs && tabs[0];
        if (t && t.id != null) chrome.tabs.update(t.id, { url });
        else chrome.tabs.create({ url });
      });
    } catch (_e) {
      chrome.tabs.create({ url });
    }
  }

  function getActiveGame() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const url = tabs && tabs[0] && tabs[0].url;
          resolve(PTB.gameFromUrl ? PTB.gameFromUrl(url || "") : PTB.parseTradeUrl(url || "")?.game || null);
        });
      } catch (_e) {
        resolve(null);
      }
    });
  }

  async function refresh() {
    const items = await PTB.storage.list(await getActiveGame());

    if (!items.length) {
      setEmptyState();
      return;
    }

    clearList();
    for (const bookmark of items) listEl.appendChild(createBookmarkCard(bookmark));
  }

  function createBookmarkCard(bookmark) {
    const card = makeElement("article", "bookmark-card");

    const content = makeElement("div", "bookmark-content");
    const nameRow = makeElement("div", "bookmark-namerow");
    const heading = makeElement("h2", "bookmark-title", bookmark.title || bookmark.searchId || bookmark.league || "");
    const pencil = iconButton("bookmark-pencil", "pencil", message("rename", "Rename"), () => {
      if (heading.querySelector("input")) return;
      const orig = bookmark.title || "";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "bookmark-title-input";
      input.value = orig;
      let done = false;
      const end = async (save) => {
        if (done) return;
        done = true;
        const next = input.value.trim();
        if (save && next && next !== orig) {
          await PTB.storage.update(bookmark.id, { title: next });
          await refresh();
          return;
        }
        heading.textContent = orig || bookmark.searchId || bookmark.league || "";
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          end(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          end(false);
        }
      });
      input.addEventListener("blur", () => end(true));
      heading.textContent = "";
      heading.appendChild(input);
      input.focus();
      input.select();
    });
    nameRow.appendChild(pencil);
    nameRow.appendChild(heading);
    const meta = makeElement("div", "bookmark-meta");
    if (bookmark.lowPrice && bookmark.lowPrice.amount != null && bookmark.lowPrice.currency) {
      const amt = Number(bookmark.lowPrice.amount);
      const shown = Number.isFinite(amt) && Math.abs(amt - Math.round(amt)) < 1e-9
        ? String(Math.round(amt))
        : String(amt);
      meta.appendChild(makeElement("span", "bookmark-low", shown + " " + bookmark.lowPrice.currency));
    }
    meta.appendChild(makeElement("span", "realm-badge", getRealmLabel(bookmark)));
    if (bookmark.league) {
      meta.appendChild(makeElement("span", "league-badge", bookmark.league));
    }

    content.appendChild(meta);
    content.appendChild(nameRow);

    if (Array.isArray(bookmark.filters) && bookmark.filters.length) {
      const filtersWrap = makeElement("div", "bookmark-filters");
      for (const mod of bookmark.filters) {
        filtersWrap.appendChild(makeElement("span", "filter-chip", mod));
      }
      content.appendChild(filtersWrap);
    }

    const actions = makeElement("div", "bookmark-actions");
    actions.appendChild(iconButton("button button-primary", "chevronsRight", message("jump", "Go to search"), (e) => {
      const url = PTB.buildTradeUrl(bookmark);
      if (e && (e.ctrlKey || e.metaKey)) chrome.tabs.create({ url });
      else navigateActiveTab(url);
    }));
    actions.appendChild(iconButton("button button-danger", "trash", message("delete", "Delete"), async () => {
      await PTB.storage.remove(bookmark.id);
      await refresh();
    }));

    card.appendChild(createIcon(bookmark));
    card.appendChild(content);
    card.appendChild(actions);
    return card;
  }

  function applyStaticLabels() {
    if (titleEl) titleEl.textContent = message("popupTitle", "PoE Trade Bookmark");
    const btn = document.querySelector(".lang-btn");
    if (btn) btn.title = message("language", "Language");
  }

  function setupLangSelect() {
    const wrap = document.getElementById("lang-wrap");
    if (!wrap || !globalThis.PTB || !PTB.i18n) return;
    wrap.textContent = "";
    const btn = makeElement("button", "lang-btn");
    btn.type = "button";
    btn.title = message("language", "Language");
    btn.appendChild(lucideEl("globe"));
    const menu = makeElement("div", "lang-menu");
    menu.hidden = true;
    const fill = () => {
      menu.textContent = "";
      const cur = PTB.i18n.getLang();
      PTB.i18n.LANGS.forEach((code) => {
        const item = makeElement("button", "lang-opt" + (code === cur ? " ptb-on" : ""), PTB.i18n.LANG_NAMES[code] || code);
        item.type = "button";
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          PTB.i18n.setLang(code);
          menu.hidden = true;
        });
        menu.appendChild(item);
      });
    };
    fill();
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = true;
      if (open) {
        fill();
        menu.hidden = false;
      }
    });
    document.addEventListener("click", () => {
      menu.hidden = true;
    });
    wrap.appendChild(btn);
    wrap.appendChild(menu);
  }

  async function init() {
    if (globalThis.PTB && PTB.i18n) {
      try {
        await PTB.i18n.init();
      } catch (_e) {
        // ignore
      }
      PTB.i18n.onChange(() => {
        applyStaticLabels();
        refresh().catch(() => {});
      });
    }

    applyStaticLabels();
    setupLangSelect();

    try {
      const game = await getActiveGame();
      document.documentElement.classList.toggle("ptb-game-poe2", game === "poe2");
      document.body.classList.toggle("ptb-game-poe2", game === "poe2");
    } catch (_e) {
      // ignore
    }

    try {
      await refresh();
    } catch (error) {
      console.error(error);
      setEmptyState();
    }
  }

  init();
}());
