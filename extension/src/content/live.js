// PoE 거래소 라이브검색 매니저 — MAIN world(페이지 컨텍스트)에서 실행.
// 페이지 origin·세션 쿠키로 WS/fetch를 열어 거래소 공식 라이브검색을 N개 관리한다.
// 격리 content.js 와는 window.postMessage 로만 통신(MAIN 월드엔 chrome.* 없음).
// 안전선: 읽기전용(귓속말/구매 자동화 X) · 동시 하드캡 · 429 백오프 · 끊기면 지수 백오프 재연결.
(() => {
  "use strict";

  if (window.__ptbLiveReady) return;
  window.__ptbLiveReady = true;

  const MAX_LIVE = 5; // 동시 라이브 소켓 하드캡(실측 확인된 보수적 상한)
  const FETCH_MAX = 10; // 한 번에 상세 조회할 매물 수
  const sockets = new Map(); // searchId -> { ws, league, retry, timer, closedByUs }

  const post = (msg) => {
    try {
      window.postMessage(Object.assign({ source: "ptb-live" }, msg), location.origin);
    } catch (_e) {
      // ignore
    }
  };

  const liveUrl = (league, id) =>
    `wss://${location.host}/api/trade/live/${encodeURIComponent(league)}/${encodeURIComponent(id)}`;

  const fetchUrl = (id, ids) =>
    `https://${location.host}/api/trade/fetch/${ids.join(",")}?query=${encodeURIComponent(id)}`;

  const closeSocket = (id) => {
    const s = sockets.get(id);
    if (!s) return;
    s.closedByUs = true;
    try { clearTimeout(s.timer); } catch (_e) {}
    try { if (s.ws) s.ws.close(); } catch (_e) {}
    sockets.delete(id);
  };

  // 히트(new ids) → 상세 조회 → 매물 요약 전달. 읽기전용. 429면 백오프 신호만.
  const onHit = async (id, newIds) => {
    if (!Array.isArray(newIds) || !newIds.length) return;
    try {
      const url = fetchUrl(id, newIds.slice(0, FETCH_MAX));
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 429) {
        post({ type: "ratelimit", searchId: id });
        return;
      }
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const items = ((data && data.result) || [])
        .filter(Boolean)
        .map((r) => {
          const it = r.item || {};
          const ls = r.listing || {};
          const mods = []
            .concat(it.enchantMods || [])
            .concat(it.implicitMods || [])
            .concat(it.explicitMods || [])
            .concat(it.craftedMods || []);
          return {
            id: r.id,
            name: (it.name || "").trim(),
            typeLine: (it.typeLine || "").trim(),
            icon: it.icon || "",
            ilvl: it.ilvl || it.itemLevel || null,
            frameType: typeof it.frameType === "number" ? it.frameType : null,
            corrupted: !!it.corrupted,
            mods: mods.slice(0, 12),
            price:
              ls.price ? `${ls.price.amount} ${ls.price.currency}` : "",
            account: (ls.account && ls.account.name) || "",
            whisper: ls.whisper || "",
            indexed: ls.indexed || "",
          };
        });
      if (items.length) post({ type: "hit", searchId: id, items });
    } catch (_e) {
      // best-effort
    }
  };

  const open = (league, id) => {
    if (sockets.has(id)) return;
    if (sockets.size >= MAX_LIVE) {
      post({ type: "capped", searchId: id, max: MAX_LIVE });
      return;
    }
    const entry = { ws: null, league, retry: 0, timer: 0, closedByUs: false };
    sockets.set(id, entry);
    try {
      const ws = new WebSocket(liveUrl(league, id));
      entry.ws = ws;
      ws.addEventListener("open", () => {
        entry.retry = 0;
        post({ type: "open", searchId: id });
      });
      ws.addEventListener("message", (e) => {
        let m = null;
        try { m = JSON.parse(e.data); } catch (_e) { return; }
        if (!m) return;
        if (m.auth) {
          post({ type: "auth", searchId: id });
          return;
        }
        if (Array.isArray(m.new)) onHit(id, m.new);
      });
      ws.addEventListener("close", () => {
        post({ type: "close", searchId: id });
        if (entry.closedByUs || sockets.get(id) !== entry) return;
        // 지수 백오프 재연결(폭주 금지). 2s,4s,…최대 60s.
        entry.retry = Math.min(entry.retry + 1, 6);
        const delay = Math.min(2000 * 2 ** (entry.retry - 1), 60000);
        entry.timer = setTimeout(() => {
          if (sockets.get(id) === entry) {
            sockets.delete(id);
            open(league, id);
          }
        }, delay);
      });
      ws.addEventListener("error", () => post({ type: "error", searchId: id }));
    } catch (_e) {
      sockets.delete(id);
      post({ type: "error", searchId: id });
    }
  };

  // 원하는 라이브 집합으로 동기화(캡 적용): 빠진 건 닫고 새 건 연다.
  const setLive = (list) => {
    const wanted = new Map(
      (Array.isArray(list) ? list : [])
        .filter((x) => x && x.searchId && x.league)
        .slice(0, MAX_LIVE)
        .map((x) => [x.searchId, x.league])
    );
    for (const id of [...sockets.keys()]) {
      if (!wanted.has(id)) closeSocket(id);
    }
    for (const [id, league] of wanted) {
      if (!sockets.has(id)) open(league, id);
    }
    post({ type: "synced", active: [...sockets.keys()], max: MAX_LIVE });
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.source !== "ptb") return;
    if (d.cmd === "live-set") setLive(d.list);
    else if (d.cmd === "live-stop") setLive([]);
    else if (d.cmd === "live-ping") post({ type: "synced", active: [...sockets.keys()], max: MAX_LIVE });
  });

  post({ type: "ready", max: MAX_LIVE });
})();
