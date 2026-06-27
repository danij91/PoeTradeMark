// PoE 거래소 URL 파싱/생성 — globalThis.PTB 공유 네임스페이스 (빌드툴 없음, 클래식 스크립트)
globalThis.PTB = globalThis.PTB || {};

// host에 kakaogames 포함 → "kr", 아니면 "global"
PTB.hostToRealm = function (host) {
  return /kakaogames/.test(host) ? "kr" : "global";
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
