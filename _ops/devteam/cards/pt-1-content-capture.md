---
task: pt-1-content-capture
run: pt-1
status: done          # open → wip → done → merged / blocked
owner: codex
branch: codex/pt-1-content-capture
base: master          # ⚠️ Wave 2 — pt-1-foundation 통합 후의 master에서 분기 (군단장이 dispatch 시점에 보장)
files:
  - "src/content/**"
---

## CONTEXT  (Claude 작성 — 이걸로 끝내라, 전체 탐색 금지)

- **프로젝트**: PoE 거래소 즐겨찾기 크롬 익스텐션(MV3, 순수 JS, 빌드툴 없음). 전체 계획 = `docs/trade-bookmark-plan.md`.
- **선행 의존(Wave 1, 이미 통합됨)** = `pt-1-foundation`. 너의 base엔 `src/common/url.js`·`src/common/storage.js`가 이미 있다. **그걸 그대로 쓴다(수정 금지 — 다른 카드 범위)**:
  - `globalThis.PTB.parseTradeUrl(href)` → `{host, realm, type, league, searchId}|null`
  - `globalThis.PTB.storage.add(partial)` → `Promise<Bookmark>`
  - manifest는 이미 `content_scripts.js = [url.js, storage.js, content.js]`, `css=[content.css]` 로 너의 파일을 선언해둠. 너는 `src/content/content.js`·`src/content/content.css`만 만든다.
- **로드 순서 덕에** content.js 실행 시점엔 `PTB.parseTradeUrl`·`PTB.storage`가 이미 존재(같은 isolated world).
- **Bookmark schema**(계획 §4): `{id,host,realm,type,league,searchId,title,iconUrl,query,sort,createdAt}` — id/createdAt은 `storage.add`가 채움. 너는 `{host,realm,type,league,searchId,title,iconUrl,query:null,sort:null}` 넘김.
- **거래소는 SPA** — URL이 reload 없이 바뀜. location 변화 감지 필요.
- **DOM 긁기는 best-effort** — 거래소 결과 셀렉터는 사이트 의존이라 깨질 수 있음. try/catch로 감싸고 실패 시 null/기본값. 라이브 튜닝은 통합자 몫.

## SPEC  (Claude 작성)

**목표**: 거래소 검색 페이지에 "★ 즐겨찾기" 버튼을 주입하고, 클릭 시 현재 검색을 `chrome.storage.local`에 저장한다.

**건드릴 파일**: `src/content/content.js`, `src/content/content.css`

**구현**:

1. **현재 검색 감지**: `PTB.parseTradeUrl(location.href)`. SPA 대응 — `setInterval`(~1000ms)로 `location.href` 변화를 폴링하거나 `history.pushState`/`popstate` 후킹. URL이 유효 검색(파싱 결과 non-null이고 `searchId` 존재)일 때만 버튼 표시, 아니면 숨김.

2. **버튼 주입**: 사이트 DOM 구조에 의존하지 않도록 **position:fixed 플로팅 버튼**(우하단 등) 1개. 라벨 = `chrome.i18n.getMessage('bookmarkButton')`. 스타일 = `content.css`(고유 클래스 prefix `ptb-`로 사이트 CSS 충돌 회피). 중복 주입 방지(이미 있으면 재사용).

3. **클릭 → 저장**:
   - `const info = PTB.parseTradeUrl(location.href)` (null이면 무시).
   - **아이콘(best-effort)**: 결과 영역에서 첫 `img[src*="poecdn"]`의 src. 없으면 null.
   - **제목(best-effort)**: 첫 결과의 아이템명 비슷한 텍스트를 합리적 셀렉터로 시도(try/catch). 실패 시 기본값 `` `${info.league} · ${info.searchId}` ``.
   - `await PTB.storage.add({ ...info, title, iconUrl, query: null, sort: null })`.
   - **피드백**: 버튼을 잠깐 "저장됨"(`chrome.i18n.getMessage('saved')`)으로 바꿨다 복구(간단한 시각 확인).

4. 콘솔 에러 없게, 비거래소 경로에선 아무것도 안 함.

**인터페이스 계약**: `PTB.parseTradeUrl`·`PTB.storage.add`(foundation 제공)를 **소비만**. 시그니처 변경·common 파일 수정 금지. popup 카드와 파일 0겹침(독립).

**검증 기준**:
- `node --check src/content/content.js` 통과.
- 정규식/로직 리뷰: KR(`poe.kakaogames.com`)·글로벌(`www.pathofexile.com`) 둘 다 `/trade/search/...`에서 동작하도록 작성됐는지(파싱은 foundation 위임이라 호출만 정확히).
- (라이브는 통합자) 로드 후 양 호스트 검색페이지서 버튼 표시 + 클릭 시 storage에 레코드 1개 추가.

**완료 정의(DoD)**:
- [ ] content.js: SPA URL 감지 + 플로팅 버튼 주입 + 클릭 저장
- [ ] 아이콘·제목 best-effort(try/catch, 폴백)
- [ ] content.css: `ptb-` prefix, 사이트 충돌 회피
- [ ] `node --check` 통과, 콘솔 에러 유발 코드 없음

> 이 카드 + `files` 파일만. common은 읽기만(수정 금지). 막히면 LOG에 `blocked`.

---

## LOG  (Codex append — 카드만 수정, BOARD.md 건드리지 말 것)

- done: Built fixed trade bookmark overlay button with SPA URL detection, best-effort title/icon capture, and storage add flow. Verification: `node --check src/content/content.js` passed.
