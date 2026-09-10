// 콘텐츠 스크립트는 CORS 때문에 poe.ninja를 직접 못 친다. 여기(확장 origin)에서만 fetch.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.cmd === "ptb-ping") {
    sendResponse({ ok: true });
    return;
  }
  if (msg.cmd !== "ptb-rates-fetch") return;
  const url = String(msg.url || "");
  if (
    url.indexOf("https://poe.ninja/poe2/api/economy/") !== 0 &&
    url.indexOf("https://poe.ninja/poe1/api/economy/") !== 0
  ) {
    sendResponse({ ok: false, error: "bad-url" });
    return;
  }
  fetch(url, { credentials: "omit" })
    .then((res) => {
      if (!res.ok) throw new Error("http " + res.status);
      return res.json();
    })
    .then((json) => sendResponse({ ok: true, json: json }))
    .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
  return true;
});
