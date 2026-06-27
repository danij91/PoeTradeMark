---
task: pt-1-popup-ui
run: pt-1
status: done          # open → wip → done → merged / blocked
owner: codex
branch: codex/pt-1-popup-ui
base: master          # ⚠️ Wave 2 — pt-1-foundation 통합 후의 master에서 분기 (군단장이 dispatch 시점에 보장)
files:
  - "src/popup/**"
---

## CONTEXT  (Claude 작성 — 이걸로 끝내라, 전체 탐색 금지)

- **프로젝트**: PoE 거래소 즐겨찾기 크롬 익스텐션(MV3, 순수 JS, 빌드툴 없음). 전체 계획 = `docs/trade-bookmark-plan.md`.
- **선행 의존(Wave 1, 이미 통합됨)** = `pt-1-foundation`. 너의 base엔 `src/common/url.js`·`src/common/storage.js`가 이미 있다(수정 금지):
  - `globalThis.PTB.storage.list()` → `Promise<Bookmark[]>`(최신순)
  - `globalThis.PTB.storage.update(id, patch)` / `.remove(id)` → `Promise<void>`
  - `globalThis.PTB.buildTradeUrl({host,type,league,searchId})` → string
- **manifest는 이미 `action.default_popup: "src/popup/popup.html"`** 로 선언됨. 너는 `src/popup/`의 html/js/css만 만든다.
- **Bookmark schema**(계획 §4): `{id,host,realm,type,league,searchId,title,iconUrl,query,sort,createdAt}`.
- **모듈 로드**: popup.html에서 클래식 스크립트 순서 로드 — `<script src="../common/url.js"></script><script src="../common/storage.js"></script><script src="popup.js"></script>`(상대경로 주의: popup은 `src/popup/`, common은 `src/common/` → `../common/`). 그러면 popup.js에서 `globalThis.PTB.*` 사용 가능.
- **i18n**: `chrome.i18n.getMessage('key')` 사용(키는 foundation의 `_locales/ko/messages.json`: popupTitle, jump, rename, delete, emptyList, realmKR, realmGlobal 등).
- **이동(jump)**: `chrome.tabs.create({ url })` — 권한 불필요(url만 여는 건 tabs 권한 없이 됨).

## SPEC  (Claude 작성)

**목표**: 팝업에서 즐겨찾기 목록을 보여주고(썸네일+제목+realm 뱃지) 이동·이름변경·삭제를 제공한다.

**건드릴 파일**: `src/popup/popup.html`, `src/popup/popup.js`, `src/popup/popup.css`

**구현**:

1. **popup.html**: 기본 골격 + 위 3 스크립트 순서 로드 + popup.css 링크. 컨테이너 `#list`.
2. **popup.js**:
   - 로드 시 `const items = await PTB.storage.list()` → 렌더. 비면 `emptyList` 메시지.
   - 각 항목 카드: 썸네일(`iconUrl` 있으면 `<img>`, 없으면 플레이스홀더 박스), 제목, realm 뱃지(`realm==='kr'?realmKR:realmGlobal`), 버튼 3개:
     - **이동**: `chrome.tabs.create({ url: PTB.buildTradeUrl(b) })`.
     - **이름변경**: `prompt()` 기본값 현재 title → 비어있지 않으면 `await PTB.storage.update(b.id, {title})` → 재렌더.
     - **삭제**: `await PTB.storage.remove(b.id)` → 재렌더.
   - 텍스트는 `chrome.i18n.getMessage`.
3. **popup.css**: 폭 ~320–360px, 스크롤 가능한 목록, 항목 카드 레이아웃(썸네일 좌·내용 우), 다크 친화 기본 색.

**인터페이스 계약**: `PTB.storage.list/update/remove`·`PTB.buildTradeUrl`(foundation 제공)를 **소비만**. common 파일 수정 금지. content 카드와 파일 0겹침(독립).

**검증 기준**:
- `node --check src/popup/popup.js` 통과.
- popup.html이 common 2파일을 popup.js보다 먼저 `../common/` 경로로 로드(상대경로 정확).
- (라이브는 통합자) 저장된 항목이 목록에 뜨고, 이동 버튼이 올바른 URL로 새 탭, 삭제/이름변경 즉시 반영.

**완료 정의(DoD)**:
- [ ] popup.html: 스크립트 순서/경로 정확, #list 컨테이너
- [ ] popup.js: list 렌더 + 이동/이름변경/삭제 + i18n + 빈 상태
- [ ] popup.css: 목록·썸네일 레이아웃
- [ ] `node --check` 통과

> 이 카드 + `files` 파일만. common은 읽기만(수정 금지). 막히면 LOG에 `blocked`.

---

## LOG  (Codex append — 카드만 수정, BOARD.md 건드리지 말 것)

- 2026-06-27 Codex: Built popup UI scaffold with bookmark list rendering, realm badges, jump/rename/delete actions using PTB globals, and popup styling. Verified `node --check src/popup/popup.js` passes and popup.html script order is common url/storage before popup.js.
