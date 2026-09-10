// PoE 2 환율 — poe.ninja exchange overview. 30분 캐시. globalThis.PTB.rates
globalThis.PTB = globalThis.PTB || {};

PTB.rates = (function () {
  const CACHE_MS = 30 * 60 * 1000;
  const DEFAULT_BASE = "divine";
  const BASE_IDS_POE2 = ["mirror", "divine", "chaos", "exalted"];
  const BASE_IDS_POE1 = ["mirror", "divine", "chaos"];

  function normGame(game) {
    return game === "poe2" ? "poe2" : "poe1";
  }
  function cacheKey(game) {
    return normGame(game) === "poe2" ? "ptbRates" : "ptbRatesPoe1";
  }
  function baseKey(game) {
    return normGame(game) === "poe2" ? "ptbBaseCurrency" : "ptbBaseCurrencyPoe1";
  }
  function baseIds(game) {
    return normGame(game) === "poe2" ? BASE_IDS_POE2 : BASE_IDS_POE1;
  }
  function overviewUrl(game) {
    return normGame(game) === "poe2"
      ? "https://poe.ninja/poe2/api/economy/exchange/current/overview"
      : "https://poe.ninja/poe1/api/economy/exchange/current/overview";
  }
  function bundledIcon(id, game) {
    if (!id) return "";
    try {
      const folder = normGame(game) === "poe1" ? "src/assets/currency/poe1/" : "src/assets/currency/";
      return chrome.runtime.getURL(folder + id + ".png");
    } catch (_e) {
      return "";
    }
  }
  const NAMES = {
    mirror: "Mirror of Kalandra",
    divine: "Divine Orb",
    chaos: "Chaos Orb",
    exalted: "Exalted Orb",
  };
  const OVERVIEW =
    "https://poe.ninja/poe2/api/economy/exchange/current/overview";

  const ALIAS = {
    exalted: "exalted",
    "exalted-orb": "exalted",
    "exalted orb": "exalted",
    divine: "divine",
    "divine-orb": "divine",
    "divine orb": "divine",
    chaos: "chaos",
    "chaos-orb": "chaos",
    "chaos orb": "chaos",
    "엑잘티드 오브": "exalted",
    엑잘티드: "exalted",
    엑잘: "exalted",
    "신성 오브": "divine",
    신성: "divine",
    "카오스 오브": "chaos",
    카오스: "chaos",
  };

  function divineValue(bundle, id) {
    if (!bundle || !id) return null;
    const v = bundle.values && bundle.values[id];
    return v > 0 ? v : null;
  }

  function convert(bundle, amount, fromId, toId) {
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 0) return null;
    const from = divineValue(bundle, fromId);
    const to = divineValue(bundle, toId);
    if (!from || !to) return null;
    return (a * from) / to;
  }

  function localeTag() {
    try {
      const lang = PTB.i18n && PTB.i18n.getLang && PTB.i18n.getLang();
      const map = {
        ko: "ko-KR",
        ja: "ja-JP",
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        th: "th-TH",
        ru: "ru-RU",
        pt: "pt-BR",
        tw: "zh-TW",
      };
      return (lang && map[lang]) || "en-US";
    } catch (_e) {
      return "en-US";
    }
  }

  function format3(n) {
    if (!Number.isFinite(n)) return "";
    const rounded = Math.round((n + Number.EPSILON) * 1000) / 1000;
    return rounded.toLocaleString(localeTag(), {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  function resolveId(bundle, raw) {
    const s = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!s) return null;
    const cls = s.match(/currency-([a-z0-9-]+)/);
    if (cls) return resolveId(bundle, cls[1]);
    if (ALIAS[s]) return ALIAS[s];
    if (bundle && bundle.values && bundle.values[s] > 0) return s;
    const items = (bundle && bundle.items) || [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (!it || !it.id) continue;
      if (it.id === s || String(it.detailsId || "").toLowerCase() === s) return it.id;
      const name = String(it.name || "").toLowerCase();
      if (name && (name === s || s.indexOf(name) !== -1 || name.indexOf(s) !== -1)) return it.id;
    }
    return null;
  }

  function clampBase(id, game) {
    const ids = baseIds(game);
    return ids.indexOf(id) === -1 ? DEFAULT_BASE : id;
  }

  function itemName(bundle, id) {
    const items = (bundle && bundle.items) || [];
    for (let i = 0; i < items.length; i += 1) {
      if (items[i] && items[i].id === id) return items[i].name || NAMES[id] || id;
    }
    return NAMES[id] || id;
  }

  function itemIcon(bundle, id) {
    const local = bundledIcon(id, bundle && bundle.game);
    if (local) return local;
    const items = (bundle && bundle.items) || [];
    for (let i = 0; i < items.length; i += 1) {
      if (items[i] && items[i].id === id && items[i].icon) return items[i].icon;
    }
    return "";
  }

  function absIcon(path) {
    const s = String(path || "");
    if (!s) return "";
    if (/^https?:/i.test(s)) return s;
    return "https://web.poecdn.com" + (s.charAt(0) === "/" ? s : "/" + s);
  }

  function buildBundle(league, json, game) {
    const values = {};
    const items = [];
    const primary = (json.core && json.core.primary) || (game === "poe1" ? "chaos" : "divine");
    values[primary] = 1;
    const lines = json.lines || [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line && line.id && line.primaryValue > 0) values[line.id] = line.primaryValue;
    }
    const rates = (json.core && json.core.rates) || {};
    Object.keys(rates).forEach((id) => {
      if (!values[id] && rates[id] > 0) values[id] = 1 / rates[id];
    });
    const src = json.items || (json.core && json.core.items) || [];
    for (let i = 0; i < src.length; i += 1) {
      const it = src[i];
      if (!it || !it.id) continue;
      items.push({
        id: it.id,
        name: it.name || it.id,
        detailsId: it.detailsId || "",
        icon: bundledIcon(it.id, game) || absIcon(it.image || it.icon || ""),
      });
    }
    return { league: league, fetchedAt: Date.now(), primary: primary, values: values, items: items };
  }

  function sendToWorker(payload) {
    const once = () =>
      new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(payload, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(new Error(err.message));
              return;
            }
            if (!resp || !resp.ok) {
              reject(new Error((resp && resp.error) || "fetch-failed"));
              return;
            }
            resolve(resp.json);
          });
        } catch (e) {
          reject(e);
        }
      });
    return once().catch((err) => {
      const msg = String((err && err.message) || err);
      if (msg.indexOf("Receiving end does not exist") === -1) throw err;
      return new Promise((r) => setTimeout(r, 250)).then(once);
    });
  }

  async function getCached(game) {
    try {
      const key = cacheKey(game);
      const r = await chrome.storage.local.get(key);
      return (r && r[key]) || null;
    } catch (_e) {
      return null;
    }
  }

  async function get(league, game) {
    if (!league) return null;
    game = normGame(game);
    const cached = await getCached(game);
    if (cached && cached.league === league && cached.game === game && Date.now() - cached.fetchedAt < CACHE_MS) {
      return cached;
    }
    try {
      const url = overviewUrl(game) + "?league=" + encodeURIComponent(league) + "&type=Currency";
      const json = await sendToWorker({ cmd: "ptb-rates-fetch", url: url });
      const bundle = buildBundle(league, json, game);
      bundle.game = game;
      try {
        await chrome.storage.local.set({ [cacheKey(game)]: bundle });
      } catch (_e) {}
      return bundle;
    } catch (_e) {
      return cached && cached.league === league && cached.game === game ? cached : null;
    }
  }

  async function getBase(game) {
    try {
      const key = baseKey(game);
      const r = await chrome.storage.local.get(key);
      const v = r && r[key];
      return clampBase(v ? String(v) : DEFAULT_BASE, game);
    } catch (_e) {
      return DEFAULT_BASE;
    }
  }

  async function setBase(id, game) {
    try {
      await chrome.storage.local.set({ [baseKey(game)]: clampBase(id, game) });
    } catch (_e) {}
  }

  return {
    CACHE_MS: CACHE_MS,
    DEFAULT_BASE: DEFAULT_BASE,
    baseIds: baseIds,
    NAMES: NAMES,
    clampBase: clampBase,
    itemIcon: itemIcon,
    get: get,
    getBase: getBase,
    setBase: setBase,
    convert: convert,
    format3: format3,
    resolveId: resolveId,
    itemName: itemName,
  };
})();
