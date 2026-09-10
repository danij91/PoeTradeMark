// 즐겨찾기 저장소 — chrome.storage.local 단일 키 "bookmarks" = Bookmark[]. globalThis.PTB.storage.
globalThis.PTB = globalThis.PTB || {};

PTB.bookmarkGame = function (bookmark) {
  return bookmark && bookmark.game === "poe2" ? "poe2" : "poe1";
};

PTB.storage = {
  async _read() {
    const { bookmarks } = await chrome.storage.local.get("bookmarks");
    return Array.isArray(bookmarks) ? bookmarks : [];
  },

  async _write(arr) {
    await chrome.storage.local.set({ bookmarks: arr });
  },

  // 최신순(createdAt 내림차순)
  async list(game) {
    const arr = await this._read();
    const bookmarks = arr
      .map((bookmark) => ({
        ...bookmark,
        game: PTB.bookmarkGame(bookmark),
        league: PTB.decodePathPart ? PTB.decodePathPart(bookmark.league) : bookmark.league,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    return game ? bookmarks.filter((bookmark) => bookmark.game === game) : bookmarks;
  },

  // id/createdAt 채워 앞에 추가, 만든 Bookmark 반환
  async add(partial) {
    const arr = await this._read();
    const game = PTB.bookmarkGame(partial);
    // 같은 게임 안에서 같은 제목이 이미 있으면 뒤에 (2),(3)… 붙여 유일하게
    let title = partial.title;
    const base = (partial.title || "").trim();
    if (base) {
      const taken = new Set(arr.filter((b) => PTB.bookmarkGame(b) === game).map((b) => b.title));
      title = base;
      let n = 2;
      while (taken.has(title)) {
        title = `${base} (${n})`;
        n += 1;
      }
    }
    const bookmark = {
      iconUrl: null,
      query: null,
      sort: null,
      ...partial,
      game,
      title,
      realm: partial.realm || PTB.hostToRealm(partial.host),
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    arr.unshift(bookmark);
    await this._write(arr);
    return bookmark;
  },

  async update(id, patch) {
    const arr = await this._read();
    const idx = arr.findIndex((b) => b.id === id);
    if (idx === -1) return;
    arr[idx] = { ...arr[idx], ...patch };
    await this._write(arr);
  },

  async remove(id) {
    const arr = await this._read();
    await this._write(arr.filter((b) => b.id !== id));
  },
};
