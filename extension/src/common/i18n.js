// 커스텀 i18n — Chrome 기본 i18n(chrome.i18n)은 브라우저 언어를 따라가 인앱 전환이 안 됨.
// 그래서 전 언어를 번들하고 저장된 언어(ptbLang)로 전환한다. 사용법: PTB.i18n.t(key, fallback).
// {n} 같은 자리표시자는 호출부에서 .replace 로 채운다. 국가약자/리그명은 번역 대상 아님.
globalThis.PTB = globalThis.PTB || {};
(function () {
  var M = {
    en: {
      bookmarkButton: "★ Bookmark",
      popupTitle: "Trade Bookmarks",
      jump: "Open",
      rename: "Rename",
      delete: "Delete",
      emptyList: "No bookmarks saved yet.",
      saved: "Saved",
      noTitle: "(Untitled)",
      sidebarToggle: "★ List",
      openDash: "📡 Live",
      openDashboard: "📡 Live Dashboard",
      liveDashboard: "📡 Live Dashboard",
      openInTrade: "Go to Trade",
      goHideout: "🏠 Travel to Hideout",
      liveWaiting: "Waiting for new listings…",
      liveIdle: "Pick searches and press Start to collect live listings here.",
      start: "▶ Start",
      stop: "⏸ Stop",
      clearItems: "Clear items",
      selectLabel: "Selected",
      sending: "Sending…",
      sent: "✓ Sent",
      noListing: "Not found",
      cannotContact: "Offline",
      failed: "Failed",
      liveRecv: "🟢 Live received {n}",
      pausedInfo: "⏸ Paused · {n}",
      activateFailed: "✗ activation failed",
      corrupted: "Corrupted",
      liveOn: "📡 ON",
      liveOff: "📡 Live",
      maxN: "Max {n}",
      filterN: "Filters {n} ▾",
      collapse: "Collapse ▴",
      language: "Language",
      copyUrl: "📋 Copy",
      copied: "✓ Copied",
      maxExceeded: "Live runs at most {n} searches at once — select {n} or fewer.",
      footNote:
        "Read-only — it only gathers the site's official live search results in one place; it never auto-whispers or buys. Starting opens a background tab per search (up to 5 at once). Stop turns off live search but keeps the tabs so you can still travel to hideout from listings. Close this dashboard tab to fully stop.",
    },
    ko: {
      bookmarkButton: "★ 즐겨찾기",
      popupTitle: "거래소 즐겨찾기",
      jump: "이동",
      rename: "이름변경",
      delete: "삭제",
      emptyList: "저장된 즐겨찾기가 없습니다",
      saved: "저장됨",
      noTitle: "제목 없음",
      sidebarToggle: "★ 목록",
      openDash: "📡 라이브",
      openDashboard: "📡 라이브 대시보드",
      liveDashboard: "📡 라이브 대시보드",
      openInTrade: "거래소로",
      goHideout: "🏠 은신처로 이동",
      liveWaiting: "새 매물 대기 중…",
      liveIdle: "검색을 고르고 ‘시작’을 누르면 라이브 매물이 여기에 모입니다.",
      start: "▶ 시작",
      stop: "⏸ 정지",
      clearItems: "매물 비우기",
      selectLabel: "선택",
      sending: "보내는 중…",
      sent: "✓ 보냄",
      noListing: "매물 없음",
      cannotContact: "연락 불가",
      failed: "실패",
      liveRecv: "🟢 라이브 수신 {n}개",
      pausedInfo: "⏸ 일시정지 · {n}개",
      activateFailed: "✗ 활성실패",
      corrupted: "타락",
      liveOn: "📡 ON",
      liveOff: "📡 라이브",
      maxN: "최대 {n}개",
      filterN: "필터 {n}개 ▾",
      collapse: "접기 ▴",
      language: "언어",
      copyUrl: "📋 복사",
      copied: "✓ 복사됨",
      maxExceeded: "라이브는 최대 {n}개까지만 동시 실행할 수 있어요. 선택을 {n}개 이하로 줄여주세요.",
      footNote:
        "읽기전용 — 사이트 공식 라이브검색 결과를 한곳에 모아 볼 뿐, 자동 귓속말·구매는 하지 않습니다. 시작하면 검색마다 백그라운드 탭에서 라이브가 돌아갑니다(동시 최대 5개). 정지하면 라이브검색만 끄고 탭은 유지해 매물에서 은신처 이동을 계속 쓸 수 있습니다. 완전히 닫으려면 이 대시보드 탭을 닫으세요.",
    },
    ja: {
      bookmarkButton: "★ ブックマーク", popupTitle: "取引ブックマーク", jump: "開く", rename: "名前変更",
      delete: "削除", emptyList: "保存されたブックマークはありません", saved: "保存しました", noTitle: "（無題）",
      sidebarToggle: "★ 一覧", openDash: "📡 ライブ", openDashboard: "📡 ライブダッシュボード", liveDashboard: "📡 ライブダッシュボード",
      openInTrade: "取引へ", goHideout: "🏠 ハイドアウトへ移動", liveWaiting: "新着リストを待機中…",
      liveIdle: "検索を選んで「開始」を押すと、ライブのリストがここに集まります。", start: "▶ 開始", stop: "⏸ 停止",
      clearItems: "リストを消去", selectLabel: "選択", sending: "送信中…", sent: "✓ 送信済み", noListing: "見つかりません",
      cannotContact: "オフライン", failed: "失敗", liveRecv: "🟢 ライブ受信 {n}件", pausedInfo: "⏸ 一時停止 · {n}件",
      activateFailed: "✗ 有効化に失敗", corrupted: "コラプト", liveOn: "📡 ON", liveOff: "📡 ライブ", maxN: "最大 {n}件",
      filterN: "フィルター {n}件 ▾", collapse: "折りたたむ ▴", language: "言語",
      footNote: "読み取り専用 — サイト公式のライブ検索結果を一か所に集めて表示するだけで、自動ウィスパーや購入は行いません。開始すると検索ごとにバックグラウンドタブでライブ検索が動きます（同時最大5件）。停止するとライブ検索だけをオフにし、タブは維持されるのでリストからハイドアウトへの移動は引き続き使えます。完全に止めるにはこのダッシュボードのタブを閉じてください。",
    },
    es: {
      bookmarkButton: "★ Favorito", popupTitle: "Favoritos de intercambio", jump: "Abrir", rename: "Renombrar",
      delete: "Eliminar", emptyList: "Aún no hay favoritos guardados.", saved: "Guardado", noTitle: "(Sin título)",
      sidebarToggle: "★ Lista", openDash: "📡 En vivo", openDashboard: "📡 Panel en vivo", liveDashboard: "📡 Panel en vivo",
      openInTrade: "Ir al intercambio", goHideout: "🏠 Viajar al refugio", liveWaiting: "Esperando nuevas publicaciones…",
      liveIdle: "Elige búsquedas y pulsa Iniciar para reunir aquí las publicaciones en vivo.", start: "▶ Iniciar", stop: "⏸ Detener",
      clearItems: "Vaciar artículos", selectLabel: "Seleccionado", sending: "Enviando…", sent: "✓ Enviado", noListing: "No encontrado",
      cannotContact: "Desconectado", failed: "Falló", liveRecv: "🟢 En vivo recibidos {n}", pausedInfo: "⏸ En pausa · {n}",
      activateFailed: "✗ activación fallida", corrupted: "Corrupto", liveOn: "📡 ACTIVO", liveOff: "📡 En vivo", maxN: "Máx {n}",
      filterN: "Filtros {n} ▾", collapse: "Contraer ▴", language: "Idioma",
      footNote: "Solo lectura — únicamente reúne en un mismo lugar los resultados oficiales de la búsqueda en vivo del sitio; nunca susurra ni compra automáticamente. Al iniciar se abre una pestaña en segundo plano por cada búsqueda (hasta 5 a la vez). Detener apaga la búsqueda en vivo pero mantiene las pestañas para que aún puedas viajar al refugio desde las publicaciones. Cierra esta pestaña del panel para detenerlo por completo.",
    },
    fr: {
      bookmarkButton: "★ Favori", popupTitle: "Favoris de marché", jump: "Ouvrir", rename: "Renommer",
      delete: "Supprimer", emptyList: "Aucun favori enregistré", saved: "Enregistré", noTitle: "(Sans titre)",
      sidebarToggle: "★ Liste", openDash: "📡 En direct", openDashboard: "📡 Tableau de bord en direct", liveDashboard: "📡 Tableau de bord en direct",
      openInTrade: "Vers le marché", goHideout: "🏠 Aller au repaire", liveWaiting: "En attente de nouvelles offres…",
      liveIdle: "Choisissez des recherches et appuyez sur Démarrer pour collecter les offres en direct ici.", start: "▶ Démarrer", stop: "⏸ Arrêter",
      clearItems: "Vider les offres", selectLabel: "Sélectionné", sending: "Envoi…", sent: "✓ Envoyé", noListing: "Introuvable",
      cannotContact: "Hors ligne", failed: "Échec", liveRecv: "🟢 Reçu en direct {n}", pausedInfo: "⏸ En pause · {n}",
      activateFailed: "✗ échec d'activation", corrupted: "Corrompu", liveOn: "📡 ACTIF", liveOff: "📡 En direct", maxN: "Max {n}",
      filterN: "Filtres {n} ▾", collapse: "Réduire ▴", language: "Langue",
      footNote: "Lecture seule — rassemble simplement les résultats de la recherche en direct officielle du site en un seul endroit ; n'envoie jamais de message ni n'achète automatiquement. Le démarrage ouvre un onglet en arrière-plan par recherche (jusqu'à 5 à la fois). L'arrêt désactive la recherche en direct mais conserve les onglets pour pouvoir encore voyager vers le repaire depuis les offres. Fermez cet onglet du tableau de bord pour tout arrêter complètement.",
    },
    de: {
      bookmarkButton: "★ Lesezeichen", popupTitle: "Handels-Lesezeichen", jump: "Öffnen", rename: "Umbenennen",
      delete: "Löschen", emptyList: "Noch keine Lesezeichen gespeichert.", saved: "Gespeichert", noTitle: "(Ohne Titel)",
      sidebarToggle: "★ Liste", openDash: "📡 Live", openDashboard: "📡 Live-Dashboard", liveDashboard: "📡 Live-Dashboard",
      openInTrade: "Zum Handel", goHideout: "🏠 Zum Versteck reisen", liveWaiting: "Warte auf neue Angebote…",
      liveIdle: "Suchen auswählen und auf Start drücken, um Live-Angebote hier zu sammeln.", start: "▶ Start", stop: "⏸ Stopp",
      clearItems: "Angebote leeren", selectLabel: "Ausgewählt", sending: "Senden…", sent: "✓ Gesendet", noListing: "Nicht gefunden",
      cannotContact: "Offline", failed: "Fehlgeschlagen", liveRecv: "🟢 Live empfangen {n}", pausedInfo: "⏸ Pausiert · {n}",
      activateFailed: "✗ Aktivierung fehlgeschlagen", corrupted: "Verderbt", liveOn: "📡 AN", liveOff: "📡 Live", maxN: "Max. {n}",
      filterN: "Filter {n} ▾", collapse: "Einklappen ▴", language: "Sprache",
      footNote: "Nur-Lesen — sammelt lediglich die offiziellen Live-Suchergebnisse der Seite an einem Ort; flüstert oder kauft niemals automatisch. Beim Start öffnet sich pro Suche ein Hintergrund-Tab (bis zu 5 gleichzeitig). Stopp schaltet die Live-Suche aus, behält aber die Tabs, sodass du weiterhin von Angeboten zum Versteck reisen kannst. Schließe diesen Dashboard-Tab, um vollständig zu stoppen.",
    },
    th: {
      bookmarkButton: "★ บุ๊กมาร์ก", popupTitle: "บุ๊กมาร์กตลาด", jump: "เปิด", rename: "เปลี่ยนชื่อ",
      delete: "ลบ", emptyList: "ยังไม่มีบุ๊กมาร์กที่บันทึกไว้", saved: "บันทึกแล้ว", noTitle: "(ไม่มีชื่อ)",
      sidebarToggle: "★ รายการ", openDash: "📡 ไลฟ์", openDashboard: "📡 แดชบอร์ดไลฟ์", liveDashboard: "📡 แดชบอร์ดไลฟ์",
      openInTrade: "ไปที่ตลาด", goHideout: "🏠 เดินทางไปที่ซ่อน", liveWaiting: "กำลังรอประกาศใหม่…",
      liveIdle: "เลือกการค้นหาแล้วกดเริ่มเพื่อรวบรวมประกาศไลฟ์ที่นี่", start: "▶ เริ่ม", stop: "⏸ หยุด",
      clearItems: "ล้างรายการ", selectLabel: "เลือกแล้ว", sending: "กำลังส่ง…", sent: "✓ ส่งแล้ว", noListing: "ไม่พบ",
      cannotContact: "ออฟไลน์", failed: "ล้มเหลว", liveRecv: "🟢 รับไลฟ์ {n}", pausedInfo: "⏸ หยุดชั่วคราว · {n}",
      activateFailed: "✗ เปิดใช้งานล้มเหลว", corrupted: "เสื่อม", liveOn: "📡 เปิด", liveOff: "📡 ไลฟ์", maxN: "สูงสุด {n}",
      filterN: "ตัวกรอง {n} ▾", collapse: "ย่อ ▴", language: "ภาษา",
      footNote: "อ่านอย่างเดียว — เพียงรวบรวมผลการค้นหาไลฟ์อย่างเป็นทางการของเว็บไซต์ไว้ในที่เดียว ไม่กระซิบหรือซื้ออัตโนมัติ เมื่อเริ่มจะเปิดแท็บเบื้องหลังหนึ่งแท็บต่อการค้นหา (สูงสุด 5 พร้อมกัน) การหยุดจะปิดการค้นหาไลฟ์แต่ยังคงแท็บไว้เพื่อให้คุณเดินทางไปที่ซ่อนจากประกาศได้ ปิดแท็บแดชบอร์ดนี้เพื่อหยุดทั้งหมด",
    },
    ru: {
      bookmarkButton: "★ В закладки", popupTitle: "Закладки торговли", jump: "Открыть", rename: "Переименовать",
      delete: "Удалить", emptyList: "Закладок пока нет.", saved: "Сохранено", noTitle: "(Без названия)",
      sidebarToggle: "★ Список", openDash: "📡 Лайв", openDashboard: "📡 Лайв-панель", liveDashboard: "📡 Лайв-панель",
      openInTrade: "К торговле", goHideout: "🏠 В убежище", liveWaiting: "Ожидание новых лотов…",
      liveIdle: "Выберите поиски и нажмите «Старт», чтобы собирать лоты здесь.", start: "▶ Старт", stop: "⏸ Стоп",
      clearItems: "Очистить лоты", selectLabel: "Выбрано", sending: "Отправка…", sent: "✓ Отправлено", noListing: "Не найдено",
      cannotContact: "Не в сети", failed: "Ошибка", liveRecv: "🟢 Получено лайв {n}", pausedInfo: "⏸ Пауза · {n}",
      activateFailed: "✗ ошибка активации", corrupted: "Осквернён", liveOn: "📡 ВКЛ", liveOff: "📡 Лайв", maxN: "Макс. {n}",
      filterN: "Фильтры {n} ▾", collapse: "Свернуть ▴", language: "Язык",
      footNote: "Только чтение — собирает официальные результаты лайв-поиска сайта в одном месте; не шепчет и не покупает автоматически. При запуске для каждого поиска открывается фоновая вкладка (до 5 одновременно). «Стоп» отключает лайв-поиск, но оставляет вкладки, чтобы можно было переходить в убежище из лотов. Закройте эту вкладку панели, чтобы остановить полностью.",
    },
    pt: {
      bookmarkButton: "★ Favoritar", popupTitle: "Favoritos do Comércio", jump: "Abrir", rename: "Renomear",
      delete: "Excluir", emptyList: "Nenhum favorito salvo ainda.", saved: "Salvo", noTitle: "(Sem título)",
      sidebarToggle: "★ Lista", openDash: "📡 Ao vivo", openDashboard: "📡 Painel ao vivo", liveDashboard: "📡 Painel ao vivo",
      openInTrade: "Ir ao Comércio", goHideout: "🏠 Ir ao Esconderijo", liveWaiting: "Aguardando novos anúncios…",
      liveIdle: "Escolha buscas e clique em Iniciar para reunir os anúncios ao vivo aqui.", start: "▶ Iniciar", stop: "⏸ Parar",
      clearItems: "Limpar itens", selectLabel: "Selecionado", sending: "Enviando…", sent: "✓ Enviado", noListing: "Não encontrado",
      cannotContact: "Offline", failed: "Falhou", liveRecv: "🟢 Ao vivo: {n} recebido(s)", pausedInfo: "⏸ Pausado · {n}",
      activateFailed: "✗ falha na ativação", corrupted: "Corrompido", liveOn: "📡 LIGADO", liveOff: "📡 Ao vivo", maxN: "Máx {n}",
      filterN: "Filtros {n} ▾", collapse: "Recolher ▴", language: "Idioma",
      footNote: "Somente leitura — apenas reúne num só lugar os resultados oficiais da busca ao vivo do site; nunca envia sussurros nem compra automaticamente. Ao iniciar, abre uma aba em segundo plano por busca (até 5 ao mesmo tempo). Parar desliga a busca ao vivo, mas mantém as abas para você ainda poder ir ao esconderijo a partir dos anúncios. Feche esta aba do painel para parar por completo.",
    },
  };

  // 언어 선택 표시명(각 언어의 자기 표기).
  var LANG_NAMES = {
    ko: "한국어", en: "English", ja: "日本語", es: "Español",
    fr: "Français", de: "Deutsch", th: "ไทย", ru: "Русский", pt: "Português",
  };
  var LANGS = ["ko", "en", "ja", "es", "fr", "de", "th", "ru", "pt"];
  var cur = "ko";
  var cbs = []; // 언어 변경 시 재렌더 콜백(컨텍스트별 등록)

  PTB.i18n = {
    LANGS: LANGS,
    LANG_NAMES: LANG_NAMES,
    messages: M,
    getLang: function () {
      return cur;
    },
    setLang: function (l) {
      if (M[l]) cur = l;
      try {
        chrome.storage.local.set({ ptbLang: l });
      } catch (_e) {}
    },
    // 언어가 바뀌면(이 탭 또는 다른 탭/팝업에서) 호출될 재렌더 콜백 등록.
    onChange: function (cb) {
      if (typeof cb === "function") cbs.push(cb);
    },
    t: function (key, fallback) {
      var m = M[cur] || M.en || {};
      var v = m[key];
      if (v == null && M.en) v = M.en[key];
      return v != null ? v : fallback != null ? fallback : key;
    },
    // 저장된 언어 로드(없으면 브라우저 언어 매핑, 그래도 없으면 ko). 렌더 전에 await.
    init: function () {
      try {
        return chrome.storage.local.get("ptbLang").then(function (r) {
          var saved = r && r.ptbLang;
          if (saved && M[saved]) {
            cur = saved;
            return cur;
          }
          var base = String(navigator.language || "ko").toLowerCase().split("-")[0];
          cur = M[base] ? base : "ko";
          return cur;
        });
      } catch (_e) {
        return Promise.resolve(cur);
      }
    },
  };

  // ptbLang 이 어디서든 바뀌면 모든 컨텍스트(팝업·대시보드·열린 거래소 탭)에 즉시 전파.
  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local" || !changes.ptbLang) return;
      var nl = changes.ptbLang.newValue;
      if (nl && M[nl]) cur = nl;
      for (var i = 0; i < cbs.length; i += 1) {
        try {
          cbs[i](cur);
        } catch (_e) {}
      }
    });
  } catch (_e) {}
})();
