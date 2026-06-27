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
  };

  const fallbackTitle = (info) =>
    `${info?.league || info?.realm || "Trade"} - ${info?.searchId || "search"}`;

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

  const NAME_SELECTORS = [
    ".item-popup__header-line",
    ".itemName",
    ".typeLine",
    "[class*='header-line']",
    "[class*='itemName']",
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

  // 적용된 스탯 필터 모드 텍스트들. 라이브 확인: 스탯(brown) 패널의 각 `.filter .filter-title`이
  // `<i class="mutate-type">비고정</i><span>소환수가 불경한 힘 보유</span>` 형태.
  // 그룹 헤더("능력치 필터")는 mutate-type가 없어 제외. 모드 = filter-title에서 type 라벨/툴팁 뺀 것.
  const captureFilters = () => {
    try {
      const mods = [];
      const filters = document.querySelectorAll(".search-advanced-pane.brown .filter");
      for (const f of filters) {
        const titleEl = f.querySelector(".filter-title");
        if (!titleEl || !titleEl.querySelector(".mutate-type")) continue;
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll(".mutate-type, .filter-tip").forEach((n) => n.remove());
        const text = cleanText(clone.textContent);
        if (text && !mods.includes(text)) mods.push(text);
      }
      return mods;
    } catch (_error) {
      return [];
    }
  };

  const captureResultDetails = (info) => {
    try {
      const row = queryOne(document, RESULT_ROW_SELECTORS);
      const scope = row || document;
      const icon = queryOne(scope, ICON_SELECTORS);
      const iconUrl = icon?.getAttribute("src") || null;
      const resultName = cleanText(queryOne(scope, NAME_SELECTORS)?.textContent);
      // 제목 우선순위: 검색창 입력값 → 결과 첫 행 이름 → "리그 · id" 폴백
      const title = readSearchTitle() || resultName || fallbackTitle(info);
      const filters = captureFilters();

      return { title, iconUrl, filters };
    } catch (_error) {
      return { title: fallbackTitle(info), iconUrl: null, filters: [] };
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

      const { title, iconUrl, filters } = captureResultDetails(info);
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

  const start = () => {
    patchHistory();
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
