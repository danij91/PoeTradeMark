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

  const visibleText = (element) => {
    try {
      if (!element) {
        return "";
      }

      const rect = element.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        return "";
      }

      return cleanText(element.textContent);
    } catch (_error) {
      return "";
    }
  };

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

  const findResultRoot = (iconElement) => {
    const resultSelectors = [
      ".resultset .row",
      ".search-results .row",
      "[class*='result'] [class*='row']",
      "[data-id]",
      "li",
    ];

    const result = queryOne(document, resultSelectors);
    if (result) {
      return result;
    }

    try {
      let node = iconElement;
      for (let depth = 0; node && node !== document.body && depth < 8; depth += 1) {
        const text = visibleText(node);
        if (text.length > 10) {
          return node;
        }
        node = node.parentElement;
      }
    } catch (_error) {
      return null;
    }

    return null;
  };

  const pickTitleFromRoot = (root) => {
    if (!root) {
      return "";
    }

    const nameSelectors = [
      ".itemName",
      ".item-name",
      "[class*='itemName']",
      "[class*='item-name']",
      ".name",
      "[class*='name']",
    ];

    const namedElement = queryOne(root, nameSelectors);
    const namedText = visibleText(namedElement);
    if (namedText && namedText.length <= 120) {
      return namedText;
    }

    try {
      const lines = String(root.textContent || "")
        .split(/\r?\n/)
        .map(cleanText)
        .filter((line) => line.length >= 3 && line.length <= 120);

      return lines[0] || "";
    } catch (_error) {
      return "";
    }
  };

  const captureResultDetails = (info) => {
    try {
      const icon = document.querySelector("img[src*='poecdn']");
      const iconUrl = icon?.getAttribute("src") || null;
      const root = findResultRoot(icon);
      const title = pickTitleFromRoot(root) || fallbackTitle(info);

      return { title, iconUrl };
    } catch (_error) {
      return { title: fallbackTitle(info), iconUrl: null };
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
    const addBookmark = globalThis.PTB?.storage?.add;
    if (!info || typeof addBookmark !== "function") {
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

      const { title, iconUrl } = captureResultDetails(info);
      await addBookmark({
        ...info,
        title,
        iconUrl,
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
