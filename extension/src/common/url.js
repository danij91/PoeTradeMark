// PoE 거래소 URL 파싱/생성 — globalThis.PTB 공유 네임스페이스 (빌드툴 없음, 클래식 스크립트)
globalThis.PTB = globalThis.PTB || {};

// host → realm 코드. PoE 거래소는 언어만 다른 동일 사이트.
// 한국만 poe.kakaogames.com, 대만은 pathofexile.tw, 나머지는 {lang}.pathofexile.com (영문은 www).
PTB.HOST_REALMS = [
  { re: /kakaogames/, realm: "kr" },
  { re: /pathofexile\.tw$/, realm: "tw" },
  { re: /^jp\./, realm: "jp" },
  { re: /^es\./, realm: "es" },
  { re: /^fr\./, realm: "fr" },
  { re: /^de\./, realm: "de" },
  { re: /^th\./, realm: "th" },
  { re: /^ru\./, realm: "ru" },
  { re: /^br\./, realm: "br" },
];
PTB.hostToRealm = function (host) {
  host = String(host || "");
  for (var i = 0; i < PTB.HOST_REALMS.length; i += 1) {
    if (PTB.HOST_REALMS[i].re.test(host)) return PTB.HOST_REALMS[i].realm;
  }
  return "en"; // www.pathofexile.com 등 = 영문(영국)
};

// realm → 표시용 국가 약자
PTB.REALM_LABEL = {
  kr: "KR", en: "EN", jp: "JP", es: "ES", fr: "FR", de: "DE", th: "TH", ru: "RU", br: "BR", tw: "TW",
  global: "EN", // 레거시(이전 버전 즐겨찾기)
};
PTB.realmLabel = function (realm) {
  return PTB.REALM_LABEL[realm] || String(realm || "").toUpperCase();
};

// URL 경로 조각 디코딩. 이미 디코딩된 값("Forbidden Rites")은 그대로.
PTB.decodePathPart = function (value) {
  const raw = String(value || "");
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
};

// pathname 만 보고 게임 구분. 검색 ID 없는 /trade, /trade2 페이지도 인식.
PTB.gameFromUrl = function (href) {
  try {
    const path = new URL(href).pathname || "";
    if (path === "/trade2" || path.indexOf("/trade2/") === 0) return "poe2";
    if (path === "/trade" || path.indexOf("/trade/") === 0) return "poe1";
    return null;
  } catch {
    return null;
  }
};

// PoE 1: https://{host}/trade/(search|exchange)/{league}/{searchId}
// PoE 2: https://{host}/trade2/(search|exchange)/poe2/{league}/{searchId}
// → {host,realm,game,type,league,searchId} | null
PTB.parseTradeUrl = function (href) {
  try {
    const url = new URL(href);
    const m =
      url.pathname.match(/^\/trade\/(search|exchange)\/([^/]+)\/([^/]+)\/?$/) ||
      url.pathname.match(/^\/trade2\/(search|exchange)\/poe2\/([^/]+)\/([^/]+)\/?$/);
    if (!m) return null;
    return {
      host: url.host,
      realm: PTB.hostToRealm(url.host),
      game: PTB.gameFromUrl(href) || "poe1",
      type: m[1],
      league: PTB.decodePathPart(m[2]),
      searchId: m[3],
    };
  } catch {
    return null;
  }
};

PTB.buildTradeUrl = function ({ host, game, type, league, searchId }) {
  const path = game === "poe2" ? `trade2/${type}/poe2` : `trade/${type}`;
  const leagueSeg = encodeURIComponent(PTB.decodePathPart(league));
  return `https://${host}/${path}/${leagueSeg}/${searchId}`;
};
