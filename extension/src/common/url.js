// PoE 거래소 URL 파싱/생성 — globalThis.PTB 공유 네임스페이스 (빌드툴 없음, 클래식 스크립트)
globalThis.PTB = globalThis.PTB || {};

// host → realm 코드. PoE 거래소는 언어만 다른 동일 사이트.
// 한국만 poe.kakaogames.com, 나머지는 {lang}.pathofexile.com (영문은 www / 도메인 자체).
PTB.HOST_REALMS = [
  { re: /kakaogames/, realm: "kr" },
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
  kr: "KR", en: "UK", jp: "JP", es: "ES", fr: "FR", de: "DE", th: "TH", ru: "RU", br: "BR",
  global: "UK", // 레거시(이전 버전 즐겨찾기)
};
PTB.realmLabel = function (realm) {
  return PTB.REALM_LABEL[realm] || String(realm || "").toUpperCase();
};

// https://{host}/trade/(search|exchange)/{league}/{searchId} → {host,realm,type,league,searchId} | null
PTB.parseTradeUrl = function (href) {
  try {
    const url = new URL(href);
    const m = url.pathname.match(/^\/trade\/(search|exchange)\/([^/]+)\/([^/]+)\/?$/);
    if (!m) return null;
    return {
      host: url.host,
      realm: PTB.hostToRealm(url.host),
      type: m[1],
      league: m[2],
      searchId: m[3],
    };
  } catch {
    return null;
  }
};

PTB.buildTradeUrl = function ({ host, type, league, searchId }) {
  return `https://${host}/trade/${type}/${league}/${searchId}`;
};
