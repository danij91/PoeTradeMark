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
    actions.appendChild(jumpBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

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

  const start = () => {
    patchHistory();
    initSidebar();
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
