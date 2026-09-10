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
    const heading = makeElement("h2", "bookmark-title", bookmark.title || bookmark.searchId || bookmark.league || "");
    const meta = makeElement("div", "bookmark-meta");
    meta.appendChild(makeElement("span", "realm-badge", getRealmLabel(bookmark)));
    if (bookmark.league) {
      meta.appendChild(makeElement("span", "league-badge", bookmark.league));
    }

    content.appendChild(heading);
    content.appendChild(meta);

    if (Array.isArray(bookmark.filters) && bookmark.filters.length) {
      const filtersWrap = makeElement("div", "bookmark-filters");
      for (const mod of bookmark.filters) {
        filtersWrap.appendChild(makeElement("span", "filter-chip", mod));
      }
      content.appendChild(filtersWrap);
    }

    const actions = makeElement("div", "bookmark-actions");
    actions.appendChild(createButton(message("jump", "Open"), "button button-primary", (e) => {
      const url = PTB.buildTradeUrl(bookmark);
      if (e && (e.ctrlKey || e.metaKey)) chrome.tabs.create({ url });
      else navigateActiveTab(url);
    }));
    actions.appendChild(createButton(message("rename", "Rename"), "button", async () => {
      const title = prompt(message("rename", "Rename"), bookmark.title || "");
      if (!title || !title.trim()) {
        return;
      }
      await PTB.storage.update(bookmark.id, { title: title.trim() });
      await refresh();
    }));
    actions.appendChild(createButton(message("delete", "Delete"), "button button-danger", async () => {
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
    const dashBtn = document.getElementById("open-dash");
    if (dashBtn) dashBtn.textContent = message("openDashboard", "📡 라이브 대시보드");
  }

  function setupLangSelect() {
    const sel = document.getElementById("lang-select");
    if (!sel || !globalThis.PTB || !PTB.i18n) return;
    PTB.i18n.LANGS.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = PTB.i18n.LANG_NAMES[code] || code;
      if (code === PTB.i18n.getLang()) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      PTB.i18n.setLang(sel.value); // onChange 콜백이 재렌더 담당
    });
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
        const sel = document.getElementById("lang-select");
        if (sel) sel.value = PTB.i18n.getLang();
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

    const dashBtn = document.getElementById("open-dash");
    if (dashBtn) {
      dashBtn.addEventListener("click", async () => {
        try {
          const game = await getActiveGame();
          const url = chrome.runtime.getURL("src/dashboard/dashboard.html") + (game ? `?game=${game}` : "");
          chrome.tabs.create({ url });
        } catch (_error) {
          // ignore
        }
      });
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
