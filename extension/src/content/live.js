// PoE 거래소 라이브검색 — 워커(MAIN world). 대시보드가 연 백그라운드 탭에서 실행된다.
// 사이트 공식 라이브검색을 켜고, 사이트가 토큰을 복호화→fetch 한 응답을 가로채(읽기전용)
// 매물 전체를 격리 content.js 로 넘긴다. 직접 복호화/자체 WS 안 함.
// 안전선: 읽기전용 · 유저가 고른 검색만 · 귓속말/구매/이동 자동화 없음.
(() => {
  "use strict";

  if (window.__ptbLiveReady) return;
  window.__ptbLiveReady = true;

  const FETCH_RE = /\/api\/trade2?\/fetch\//;
  let capturing = false; // /live 활성 확인 후에만 응답을 읽음(라이브 이전 일반 검색결과는 제외)
  let activated = false; // 사이트 라이브 중복 토글 방지
  let activateTries = 0;
  let pollTimer = 0;

  const post = (msg) => {
    try {
      window.postMessage(Object.assign({ source: "ptb-live" }, msg), location.origin);
    } catch (_e) {
      // ignore
    }
  };

  const mapItem = (r) => {
    const it = r.item || {};
    const ls = r.listing || {};
    // 옵션은 문자열(implicit 등) 또는 객체(explicit: {description, hash, mods})로 섞여 온다.
    // 표시 텍스트는 문자열이면 그대로, 객체면 .description(없으면 .name).
    const modText = (m) =>
      typeof m === "string" ? m : (m && (m.description || m.name)) || "";
    const mods = []
      .concat(it.enchantMods || [])
      .concat(it.implicitMods || [])
      .concat(it.explicitMods || [])
      .concat(it.craftedMods || [])
      .map(modText)
      .filter(Boolean);
    return {
      id: r.id,
      name: (it.name || "").trim(),
      typeLine: (it.typeLine || "").trim(),
      icon: it.icon || "",
      ilvl: it.ilvl || it.itemLevel || null,
      frameType: typeof it.frameType === "number" ? it.frameType : null,
      corrupted: !!it.corrupted,
      mods: mods.slice(0, 12),
      price: ls.price ? `${ls.price.amount} ${ls.price.currency}` : "",
      account: (ls.account && ls.account.name) || "",
      hideoutToken: ls.hideout_token || "",
      whisper: ls.whisper || "",
      indexed: ls.indexed || "",
    };
  };

  const handleBody = (text) => {
    if (!capturing) return;
    let data = null;
    try { data = JSON.parse(text); } catch (_e) { return; }
    const arr = data && Array.isArray(data.result) ? data.result : null;
    if (!arr || !arr.length) return;
    const items = arr.filter(Boolean).map(mapItem);
    if (items.length) post({ type: "items", items });
  };

  // fetch 후킹 — 사이트가 라이브 히트마다 /api/trade/fetch/ 로 받는 응답을 복제해 읽는다(원본 흐름 그대로 통과).
  const origFetch = window.fetch;
  window.fetch = function (input) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (capturing && FETCH_RE.test(url)) {
        p.then((res) => res.clone().text()).then(handleBody).catch(() => {});
      }
    } catch (_e) {
      // ignore
    }
    return p;
  };

  // XHR 후킹 — 사이트가 XHR 로 받는 경우 대비.
  try {
    const proto = window.XMLHttpRequest.prototype;
    const origOpen = proto.open;
    proto.open = function (_m, u) {
      this.__ptbUrl = u;
      return origOpen.apply(this, arguments);
    };
    const origSend = proto.send;
    proto.send = function () {
      const xhr = this;
      try {
        xhr.addEventListener("load", () => {
          try {
            if (capturing && FETCH_RE.test("" + xhr.__ptbUrl)) handleBody(xhr.responseText);
          } catch (_e) {}
        });
      } catch (_e) {}
      return origSend.apply(this, arguments);
    };
  } catch (_e) {
    // ignore
  }

  const findLiveBtn = () =>
    [].slice.call(document.querySelectorAll(".livesearch-btn")).find((b) => b && b.offsetParent) ||
    document.querySelector(".livesearch-btn");

  // 사이트 라이브검색을 켠다. 백그라운드 워커 탭은 버튼 렌더·클릭 반영이 늦을 수 있어,
  // 실제로 URL 이 /live 가 될 때까지 클릭을 재시도한다(이미 /live 면 건드리지 않음).
  const activate = () => {
    if (activated) return;
    if (/\/live(\/|$)/.test(location.pathname)) {
      activated = true;
      capturing = true; // /live 확인 — 이제부터만 캡처(라이브 이전의 일반 검색결과는 안 잡음)
      post({ type: "active" });
      return;
    }
    const btn = findLiveBtn();
    if (!btn) {
      // 버튼이 아직 안 뜸 → 대기 후 재시도. 끝까지 못 찾으면 실패 보고.
      if (activateTries < 60) {
        activateTries += 1;
        pollTimer = setTimeout(activate, 600);
      } else {
        post({ type: "failed", reason: "no-button" });
      }
      return;
    }
    try { btn.click(); } catch (_e) {}
    activateTries += 1;
    // 클릭이 반영돼 /live 가 됐는지 확인. 안 됐으면 다시 시도(클릭 미반영 대비).
    pollTimer = setTimeout(() => {
      if (/\/live(\/|$)/.test(location.pathname)) {
        activated = true;
        capturing = true;
        post({ type: "active" });
      } else if (activateTries < 18) {
        activate();
      } else {
        post({ type: "failed", reason: "click-no-live" });
      }
    }, 1200);
  };

  const stop = () => {
    capturing = false;
    try { clearTimeout(pollTimer); } catch (_e) {}
    // 사이트 라이브가 켜져 있으면(=/live) 토글로 끈다.
    try {
      if (/\/live(\/|$)/.test(location.pathname)) {
        const btn = findLiveBtn();
        if (btn) btn.click();
      }
    } catch (_e) {}
    activated = false;
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.source !== "ptb") return;
    if (d.cmd === "worker-start") {
      activateTries = 0;
      activate();
    } else if (d.cmd === "worker-stop") {
      stop();
    }
  });

  post({ type: "ready" });
})();
