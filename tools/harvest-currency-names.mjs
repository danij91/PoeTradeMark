// One-shot: GGG trade static → extension/src/assets/currency-names.js
const OUT = new URL("../extension/src/assets/currency-names.js", import.meta.url);
const LANGS = [
  { lang: "ko", host: "https://poe.kakaogames.com" },
  { lang: "ja", host: "https://jp.pathofexile.com" },
  { lang: "de", host: "https://de.pathofexile.com" },
  { lang: "fr", host: "https://fr.pathofexile.com" },
  { lang: "es", host: "https://es.pathofexile.com" },
  { lang: "ru", host: "https://ru.pathofexile.com" },
  { lang: "pt", host: "https://br.pathofexile.com" },
  { lang: "th", host: "https://th.pathofexile.com" },
  { lang: "tw", host: "https://pathofexile.tw" },
];
const GAMES = [
  { key: "poe2", path: "/api/trade2/data/static" },
  { key: "poe1", path: "/api/trade/data/static" },
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchJson(url) {
  let last = "";
  for (let i = 0; i < 4; i += 1) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    const text = await res.text();
    last = `${res.status} ${text.slice(0, 80)}`;
    if (res.ok && text.startsWith("{")) return JSON.parse(text);
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw new Error(`fail ${url} :: ${last}`);
}

function collect(json) {
  const map = {};
  const groups = (json && json.result) || [];
  for (const g of groups) {
    const entries = (g && g.entries) || [];
    for (const e of entries) {
      if (!e || !e.id || e.id === "sep" || !e.text) continue;
      map[e.id] = e.text;
    }
  }
  return map;
}

const names = { poe2: {}, poe1: {} };

for (const game of GAMES) {
  for (const { lang, host } of LANGS) {
    const url = host + game.path;
    process.stdout.write(`${game.key} ${lang} ${url}\n`);
    const map = collect(await fetchJson(url));
    const ids = Object.keys(map);
    process.stdout.write(`  ${ids.length} ids\n`);
    for (const id of ids) {
      const text = map[id];
      if (!text) continue;
      names[game.key][id] = names[game.key][id] || {};
      names[game.key][id][lang] = text;
    }
  }
}

const { writeFile } = await import("node:fs/promises");
const header =
  "// Localized currency names from GGG/Kakao trade static. English comes from ninja.\n" +
  "globalThis.PTB = globalThis.PTB || {};\n" +
  "globalThis.PTB.currencyNames = ";
await writeFile(OUT, header + JSON.stringify(names) + ";\n", "utf8");
console.log("wrote poe2", Object.keys(names.poe2).length, "poe1", Object.keys(names.poe1).length);
