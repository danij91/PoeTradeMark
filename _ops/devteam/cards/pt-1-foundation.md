---
task: pt-1-foundation
run: pt-1
status: open          # open → wip → done → merged / blocked
owner: codex
branch: codex/pt-1-foundation
base: master          # 하달 시점 HEAD (d6efb43 초기 커밋)
files:
  - "manifest.json"
  - "src/common/**"
  - "_locales/**"
---

## CONTEXT  (Claude 작성 — 이걸로 끝내라, 전체 탐색 금지)

- **프로젝트**: PoE 거래소 즐겨찾기 크롬 익스텐션(MV3, 순수 JS, 빌드툴 없음). 전체 계획 = `docs/trade-bookmark-plan.md`(§3 아키텍처·§4 데이터모델·§5 계약을 그대로 구현).
- **이 카드 = 토대(Wave 1)**: 다른 두 카드(content/popup)가 import할 **공유 모듈 + manifest + i18n**. 너의 출력이 계약이다 — §5 시그니처를 **정확히** 지켜라(consumer가 그대로 의존).
- **모듈 전략(중요)**: 빌드툴 없음. ES module/dynamic import 쓰지 말 것. **클래식 스크립트 + `globalThis.PTB` 네임스페이스**:
  - 각 파일 상단 `globalThis.PTB = globalThis.PTB || {};` 후 `PTB.xxx = ...` 할당.
  - manifest `content_scripts.js`를 `[src/common/url.js, src/common/storage.js, src/content/content.js]` 순서로 선언(같은 isolated world라 PTB 공유). content.js는 이 카드 범위 아님 — manifest엔 경로만 선언(파일은 Wave 2가 생성).
- **거래소 URL 형태**: `https://{host}/trade/(search|exchange)/{league}/{searchId}`.
  - KR 예: `https://poe.kakaogames.com/trade/search/Ancestors/rPGyJX3RSQ`
  - 글로벌 예: `https://www.pathofexile.com/trade/search/Ancestors/4d6vyEQH9`
  - realm: host에 `kakaogames` 포함 → `"kr"`, 아니면 `"global"`.
- **chrome.storage**: MV3는 promise 지원 — `await chrome.storage.local.get('bookmarks')` / `.set({bookmarks})`. 단일 키 `"bookmarks"` = 배열.

## SPEC  (Claude 작성)

**목표**: 익스텐션 골격(manifest) + 공유 모듈(url.js, storage.js) + 한국어 i18n을 만든다. content/popup이 이 위에 붙는다.

**건드릴 파일**: `manifest.json`, `src/common/url.js`, `src/common/storage.js`, `_locales/ko/messages.json`

**구현**:

1. `manifest.json` (MV3):
   - `manifest_version: 3`, `name: "__MSG_extName__"`, `version: "0.1.0"`, `description: "__MSG_extDesc__"`, `default_locale: "ko"`
   - `permissions: ["storage", "unlimitedStorage"]`
   - `host_permissions: ["*://*.pathofexile.com/*", "*://poe.kakaogames.com/*"]`
   - `action: { "default_popup": "src/popup/popup.html" }`
   - `content_scripts: [{ "matches": ["*://*.pathofexile.com/trade/*", "*://poe.kakaogames.com/trade/*"], "js": ["src/common/url.js", "src/common/storage.js", "src/content/content.js"], "css": ["src/content/content.css"], "run_at": "document_idle" }]`
   - 아이콘 없음(생략). SW 없음.

2. `src/common/url.js` — `globalThis.PTB` 에 부착:
   - `PTB.hostToRealm(host)` → `"kr"` if `/kakaogames/`.test(host) else `"global"`.
   - `PTB.parseTradeUrl(href)` → `new URL(href)` 후 pathname을 `^/trade/(search|exchange)/([^/]+)/([^/]+)\/?$` 로 매칭. 성공 시 `{ host, realm: hostToRealm(host), type, league, searchId }`, 실패/비매칭 시 `null`. (잘못된 href는 try/catch로 null.)
   - `PTB.buildTradeUrl({host, type, league, searchId})` → `` `https://${host}/trade/${type}/${league}/${searchId}` ``.

3. `src/common/storage.js` — `globalThis.PTB.storage` 에 부착 (Bookmark = 계획 §4):
   - `list()` → 배열 반환, `createdAt` 내림차순(최신 먼저).
   - `add(partial)` → `id=crypto.randomUUID()`, `createdAt=Date.now()` 채워 배열 앞에 push, 저장, 만든 Bookmark 반환. realm은 partial.host로 채우거나 partial.realm 사용.
   - `update(id, patch)` → 해당 id 병합 저장.
   - `remove(id)` → 해당 id 제거 저장.
   - 내부 헬퍼 `_read()/_write(arr)` (chrome.storage.local, 키 `"bookmarks"`, 없으면 `[]`).

4. `_locales/ko/messages.json` — 키: `extName`(예: "PoE 거래소 즐겨찾기"), `extDesc`, `bookmarkButton`("★ 즐겨찾기"), `popupTitle`, `jump`("이동"), `rename`("이름변경"), `delete`("삭제"), `emptyList`("저장된 즐겨찾기가 없습니다"), `realmKR`("한국"), `realmGlobal`("글로벌"), `saved`("저장됨"). 각 `{ "message": "..." }` 형식.

**인터페이스 계약**: 위 §5(계획) 시그니처가 **공개 계약**. content/popup이 import하니 이름·반환형 변경 금지.

**검증 기준**:
- `node --check src/common/url.js && node --check src/common/storage.js` 통과.
- `node -e`로 url.js 로직 단위 확인(globalThis.PTB 흉내): `parseTradeUrl`이 위 KR/글로벌 예시 2개에서 `{host, realm, type:'search', league:'Ancestors', searchId}` 정확히 반환, 비거래소 URL은 `null`. `buildTradeUrl`이 round-trip(파싱→빌드 동일 URL).
- `node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"` 및 messages.json 파싱 통과.

**완료 정의(DoD)**:
- [ ] manifest.json 유효(JSON) + 위 필드 충족
- [ ] url.js 3함수 계약대로, 단위 검증 통과
- [ ] storage.js CRUD 계약대로, `node --check` 통과
- [ ] _locales/ko/messages.json 위 키 포함

> 이 카드 + `files` 파일만. 전체 탐색 금지. 막히면 LOG에 `blocked` + 빠진 사실.

---

## LOG  (Codex append — 카드만 수정, BOARD.md 건드리지 말 것)
