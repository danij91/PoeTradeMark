(() => {
  "use strict";

  const BUTTON_ID = "ptb-bookmark-button";
  const BUTTON_CLASS = "ptb-bookmark-button";
  const SAVED_CLASS = "ptb-is-saved";
  const BUSY_CLASS = "ptb-is-busy";
  const URL_POLL_MS = 1000;
  const FEEDBACK_MS = 1400;

  const state = {
    button: null,
    href: "",
    saving: false,
    feedbackTimer: 0,
    sidebar: null,
    sidebarOpen: false,
  };

  const message = (key, fallback) => {
    try {
      const getMessage = globalThis.chrome?.i18n?.getMessage;
      return (typeof getMessage === "function" && getMessage(key)) || fallback;
    } catch (_error) {
      return fallback;
    }
  };

  const parseCurrentUrl = () => {
    try {
      const parseTradeUrl = globalThis.PTB?.parseTradeUrl;
      if (typeof parseTradeUrl !== "function") {
        return null;
      }

      const info = parseTradeUrl(globalThis.location?.href || "");
      return info && info.searchId ? info : null;
    } catch (_error) {
      return null;
    }
  };

  const cleanText = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const queryOne = (root, selectors) => {
    for (const selector of selectors) {
      try {
        const match = root.querySelector(selector);
        if (match) {
          return match;
        }
      } catch (_error) {
        return null;
      }
    }

    return null;
  };

  // 거래소 결과 DOM(KR poe.kakaogames.com / 글로벌 동일 코드베이스)에 맞춘 셀렉터.
  // 결과 1행 = `.resultset .row[data-id]`, 아이콘 = 그 안의 `.icon img`(…/gen/image/…),
  // 제목 = `.item-popup__header-line`(첫 줄 = 아이템명). 사이트 로고를 피하려 행 내부로 한정.
  const RESULT_ROW_SELECTORS = [
    ".resultset .row[data-id]",
    ".results .row[data-id]",
    ".row[data-id]",
    ".resultset .row",
    ".search-results .row",
  ];

  const ICON_SELECTORS = [
    ".icon img",
    ".iconContainer img",
    "img[src*='/gen/image/']",
    "img[src*='poecdn']",
  ];

  // 검색창에 입력/선택된 아이템명. 라이브 확인: `.search-left input`의 value 속성에 들어있음
  // (`.multiselect__single` 아님). 결과 첫 행 이름과 다를 수 있어(예: 결과 "삿된 ..." vs 검색 "비스 모티스 ...")
  // 사용자가 검색한 이름을 우선한다.
  const readSearchTitle = () => {
    try {
      const sl =
        document.querySelector(".search-panel .search-left") ||
        document.querySelector(".search-left");
      if (!sl) return "";
      const input =
        sl.querySelector("input.multiselect__input") || sl.querySelector("input");
      const fromInput = cleanText(input?.value);
      if (fromInput) return fromInput;
      const single = sl.querySelector(".multiselect__single");
      return cleanText(single?.textContent);
    } catch (_error) {
      return "";
    }
  };

  // 아이템 유형 필터값. 검색창에 이름이 없을 때 제목 폴백으로 사용. "모두"면 빈 문자열.
  const readItemType = () => {
    try {
      const filters = document.querySelectorAll(".search-advanced .filter");
      for (const f of filters) {
        const t = f.querySelector(".filter-title");
        if (!t || cleanText(t.textContent).indexOf("아이템 유형") !== 0) continue;
        const single = f.querySelector(".multiselect.modified .multiselect__single");
        const v = cleanText(single?.textContent);
        if (v && v !== "모두") return v;
      }
    } catch (_error) {
      // best-effort
    }
    return "";
  };

  // 적용된 필터들(스탯 + 그 외)을 사람이 읽는 문자열로. 라이브 확인:
  //  - 스탯 모드(.mutate-type 보유) → 모드 텍스트 자체("소환수가 불경한 힘 보유").
  //  - 그 외(방어구/홈/희귀도 등) → "필터명: 값"(.modified 인 select/input 만). 툴팁(.filter-tip) 제거.
  const captureFilters = () => {
    try {
      const cleanLabel = (el) => {
        if (!el) return "";
        const clone = el.cloneNode(true);
        clone.querySelectorAll(".filter-tip, .mutate-type").forEach((n) => n.remove());
        return cleanText(clone.textContent);
      };
      const out = [];
      const filters = document.querySelectorAll(".search-advanced .filter");
      for (const f of filters) {
        const titleEl = f.querySelector(".filter-title");
        const name = cleanLabel(titleEl);
        if (!name || name.charAt(0) === "+") continue;
        const vals = [];
        f.querySelectorAll(".multiselect.modified .multiselect__single").forEach((s) => {
          const v = cleanText(s.textContent);
          if (v) vals.push(v);
        });
        // 스탯 모드의 오른쪽 min/max 등 값 박스(.modified)까지 캡처
        f.querySelectorAll("input.modified").forEach((i) => {
          if (i.value) vals.push((i.placeholder ? i.placeholder + " " : "") + i.value);
        });
        let label = "";
        if (titleEl.querySelector(".mutate-type")) {
          label = vals.length ? name + ": " + vals.join(", ") : name; // 스탯 모드 = 모드 텍스트(+값)
        } else if (vals.length) {
          label = name + ": " + vals.join(", ");
        }
        if (label && !out.includes(label)) out.push(label);
      }
      return out;
    } catch (_error) {
      return [];
    }
  };

  const captureResultDetails = () => {
    try {
      const row = queryOne(document, RESULT_ROW_SELECTORS);
      const scope = row || document;
      const icon = queryOne(scope, ICON_SELECTORS);
      const iconUrl = icon?.getAttribute("src") || null;
      // 제목: 검색창 입력값 → 아이템 유형(모두 제외) → "제목 없음"
      const title =
        readSearchTitle() || readItemType() || message("noTitle", "제목 없음");
      const filters = captureFilters();
      return { title, iconUrl, filters };
    } catch (_error) {
      return { title: message("noTitle", "제목 없음"), iconUrl: null, filters: [] };
    }
  };

  const setButtonText = (button, text) => {
    try {
      button.textContent = text;
      button.setAttribute("aria-label", text);
      button.title = text;
    } catch (_error) {
      // Ignore transient DOM teardown while the SPA swaps routes.
    }
  };

  const showSavedFeedback = () => {
    const button = state.button;
    if (!button) {
      return;
    }

    const label = message("saved", "Saved");
    clearTimeout(state.feedbackTimer);
    button.classList.add(SAVED_CLASS);
    setButtonText(button, label);

    state.feedbackTimer = setTimeout(() => {
      try {
        button.classList.remove(SAVED_CLASS);
        button.disabled = false;
        setButtonText(button, message("bookmarkButton", "Bookmark"));
      } catch (_error) {
        // The button may have been removed after a route change.
      }
    }, FEEDBACK_MS);
  };

  const handleSave = async (event) => {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (_error) {
      // Click events from the extension button should be cancelable, but do not depend on it.
    }

    if (state.saving) {
      return;
    }

    const info = parseCurrentUrl();
    const storage = globalThis.PTB?.storage;
    if (!info || typeof storage?.add !== "function") {
      reconcile();
      return;
    }

    state.saving = true;

    try {
      const button = ensureButton();
      if (button) {
        button.disabled = true;
        button.classList.add(BUSY_CLASS);
      }

      const { title, iconUrl, filters } = captureResultDetails();
      await storage.add({
        ...info,
        title,
        iconUrl,
        filters,
        query: null,
        sort: null,
      });

      showSavedFeedback();
    } catch (_error) {
      const button = state.button;
      if (button) {
        button.disabled = false;
        setButtonText(button, message("bookmarkButton", "Bookmark"));
      }
    } finally {
      state.saving = false;
      if (state.button) {
        state.button.classList.remove(BUSY_CLASS);
      }
    }
  };

  function ensureButton() {
    try {
      if (!document.body) {
        return null;
      }

      let button = state.button || document.getElementById(BUTTON_ID);
      if (!button) {
        button = document.createElement("button");
        button.id = BUTTON_ID;
        button.type = "button";
        button.className = BUTTON_CLASS;
        button.addEventListener("click", handleSave);
        document.body.appendChild(button);
      }

      state.button = button;
      button.hidden = false;
      if (!state.saving && !button.classList.contains(SAVED_CLASS)) {
        button.disabled = false;
        setButtonText(button, message("bookmarkButton", "Bookmark"));
      }

      return button;
    } catch (_error) {
      return null;
    }
  }

  const hideButton = () => {
    try {
      if (state.button) {
        state.button.hidden = true;
      }
    } catch (_error) {
      // Ignore DOM detach during navigation.
    }
  };

  function reconcile() {
    try {
      const href = globalThis.location?.href || "";
      const info = parseCurrentUrl();
      state.href = href;

      if (info) {
        ensureButton();
      } else {
        hideButton();
      }
    } catch (_error) {
      hideButton();
    }
  }

  const scheduleReconcile = () => {
    globalThis.setTimeout(reconcile, 0);
  };

  const patchHistory = () => {
    try {
      for (const method of ["pushState", "replaceState"]) {
        const original = globalThis.history?.[method];
        if (typeof original !== "function") {
          continue;
        }

        globalThis.history[method] = function patchedHistoryMethod(...args) {
          const result = original.apply(this, args);
          scheduleReconcile();
          return result;
        };
      }
    } catch (_error) {
      // Polling still covers SPA URL changes.
    }
  };

  // ── 우측 고정 즐겨찾기 사이드바 (페이지 내 도킹 패널) ──────────────
  const SIDEBAR_TOGGLE_ID = "ptb-sidebar-toggle";
  const SIDEBAR_OPEN_KEY = "ptbSidebarOpen";

  const sbEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const openTradeUrl = (bookmark) => {
    try {
      const buildTradeUrl = globalThis.PTB?.buildTradeUrl;
      if (typeof buildTradeUrl === "function") {
        globalThis.open(buildTradeUrl(bookmark), "_blank", "noopener");
      }
    } catch (_error) {
      // ignore
    }
  };

  const buildSidebarRow = (bookmark) => {
    const row = sbEl("div", "ptb-sb-row");

    const thumb = sbEl("div", "ptb-sb-thumb");
    if (bookmark.iconUrl) {
      const img = document.createElement("img");
      img.src = bookmark.iconUrl;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      thumb.textContent = cleanText(bookmark.title || "?").slice(0, 1);
    }

    const main = sbEl("div", "ptb-sb-main");
    main.appendChild(sbEl("div", "ptb-sb-title", bookmark.title || bookmark.searchId || ""));
    main.appendChild(
      sbEl(
        "span",
        "ptb-sb-realm",
        bookmark.realm === "kr" ? message("realmKR", "KR") : message("realmGlobal", "Global")
      )
    );
    if (Array.isArray(bookmark.filters) && bookmark.filters.length) {
      const fwrap = sbEl("div", "ptb-sb-filters");
      for (const mod of bookmark.filters) fwrap.appendChild(sbEl("span", "ptb-sb-chip", mod));
      if (bookmark.filters.length >= 3) {
        // 필터 3개 이상이면 접어두고 토글로 펼침
        fwrap.classList.add("ptb-collapsed");
        const fToggle = sbEl("button", "ptb-sb-fbtn", `필터 ${bookmark.filters.length}개 ▾`);
        fToggle.type = "button";
        fToggle.addEventListener("click", () => {
          const collapsed = fwrap.classList.toggle("ptb-collapsed");
          fToggle.textContent = collapsed
            ? `필터 ${bookmark.filters.length}개 ▾`
            : "접기 ▴";
        });
        main.appendChild(fToggle);
      }
      main.appendChild(fwrap);
    }

    const actions = sbEl("div", "ptb-sb-actions");
    const jumpBtn = sbEl("button", "ptb-sb-btn ptb-sb-jump", message("jump", "Open"));
    jumpBtn.type = "button";
    jumpBtn.addEventListener("click", () => openTradeUrl(bookmark));
    const renameBtn = sbEl("button", "ptb-sb-btn", message("rename", "Rename"));
    renameBtn.type = "button";
    renameBtn.addEventListener("click", async () => {
      try {
        const next = globalThis.prompt(message("rename", "Rename"), bookmark.title || "");
        if (next && next.trim()) await PTB.storage.update(bookmark.id, { title: next.trim() });
      } catch (_error) {
        // ignore
      }
    });
    const deleteBtn = sbEl("button", "ptb-sb-btn ptb-sb-del", message("delete", "Delete"));
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", async () => {
      try {
        await PTB.storage.remove(bookmark.id);
      } catch (_error) {
        // ignore
      }
    });
    const liveBtn = sbEl(
      "button",
      "ptb-sb-btn ptb-sb-live" + (isLive(bookmark.searchId) ? " ptb-on" : ""),
      isLive(bookmark.searchId) ? "📡 ON" : "📡 라이브"
    );
    liveBtn.type = "button";
    liveBtn.addEventListener("click", () => {
      const ok = setBookmarkLive(bookmark, !isLive(bookmark.searchId));
      if (!ok) {
        liveBtn.textContent = `최대 ${LIVE_MAX}개`;
        setTimeout(() => { if (state.sidebarOpen) renderSidebarList(); }, 1200);
      }
    });
    actions.appendChild(jumpBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(liveBtn);

    row.appendChild(thumb);
    row.appendChild(main);
    row.appendChild(actions);
    return row;
  };

  const renderSidebarList = async () => {
    try {
      const list = state.sidebar && state.sidebar.querySelector(".ptb-sb-list");
      if (!list) return;
      const items = await PTB.storage.list();
      list.textContent = "";
      if (!items.length) {
        list.appendChild(sbEl("p", "ptb-sb-empty", message("emptyList", "No bookmarks yet.")));
        return;
      }
      for (const bookmark of items) list.appendChild(buildSidebarRow(bookmark));
    } catch (_error) {
      // best-effort
    }
  };

  const ensureSidebar = () => {
    if (state.sidebar && document.body && document.body.contains(state.sidebar)) {
      return state.sidebar;
    }
    if (!document.body) return null;
    const sidebar = sbEl("aside", "ptb-sidebar");
    const header = sbEl("div", "ptb-sb-header");
    header.appendChild(sbEl("span", "ptb-sb-h-title", message("popupTitle", "Bookmarks")));
    const dashBtn = sbEl("button", "ptb-sb-dashbtn", message("openDash", "📡 라이브"));
    dashBtn.type = "button";
    dashBtn.addEventListener("click", () => setDashOpen(true));
    header.appendChild(dashBtn);
    const closeBtn = sbEl("button", "ptb-sb-close", "✕");
    closeBtn.type = "button";
    closeBtn.addEventListener("click", () => setSidebarOpen(false));
    header.appendChild(closeBtn);
    sidebar.appendChild(header);
    sidebar.appendChild(sbEl("div", "ptb-sb-list"));
    // 사이드바 위에서 휠을 굴리면 목록만 스크롤(거래소 본문으로 흘려보내지 않음)
    sidebar.addEventListener(
      "wheel",
      (event) => {
        try {
          const list = sidebar.querySelector(".ptb-sb-list");
          if (list) {
            const amount = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
            list.scrollTop += amount;
          }
          event.preventDefault();
          event.stopPropagation();
        } catch (_error) {
          // ignore
        }
      },
      { passive: false }
    );
    document.body.appendChild(sidebar);
    state.sidebar = sidebar;
    return sidebar;
  };

  function setSidebarOpen(open) {
    state.sidebarOpen = open;
    const sidebar = ensureSidebar();
    if (sidebar) sidebar.classList.toggle("ptb-open", open);
    try {
      if (document.body) document.body.classList.toggle("ptb-has-sidebar", open);
    } catch (_error) {
      // ignore
    }
    const toggle = document.getElementById(SIDEBAR_TOGGLE_ID);
    if (toggle) toggle.classList.toggle("ptb-active", open);
    if (open) renderSidebarList();
    try {
      chrome.storage.local.set({ [SIDEBAR_OPEN_KEY]: open });
    } catch (_error) {
      // ignore
    }
  }

  const ensureSidebarToggle = () => {
    if (!document.body || document.getElementById(SIDEBAR_TOGGLE_ID)) return;
    const toggle = sbEl("button", "ptb-sidebar-toggle", message("sidebarToggle", "★ 목록"));
    toggle.id = SIDEBAR_TOGGLE_ID;
    toggle.type = "button";
    toggle.addEventListener("click", () => setSidebarOpen(!state.sidebarOpen));
    document.body.appendChild(toggle);
  };

  const initSidebar = () => {
    try {
      ensureSidebarToggle();
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.bookmarks && state.sidebarOpen) renderSidebarList();
      });
      chrome.storage.local
        .get(SIDEBAR_OPEN_KEY)
        .then((result) => {
          if (result && result[SIDEBAR_OPEN_KEY]) setSidebarOpen(true);
        })
        .catch(() => {});
    } catch (_error) {
      // best-effort
    }
  };

  // ── 라이브검색 대시보드 (풀스크린 · 다중 라이브 집계) ──────────────────
  const LIVE_KEY = "ptbLive";
  const LIVE_MAX = 5; // 동시 라이브 하드캡(실측 확인)
  const live = { set: [], hits: [], dash: null, open: false, status: {} };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch (_e2) {
        return false;
      }
    }
  };

  const sendLiveSet = () => {
    try {
      window.postMessage(
        {
          source: "ptb",
          cmd: "live-set",
          list: live.set.map((x) => ({ league: x.league, searchId: x.searchId })),
        },
        location.origin
      );
    } catch (_e) {
      // ignore
    }
  };

  const persistLive = () => {
    try { chrome.storage.local.set({ [LIVE_KEY]: live.set }); } catch (_e) {}
  };

  const isLive = (searchId) => live.set.some((x) => x.searchId === searchId);
  const sourceTitle = (searchId) => {
    const x = live.set.find((s) => s.searchId === searchId);
    return x ? x.title : searchId;
  };

  // true=처리됨, false=캡 초과로 거부
  function setBookmarkLive(bookmark, on) {
    if (on) {
      if (isLive(bookmark.searchId)) return true;
      if (live.set.length >= LIVE_MAX) return false;
      live.set.push({
        league: bookmark.league,
        searchId: bookmark.searchId,
        title: bookmark.title || bookmark.searchId,
      });
    } else {
      live.set = live.set.filter((x) => x.searchId !== bookmark.searchId);
    }
    persistLive();
    sendLiveSet();
    if (state.sidebarOpen) renderSidebarList();
    if (live.open) renderDash();
    return true;
  }

  const frameColor = (ft) => {
    if (ft === 1) return "#8aa9ff"; // 마법
    if (ft === 2) return "#ffe873"; // 희귀
    if (ft === 3) return "#cf8a3d"; // 고유
    return "#ece3d0"; // 일반/기타
  };

  const buildHitCard = (hit) => {
    const card = sbEl("article", "ptb-dash-card");

    const thumb = sbEl("div", "ptb-dash-thumb");
    if (hit.icon) {
      const img = document.createElement("img");
      img.src = hit.icon;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    }
    card.appendChild(thumb);

    const body = sbEl("div", "ptb-dash-body");
    const head = sbEl("div", "ptb-dash-head");
    const nm = sbEl(
      "span",
      "ptb-dash-name",
      [hit.name, hit.typeLine].filter(Boolean).join(" ").trim() || "?"
    );
    nm.style.color = frameColor(hit.frameType);
    head.appendChild(nm);
    if (hit.corrupted) head.appendChild(sbEl("span", "ptb-dash-corrupt", "타락"));
    body.appendChild(head);

    const meta = sbEl("div", "ptb-dash-meta");
    if (hit.price) meta.appendChild(sbEl("span", "ptb-dash-price", hit.price));
    if (hit.ilvl) meta.appendChild(sbEl("span", "ptb-dash-il", "iLvl " + hit.ilvl));
    meta.appendChild(sbEl("span", "ptb-dash-src", "◈ " + (hit.__source || "")));
    if (hit.account) meta.appendChild(sbEl("span", "ptb-dash-acc", hit.account));
    body.appendChild(meta);

    if (Array.isArray(hit.mods) && hit.mods.length) {
      const mods = sbEl("div", "ptb-dash-mods");
      for (const m of hit.mods) mods.appendChild(sbEl("div", "ptb-dash-mod", m));
      body.appendChild(mods);
    }

    if (hit.whisper) {
      const w = sbEl("button", "ptb-dash-wbtn", message("copyWhisper", "귓속말 복사"));
      w.type = "button";
      w.addEventListener("click", async () => {
        const ok = await copyText(hit.whisper);
        const prev = w.textContent;
        w.textContent = ok ? message("copied", "복사됨!") : "복사 실패";
        setTimeout(() => {
          try { w.textContent = prev; } catch (_e) {}
        }, 1400);
      });
      body.appendChild(w);
    }

    card.appendChild(body);
    return card;
  };

  const renderDash = () => {
    const d = live.dash;
    if (!d) return;
    const chips = d.querySelector(".ptb-dash-searches");
    if (chips) {
      chips.textContent = "";
      if (!live.set.length) {
        chips.appendChild(
          sbEl("span", "ptb-dash-empty2", message("liveNone", "라이브 켠 검색이 없습니다 — 목록에서 📡 로 켜세요"))
        );
      } else {
        for (const s of live.set) {
          const st = live.status[s.searchId];
          const on = st === "auth" || st === "open";
          chips.appendChild(sbEl("span", "ptb-dash-schip" + (on ? " ptb-on" : ""), s.title));
        }
      }
    }
    const list = d.querySelector(".ptb-dash-hits");
    if (list) {
      list.textContent = "";
      if (!live.hits.length) {
        list.appendChild(sbEl("p", "ptb-dash-waiting", message("liveWaiting", "새 매물 대기 중…")));
      } else {
        for (const h of live.hits) list.appendChild(buildHitCard(h));
      }
    }
  };

  function setDashOpen(open) {
    live.open = open;
    const d = ensureDash();
    if (d) d.classList.toggle("ptb-open", open);
    if (open) {
      sendLiveSet();
      renderDash();
    }
  }

  function ensureDash() {
    if (live.dash && document.body && document.body.contains(live.dash)) return live.dash;
    if (!document.body) return null;
    const d = sbEl("div", "ptb-dash");
    const header = sbEl("div", "ptb-dash-header");
    header.appendChild(sbEl("span", "ptb-dash-title", message("liveTitle", "라이브 대시보드")));
    header.appendChild(sbEl("div", "ptb-dash-searches"));
    const close = sbEl("button", "ptb-dash-close", "✕");
    close.type = "button";
    close.addEventListener("click", () => setDashOpen(false));
    header.appendChild(close);
    d.appendChild(header);
    d.appendChild(sbEl("div", "ptb-dash-hits"));
    document.body.appendChild(d);
    live.dash = d;
    return d;
  }

  const onLiveMessage = (d) => {
    if (!d || d.source !== "ptb-live") return;
    if (d.type === "hit" && Array.isArray(d.items)) {
      const src = sourceTitle(d.searchId);
      const stamped = d.items.map((it) => Object.assign({ __source: src }, it));
      live.hits = stamped.concat(live.hits).slice(0, 200);
      if (live.open) renderDash();
    } else if (d.type && d.searchId) {
      live.status[d.searchId] = d.type;
      if (live.open) renderDash();
    }
  };

  const initLive = () => {
    try {
      window.addEventListener("message", (e) => {
        if (e.source !== window) return;
        onLiveMessage(e.data);
      });
      chrome.storage.local
        .get(LIVE_KEY)
        .then((r) => {
          const saved = (r && r[LIVE_KEY]) || [];
          if (Array.isArray(saved) && saved.length) {
            live.set = saved.slice(0, LIVE_MAX);
            setTimeout(sendLiveSet, 800); // live.js 준비 대기 후 전송
          }
        })
        .catch(() => {});
    } catch (_error) {
      // best-effort
    }
  };

  const start = () => {
    patchHistory();
    initSidebar();
    initLive();
    globalThis.addEventListener?.("popstate", scheduleReconcile);
    globalThis.addEventListener?.("hashchange", scheduleReconcile);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", reconcile, { once: true });
    } else {
      reconcile();
    }

    globalThis.setInterval(() => {
      try {
        if (state.href !== (globalThis.location?.href || "") || !state.button) {
          reconcile();
        }
      } catch (_error) {
        hideButton();
      }
    }, URL_POLL_MS);
  };

  try {
    start();
  } catch (_error) {
    hideButton();
  }
})();
