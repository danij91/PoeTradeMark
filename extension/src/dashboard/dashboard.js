// PoE 라이브 대시보드 — 확장 페이지. 선택한 즐겨찾기(≤5)마다 "숨김(최소화) 창"의 백그라운드
// 워커 탭에서 사이트 공식 라이브검색을 돌리고, 워커가 가로챈 매물을 chrome.runtime 으로 받아
// 한곳에 집계한다. 읽기전용: 자동 귓속말/구매 없음. 은신처 이동은 라이브 중 유저 클릭 시에만.
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MAX = 5;
  const LIVE_KEY = "ptbLive";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 워커 탭에 메시지 — 콜백형으로 보내 lastError 를 소비(콘텐트 스크립트 미준비/탭 닫힘 시
  // 콜백 없는 sendMessage 는 Promise 거부 → "Receiving end does not exist" 미처리 예외가 됨).
  const sendToTab = (tabId, m) => {
    try {
      chrome.tabs.sendMessage(tabId, m, () => { void chrome.runtime.lastError; });
    } catch (_e) {
      // ignore
    }
  };

  const state = {
    bookmarks: [],
    selected: new Set(), // 북마크 id (검색ID는 리그/realm 달라도 충돌하므로 고유 id 사용)
    workers: new Map(), // 북마크 id -> { tabId, title, status }  (실행 중에만)
    searchInfo: new Map(), // 북마크 id -> { url, title }  ('거래소로'용, 정지 후에도 유지)
    groupId: null, // 워커 탭들을 묶은 탭 그룹(접어서 탭바 정리)
    hits: [],
    seen: new Set(), // "북마크id:itemId"
    itemStates: new Map(), // itemId -> { gone, demand, unavailable, expired }  (워커 DOM 관찰값)
    recvTotal: 0, // 받은 매물 누적(라이브 가시성)
    running: false,
    gen: 0, // 시작 사이클 토큰 — 정지 시 증가시켜 진행 중이던 시작 루프/arm 을 무효화
  };

  const msg = (key, fallback) => {
    try {
      if (globalThis.PTB && PTB.i18n) return PTB.i18n.t(key, fallback);
    } catch (_e) {
      // fall through
    }
    return fallback;
  };

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const frameColor = (ft) => {
    if (ft === 1) return "#8aa9ff"; // 마법
    if (ft === 2) return "#ffe873"; // 희귀
    if (ft === 3) return "#cf8a3d"; // 고유
    return "#ece3d0";
  };

  // ── 새 매물 알림음(띵동) ──────────────────────────────────────
  // 팝업 알림 없이 소리만. 연속 도착 시 1.5초당 1번으로 제한.
  let audioCtx = null;
  let lastDing = 0;
  function ensureAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (_e) {}
  }
  function playDing() {
    try {
      if (!audioCtx) return;
      const now = Date.now();
      if (now - lastDing < 1500) return;
      lastDing = now;
      const ctx = audioCtx;
      const t = ctx.currentTime;
      [[988, 0], [740, 0.16]].forEach((pair) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = pair[0];
        gain.gain.setValueAtTime(0.0001, t + pair[1]);
        gain.gain.exponentialRampToValueAtTime(0.22, t + pair[1] + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + pair[1] + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + pair[1]);
        osc.stop(t + pair[1] + 0.24);
      });
    } catch (_e) {}
  }

  // ── 선택 영역 ────────────────────────────────────────────────
  function persistSelection() {
    const visible = state.bookmarks
      .filter((b) => state.selected.has(b.id))
      .map((b) => ({
        id: b.id,
        host: b.host,
        league: b.league,
        searchId: b.searchId,
        realm: b.realm,
        game: b.game,
        type: b.type,
        title: b.title || b.searchId,
      }));
    const visibleIds = new Set(state.bookmarks.map((b) => b.id));
    try {
      chrome.storage.local.get(LIVE_KEY, (r) => {
        const prev = (r && r[LIVE_KEY]) || [];
        const others = prev.filter((x) => x && !visibleIds.has(x.id));
        chrome.storage.local.set({ [LIVE_KEY]: others.concat(visible) });
      });
    } catch (_e) {
      // ignore
    }
  }

  function updateCounts() {
    const c = $("selCount");
    if (c) c.textContent = `${state.selected.size}/${MAX}`;
  }

  function pageGame() {
    try {
      const game = new URLSearchParams(location.search).get("game");
      return game === "poe1" || game === "poe2" ? game : null;
    } catch (_e) {
      return null;
    }
  }

  function renderSelect() {
    const bar = $("selectBar");
    bar.textContent = "";
    if (!state.bookmarks.length) {
      bar.appendChild(el("span", "muted", msg("emptyList", "저장된 즐겨찾기가 없습니다")));
      updateCounts();
      return;
    }
    const games = ["poe1", "poe2"].filter((game) =>
      state.bookmarks.some((bookmark) => PTB.bookmarkGame(bookmark) === game)
    );
    const showHeaders = games.length > 1;
    for (const game of games) {
      const group = state.bookmarks.filter((bookmark) => PTB.bookmarkGame(bookmark) === game);
      const section = showHeaders ? el("div", "pick-game-section") : bar;
      if (showHeaders) {
        section.appendChild(el("h2", "pick-game-title", game === "poe2" ? "Path of Exile 2" : "Path of Exile 1"));
      }
      for (const b of group) {
        const on = state.selected.has(b.id);
        const lab = el("label", "pick" + (on ? " on" : ""));
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = on;
        cb.disabled = state.running;
        cb.addEventListener("change", () => {
          // 선택은 자유(제한 없음). 5개 제한은 '시작'에서 검사.
          if (cb.checked) state.selected.add(b.id);
          else state.selected.delete(b.id);
          lab.classList.toggle("on", cb.checked);
          persistSelection();
          updateCounts();
        });
        lab.appendChild(cb);
        lab.appendChild(el("span", "pick-name", b.title || b.searchId));
        lab.appendChild(
          el("span", "pick-realm", globalThis.PTB && PTB.realmLabel ? PTB.realmLabel(b.realm) : (b.realm || "").toUpperCase())
        );
        if (b.league) lab.appendChild(el("span", "pick-league", b.league));
        section.appendChild(lab);
      }
      if (showHeaders) bar.appendChild(section);
    }
    updateCounts();
  }

  // ── 상태 칩 ──────────────────────────────────────────────────
  function renderStatus() {
    const bar = $("statusBar");
    bar.textContent = "";
    if (!state.workers.size) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    for (const [, w] of state.workers) {
      const mark =
        w.status === "live"
          ? " ●"
          : w.status === "failed"
          ? " " + msg("activateFailed", "✗ 활성실패")
          : w.status === "paused"
          ? " ⏸"
          : " …";
      const cls = "chip" + (w.status === "live" ? " chip-live" : w.status === "failed" ? " chip-failed" : "");
      bar.appendChild(el("span", cls, w.title + mark));
    }
  }

  function updateRecv() {
    const r = $("recvInfo");
    if (!r) return;
    if (state.running) {
      r.hidden = false;
      r.textContent = msg("liveRecv", "🟢 라이브 수신 {n}개").replace("{n}", state.recvTotal);
    } else if (state.workers.size) {
      r.hidden = false;
      r.textContent = msg("pausedInfo", "⏸ 일시정지 · {n}개").replace("{n}", state.recvTotal);
    } else {
      r.hidden = true;
    }
  }

  // 워커 DOM 에서 관찰한 매물 상태를 카드에 반영(색/배지/은신처 버튼 비활성).
  // gone·unavailable = 팔림/사용 불가(빨강), demand = 수요 많음(노랑), expired = 은신처 만료.
  function applyCardState(card, st) {
    st = st || {};
    const blocked = !!(st.gone || st.unavailable);
    card.classList.toggle("card-gone", blocked);
    card.classList.toggle("card-demand", !!st.demand && !blocked);
    card.classList.toggle("card-expired", !!st.expired && !blocked);

    const label = blocked
      ? msg("stateGone", "✗ 판매/사용 불가")
      : st.expired
      ? msg("stateExpired", "⏰ 만료 — 거래소로")
      : st.demand
      ? msg("stateDemand", "🔥 수요 많음")
      : "";
    let badge = card.querySelector(".card-state");
    if (label) {
      if (!badge) {
        badge = el("span", "card-state");
        (card.querySelector(".card-head") || card).appendChild(badge);
      }
      badge.textContent = label;
      badge.className = "card-state " + (blocked ? "st-gone" : st.expired ? "st-expired" : "st-demand");
    } else if (badge) {
      badge.remove();
    }

    // 은신처로 이동(우리 중계 버튼): 팔림/만료면 눌러도 소용없으니 비활성.
    const ho = card.querySelector(".card-go");
    if (ho) ho.disabled = blocked || !!st.expired;
  }

  // ── 매물 카드 ────────────────────────────────────────────────
  function buildCard(hit) {
    const card = el("article", "card");

    const thumb = el("div", "card-thumb");
    if (hit.icon) {
      const img = document.createElement("img");
      img.src = hit.icon;
      img.alt = "";
      img.loading = "lazy";
      thumb.appendChild(img);
    }
    card.appendChild(thumb);

    const body = el("div", "card-body");
    const head = el("div", "card-head");
    const nm = el("span", "card-name", [hit.name, hit.typeLine].filter(Boolean).join(" ").trim() || "?");
    nm.style.color = frameColor(hit.frameType);
    head.appendChild(nm);
    if (hit.corrupted) head.appendChild(el("span", "card-corrupt", msg("corrupted", "타락")));
    body.appendChild(head);

    const meta = el("div", "card-meta");
    if (hit.price) meta.appendChild(el("span", "card-price", hit.price));
    if (hit.ilvl) meta.appendChild(el("span", "card-il", "iLvl " + hit.ilvl));
    if (hit.__source) meta.appendChild(el("span", "card-src", "◈ " + hit.__source));
    if (hit.account) meta.appendChild(el("span", "card-acc", hit.account));
    body.appendChild(meta);

    if (Array.isArray(hit.mods) && hit.mods.length) {
      const mods = el("div", "card-mods");
      for (const m of hit.mods) mods.appendChild(el("div", "card-mod", m));
      body.appendChild(mods);
    }

    const info = state.searchInfo.get(hit.__bookmarkId);
    const w = state.workers.get(hit.__bookmarkId); // 탭이 열려있으면(정지 중에도) 은신처 가능
    if (info) {
      const acts = el("div", "card-actions");

      // 은신처로 이동 = 워커 탭의 그 매물 줄 공식 .direct-btn 을 대신 클릭. 라이브 중일 때만 가능.
      if (w && w.tabId) {
        const ho = el("button", "card-go", msg("goHideout", "🏠 은신처로 이동"));
        ho.type = "button";
        ho.addEventListener("click", () => {
          const prev = ho.textContent;
          ho.disabled = true;
          ho.textContent = msg("sending", "보내는 중…");
          const done = (txt) => {
            ho.textContent = txt;
            setTimeout(() => {
              ho.textContent = prev;
              ho.disabled = false;
            }, 1600);
          };
          try {
            chrome.tabs.sendMessage(w.tabId, { cmd: "ptb-act", act: "hideout", id: hit.id }, (resp) => {
              const err = chrome.runtime.lastError;
              if (!err && resp && resp.ok) done(msg("sent", "✓ 보냄"));
              else if (resp && resp.reason === "no-row") done(msg("noListing", "매물 없음"));
              else if (resp && resp.reason === "no-button") done(msg("cannotContact", "연락 불가"));
              else done(msg("failed", "실패"));
            });
          } catch (_e) {
            done(msg("failed", "실패"));
          }
        });
        acts.appendChild(ho);
      }

      // 거래소로 = 라이브 중이면 그 워커 탭을 띄우고(숨김 창을 앞으로), 아니면 검색 페이지를 새로 연다.
      const jump = el("button", "card-jump", msg("openInTrade", "거래소로"));
      jump.type = "button";
      jump.addEventListener("click", () => {
        try {
          if (w && w.tabId) {
            chrome.tabs.update(w.tabId, { active: true }); // 접힌 그룹이면 자동으로 펼쳐짐
          } else if (info.url) {
            chrome.tabs.create({ url: info.url });
          }
        } catch (_e) {
          // ignore
        }
      });
      acts.appendChild(jump);

      body.appendChild(acts);
    }

    card.appendChild(body);
    card.dataset.itemId = hit.id || ""; // 워커가 보내는 상태(ptb-item-state)와 매칭
    applyCardState(card, state.itemStates.get(hit.id));
    return card;
  }

  function renderHits() {
    const main = $("hits");
    main.textContent = "";
    if (!state.hits.length) {
      main.appendChild(
        el(
          "p",
          "waiting",
          state.running
            ? msg("liveWaiting", "새 매물 대기 중…")
            : msg("liveIdle", "검색을 고르고 ‘시작’을 누르면 라이브 매물이 여기에 모입니다.")
        )
      );
      return;
    }
    for (const h of state.hits) main.appendChild(buildCard(h));
  }

  // ── 워커 탭 관리 ─────────────────────────────────────────────
  // 탭이 뜬 뒤 content.js 가 준비되면 ptb-be-worker 를 받아 응답한다. 준비 전엔 실패 → 재시도.
  function armWorker(tabId, key, gen) {
    let tries = 0;
    const trySend = () => {
      tries += 1;
      if (state.gen !== gen) return; // 정지/재시작됨 → 이 탭을 워커로 만들지 않음
      if (!state.workers.has(key)) return;
      try {
        chrome.tabs.sendMessage(tabId, { cmd: "ptb-be-worker" }, (resp) => {
          const err = chrome.runtime.lastError;
          if (err || !resp) {
            if (tries < 25) setTimeout(trySend, 700);
            return;
          }
          const w = state.workers.get(key);
          if (w && w.status === "loading") {
            w.status = "arming"; // 워커 지정됨 — 라이브 실제 활성(active)되면 live 로.
            renderStatus();
          }
        });
      } catch (_e) {
        if (tries < 25) setTimeout(trySend, 700);
      }
    };
    setTimeout(trySend, 1200);
  }

  async function start() {
    if (state.running) return;
    const picks = state.bookmarks.filter((b) => state.selected.has(b.id));
    if (!picks.length) return;
    // 동시 5개 제한은 여기서(시작 시) 검사. 초과면 알림 후 시작 안 함.
    if (picks.length > MAX) {
      alert(msg("maxExceeded", "라이브는 최대 {n}개까지만 동시 실행할 수 있어요. 선택을 {n}개 이하로 줄여주세요.").replace(/\{n\}/g, MAX));
      return;
    }

    // 시작할 때마다 매물 목록을 비우고 새로 모은다.
    state.hits = [];
    state.seen.clear();
    state.itemStates.clear();
    state.recvTotal = 0;

    state.running = true;
    const gen = ++state.gen; // 이 시작 사이클 식별(정지 누르면 state.gen 이 바뀌어 아래 루프가 중단됨)
    ensureAudio(); // 시작 클릭(유저 제스처) 때 오디오 컨텍스트 활성화
    $("startBtn").hidden = true;
    $("stopBtn").hidden = false;

    // 선택 취소된(열려있던) 워커 탭은 닫는다.
    const pickIds = new Set(picks.map((b) => b.id));
    for (const [bid, w] of [...state.workers]) {
      if (!pickIds.has(bid)) {
        if (w.tabId) { try { chrome.tabs.remove(w.tabId); } catch (_e) {} }
        state.workers.delete(bid);
        state.searchInfo.delete(bid);
      }
    }
    renderSelect(); // 체크박스 비활성화 반영
    updateRecv();
    renderHits();

    // 이미 열린 탭(일시정지 상태)은 라이브만 다시 켜고(재사용), 새 선택은 백그라운드 탭을 새로 연다.
    // (열린 워커 탭들은 아래에서 접힌 그룹으로 묶어 탭바를 정리한다.)
    for (const b of picks) {
      if (state.gen !== gen) return; // 정지됨 → 더 이상 열지 않음
      let url = "";
      try {
        url = PTB.buildTradeUrl(b);
      } catch (_e) {
        url = "";
      }
      if (!url) continue;
      state.searchInfo.set(b.id, { url: url, title: b.title || b.searchId });

      const ex = state.workers.get(b.id);
      if (ex && ex.tabId) {
        ex.status = "loading";
        sendToTab(ex.tabId, { cmd: "ptb-resume" });
        renderStatus();
        await sleep(500); // 재개 동시 폭주 방지
        if (state.gen !== gen) return; // 정지됨
      } else {
        let tab = null;
        try {
          tab = await chrome.tabs.create({ url: url, active: false });
        } catch (_e) {
          tab = null;
        }
        if (state.gen !== gen) { // 탭 만드는 사이 정지됨 → 방금 연 탭 정리하고 종료
          if (tab) { try { chrome.tabs.remove(tab.id); } catch (_e) {} }
          return;
        }
        if (!tab) continue;
        try { chrome.tabs.update(tab.id, { muted: true }); } catch (_e) {} // 사이트 알림음 음소거(대시보드 띵동만)
        state.workers.set(b.id, { tabId: tab.id, title: b.title || b.searchId, status: "loading" });
        armWorker(tab.id, b.id, gen);
        renderStatus();
        await sleep(900); // 탭/라이브 동시 개시 폭주 방지(레이트리밋 배려)
        if (state.gen !== gen) return; // 정지됨
      }
    }

    if (state.gen !== gen) return; // 그룹화 직전 최종 확인

    // 워커 탭들을 한 그룹으로 묶고 접어 탭바를 정리(개별 탭 N개 대신 그룹 칩 하나).
    try {
      const ids = [...state.workers.values()].map((w) => w.tabId).filter(Boolean);
      if (ids.length) {
        try {
          const opts = { tabIds: ids };
          if (state.groupId != null) opts.groupId = state.groupId;
          state.groupId = await chrome.tabs.group(opts);
        } catch (_e) {
          state.groupId = await chrome.tabs.group({ tabIds: ids }); // 그룹 id 만료 시 새로
        }
        try {
          await chrome.tabGroups.update(state.groupId, { collapsed: true, title: msg("openDash", "📡 라이브"), color: "blue" });
        } catch (_e) {}
      }
    } catch (_e) {}

    renderStatus();
    renderHits();
  }

  function closeWorkers() {
    // 워커 탭(백그라운드)을 모두 닫으면 그 라이브검색이 멈춘다.
    for (const [, w] of state.workers) {
      if (w.tabId) {
        try { chrome.tabs.remove(w.tabId); } catch (_e) {}
      }
    }
  }

  // 정지(일시정지): 각 워커 탭의 라이브검색만 끈다(공식 버튼 토글로 중지). 탭은 그대로 둬서
  // 화면에 보이는 매물은 계속 은신처 이동 가능. 완전히 닫으려면 대시보드 탭을 닫으면 됨.
  function pause() {
    state.gen += 1; // 진행 중이던 start() 루프·armWorker 를 즉시 무효화(되살아남 방지)
    for (const [, w] of state.workers) {
      if (w.tabId) {
        sendToTab(w.tabId, { cmd: "ptb-pause" });
        w.status = "paused";
      }
    }
    state.running = false;
    $("startBtn").hidden = false;
    $("stopBtn").hidden = true;
    renderSelect();
    renderStatus();
    renderHits();
    updateRecv();
  }

  // ── 수신: 워커가 보낸 매물 집계 ───────────────────────────────
  chrome.runtime.onMessage.addListener((m, sender) => {
    if (!m) return;

    // 매물 상태 변경(워커 DOM 관찰) → 해당 카드만 갱신. 매물 id 로 직접 매칭하므로 워커 식별 불필요.
    if (m.type === "ptb-item-state" && Array.isArray(m.states)) {
      for (const st of m.states) {
        if (!st || !st.id) continue;
        state.itemStates.set(st.id, st);
        document.querySelectorAll('#hits [data-item-id="' + st.id + '"]').forEach((c) => applyCardState(c, st));
      }
      return;
    }

    // 보낸 탭으로 어느 워커(북마크)인지 식별.
    let bookmarkId = null;
    let title = "";
    for (const [bid, w] of state.workers) {
      if (sender.tab && w.tabId === sender.tab.id) {
        bookmarkId = bid;
        title = w.title;
        break;
      }
    }

    // 라이브 상태(활성/실패) → 상태칩 갱신.
    if (m.type === "ptb-status") {
      for (const [, w] of state.workers) {
        if (sender.tab && w.tabId === sender.tab.id) {
          if (m.status === "active") w.status = "live";
          else if (m.status === "failed") w.status = "failed";
          renderStatus();
          break;
        }
      }
      return;
    }

    if (m.type !== "ptb-items" || !Array.isArray(m.items) || !bookmarkId) return;
    if (!state.running) return; // 정지 후 들어오는 잔여 매물 무시

    let added = 0;
    for (const it of m.items) {
      if (it.id) {
        const key = bookmarkId + ":" + it.id;
        if (state.seen.has(key)) continue;
        state.seen.add(key);
      }
      state.hits.unshift(Object.assign({ __source: title, __bookmarkId: bookmarkId }, it));
      added += 1;
    }
    if (added) {
      state.recvTotal += added;
      state.hits = state.hits.slice(0, 300);
      updateRecv();
      renderHits();
      playDing();
    }
  });

  // 워커 탭이 닫히면(직접 닫음 등) 해당 항목의 은신처 버튼이 사라지도록 갱신.
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const [, w] of state.workers) {
      if (w.tabId === tabId) {
        w.tabId = null;
        renderStatus();
        renderHits();
        break;
      }
    }
  });

  // 선택(ptbLive)이 어디서든(사이드바 등) 바뀌면 동기화. 실행 중 선택 취소된 워커는 닫고 그 매물 제거.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[LIVE_KEY]) return;
    const saved = changes[LIVE_KEY].newValue || [];
    const ids = new Set(saved.map((x) => x.id));
    state.selected = new Set(state.bookmarks.filter((b) => ids.has(b.id)).map((b) => b.id));
    renderSelect();
    if (state.running) {
      for (const [bid, w] of [...state.workers]) {
        if (!state.selected.has(bid)) {
          if (w.tabId) { try { chrome.tabs.remove(w.tabId); } catch (_e) {} }
          state.workers.delete(bid);
          state.searchInfo.delete(bid);
        }
      }
      state.hits = state.hits.filter((h) => state.selected.has(h.__bookmarkId));
      renderStatus();
      renderHits();
    }
  });

  window.addEventListener("beforeunload", closeWorkers);

  $("startBtn").addEventListener("click", start);
  $("stopBtn").addEventListener("click", pause);
  $("clearBtn").addEventListener("click", () => {
    state.hits = [];
    state.seen.clear();
    renderHits();
  });

  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (e) {
      e.textContent = msg(e.getAttribute("data-i18n"), e.textContent);
    });
    document.title = msg("liveDashboard", "📡 라이브 대시보드");
  }

  function setupLangSelect() {
    var sel = $("lang-select");
    if (!sel || !globalThis.PTB || !PTB.i18n) return;
    PTB.i18n.LANGS.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = PTB.i18n.LANG_NAMES[code] || code;
      if (code === PTB.i18n.getLang()) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
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
      PTB.i18n.onChange(function () {
        applyStaticI18n();
        var sel = $("lang-select");
        if (sel) sel.value = PTB.i18n.getLang();
        renderSelect();
        renderStatus();
        renderHits();
        updateRecv();
      });
    }
    applyStaticI18n();
    setupLangSelect();
    document.documentElement.classList.toggle("ptb-game-poe2", pageGame() === "poe2");
    document.body.classList.toggle("ptb-game-poe2", pageGame() === "poe2");
    try {
      state.bookmarks = await PTB.storage.list(pageGame());
    } catch (_e) {
      state.bookmarks = [];
    }
    let saved = [];
    try {
      const r = await chrome.storage.local.get(LIVE_KEY);
      saved = (r && r[LIVE_KEY]) || [];
    } catch (_e) {
      saved = [];
    }
    const savedIds = new Set((saved || []).map((x) => x.id));
    state.selected = new Set(
      state.bookmarks.filter((b) => savedIds.has(b.id)).map((b) => b.id)
    );
    renderSelect();
    renderStatus();
    renderHits();
    updateRecv();
  }

  init();
})();
