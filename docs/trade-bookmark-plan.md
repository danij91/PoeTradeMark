# PoE 거래소 즐겨찾기 익스텐션 — 개발 계획 (run pt-1)

> 이 문서 = run pt-1의 컨텍스트 SSOT. 세션이 바뀌어도 여기 + 카드만 읽으면 이어갈 수 있다.
> 카드: `_ops/devteam/cards/pt-1-*.md`. 보드: `_ops/devteam/BOARD.md`.

## 0. 목표 / 범위

**기능 #1 (필수)**: PoE 거래소 검색을 즐겨찾기. MVP 한 항목 = **썸네일 + 제목 + 거래소로 이동 버튼**(+ 삭제·이름변경). 기능 #2(한 창 다중 Live Search)는 **이번 범위 아님**(나중).

## 1. 확정된 결정 (사용자 합의)

- **대상 서버**: 한국(poe.kakaogames.com) **우선**, 글로벌(www.pathofexile.com) **동시 지원**. 코드는 **호스트 파라미터화** — 호스트가 곧 realm. 테스트는 KR부터.
- **i18n**: 한국어 먼저(`_locales/ko`), 영어는 구조만 잡고 나중(`_locales/en`).
- **기능 #2**: 보류. 1번 완성 후 Origin 기술검증(스파이크) 거쳐 재결정.
- **항목 표시**: 썸네일+제목+이동(최소). 조건 JSON은 **내부 저장만**(화면 표시 X — 나중에 사람이 읽는 조건/스탯 텍스트 변환).
- **스택 (가정)**: **순수 JS, 빌드툴 없음** — `chrome://extensions`에 unpacked로 바로 로드. 단순함 우선. (프레임워크/Vite 원하면 카드 SPEC가 바뀜 — 시작 전 사용자에게 확인 권장.)
- **ToS 안전선**: **읽기 전용 + 수동 동작만**(이동/귓속말 복사). 자동 귓속말·자동구매·자동이동 = 밴 사유, 절대 X.

## 2. 조사 핵심 (재시작 시 잃으면 안 되는 사실)

- **검색 ID는 "암호화"가 아니라 서버가 발급한 단축 ID**(URL 단축기). 조건 JSON을 POST하면 서버가 저장하고 짧은 ID(`4d6vyEQH9`)를 발급 → 그 ID가 URL·Live소켓·fetch에 재사용.
- **그래서**: 같은 조건도 검색마다 **새 ID**, **KR≠글로벌**(완전 분리 백엔드), ID는 **만료됨**(미사용 ~6개월, 더 짧게도). → **ID(URL)만 저장하면 언젠가 죽음.** 그래서 schema에 `query`(조건 JSON) 필드를 둬서 나중에 재생성 가능하게(이번엔 저장만, 캡처는 best-effort).
- **KR/글로벌 API 경로 동일**, 호스트만 다름. 이번 MVP는 API를 직접 호출하지 않음(아이콘은 결과 DOM에서 긁음) → rate-limit·Cloudflare·인증 이슈 거의 없음.
- (보조) 살아있는 ID는 `GET /api/trade/search/{league}/{id}`로 조건 역추출 가능 — 단 만료 시 끝, 비공식. 이번 MVP 미사용.

## 3. 아키텍처 (MV3, 순수 JS)

- **서비스워커 없음** — MVP는 소켓·교차출처 fetch가 없어서 불필요.
- **콘텐츠 스크립트** (`*.pathofexile.com/trade/*`, `poe.kakaogames.com/trade/*`): 현재 검색 감지 → "★ 즐겨찾기" 버튼 주입 → 클릭 시 레코드 캡처(아이콘·제목 best-effort) → `chrome.storage.local` 저장.
- **popup**: 즐겨찾기 목록 렌더(썸네일·제목·realm 뱃지) + 이동/이름변경/삭제.
- **모듈 전략 (빌드툴 없이 공유)**: 클래식 스크립트 + 전역 네임스페이스 `globalThis.PTB`.
  - `src/common/url.js` → `PTB.parseTradeUrl/buildTradeUrl/hostToRealm`
  - `src/common/storage.js` → `PTB.storage.{list,add,update,remove}`
  - manifest `content_scripts.js = [url.js, storage.js, content.js]` (순서 로드, 같은 isolated world라 `PTB` 공유)
  - popup.html은 `<script src=url.js><script src=storage.js><script src=popup.js>` 순서로 로드.
  - → ES module/dynamic import/web_accessible_resources **불필요**.

## 4. 데이터 모델 (storage.js)

`chrome.storage.local` 단일 키 `"bookmarks"` = `Bookmark[]`.

```js
/**
 * @typedef {Object} Bookmark
 * @property {string}      id        crypto.randomUUID()
 * @property {string}      host      "poe.kakaogames.com" | "www.pathofexile.com"
 * @property {"kr"|"global"} realm   host에서 파생
 * @property {"search"|"exchange"} type
 * @property {string}      league    "Ancestors"
 * @property {string}      searchId  "rPGyJX3RSQ"
 * @property {string}      title     사용자 편집 가능 (기본: "<league> · <searchId>")
 * @property {string|null} iconUrl   web.poecdn.com 썸네일 (best-effort, 없으면 null)
 * @property {Object|null} query     검색 조건 JSON (이번엔 보통 null — 향후 durability)
 * @property {Object|null} sort      정렬 (이번엔 null)
 * @property {number}      createdAt Date.now()
 */
```

## 5. 모듈 계약 (인터페이스 — 카드 간 disjoint 경계)

```js
// src/common/url.js  (globalThis.PTB)
PTB.parseTradeUrl(href: string)
  → { host, realm, type, league, searchId } | null
  // 매칭: https://{host}/trade/(search|exchange)/{league}/{searchId}
PTB.buildTradeUrl({ host, type, league, searchId }) → string
PTB.hostToRealm(host: string) → "kr" | "global"   // host에 "kakaogames" 포함 → "kr"

// src/common/storage.js  (globalThis.PTB)
PTB.storage.list() → Promise<Bookmark[]>            // 최신순
PTB.storage.add(partial) → Promise<Bookmark>        // id/createdAt 채움
PTB.storage.update(id, patch) → Promise<void>
PTB.storage.remove(id) → Promise<void>
```

## 6. 파일 트리

```
manifest.json
src/common/url.js          # 카드 pt-1-foundation
src/common/storage.js      # 카드 pt-1-foundation
src/content/content.js     # 카드 pt-1-content-capture
src/content/content.css    # 카드 pt-1-content-capture
src/popup/popup.html       # 카드 pt-1-popup-ui
src/popup/popup.js         # 카드 pt-1-popup-ui
src/popup/popup.css        # 카드 pt-1-popup-ui
_locales/ko/messages.json  # 카드 pt-1-foundation
```
(아이콘 없음 = 크롬 기본. SW 없음.)

## 7. 실행 계획 (2 wave — disjoint 의존성 때문)

세 카드는 `src/common`(foundation)을 import한다. 워크트리는 **커밋된 base**만 갖고 가므로, foundation을 먼저 합쳐야 content/popup 워크트리가 실제 `PTB`를 갖는다.

- **Wave 1**: `pt-1-foundation` (manifest + common + locales). 검증 → master 통합.
- **Wave 2** (병렬): `pt-1-content-capture` + `pt-1-popup-ui`. base = Wave1 통합 후 master. 둘은 파일 0겹침 → 동시 안전.

| 카드 | wave | files | 검증(Codex) | 라이브검증(Claude) |
|---|---|---|---|---|
| pt-1-foundation | 1 | manifest.json, src/common/**, _locales/** | `node --check` + parseTradeUrl 2개 예시 URL 단위테스트 통과, manifest JSON.parse OK | unpacked 로드 에러 0 |
| pt-1-content-capture | 2 | src/content/** | `node --check`, 계약 준수, 양 호스트 매칭 정규식 | KR·글로벌 검색페이지서 버튼 뜨고 클릭→storage 저장 |
| pt-1-popup-ui | 2 | src/popup/** | `node --check`, 계약 준수 | 목록 렌더·이동/삭제/이름변경 동작 |

> **브라우저 검증은 Codex가 못 함**(헤드리스). Codex = 정적 검증(파싱·계약·로직). **라이브 검증 = 통합자(Claude)** — Chrome MCP(`mcp__Claude_in_Chrome__*`)로 unpacked 로드 후 KR/글로벌 거래소에서 확인.

## 8. 리스크 / 가드

- 거래소 결과 DOM 셀렉터(아이콘·아이템명 긁기)는 **사이트 의존·깨지기 쉬움** → content.js에서 best-effort(try/catch, 실패 시 null/기본값). 라이브에서 셀렉터 튜닝.
- SPA라 URL이 reload 없이 바뀜 → content.js는 location 변화를 감지(폴링 ~1s 또는 history.pushState 후킹).
- 비공식 영역 → 읽기전용·수동만. "GGG 비공인" 고지 후순위.

## 9. 보류(다음 단계)

아이콘 에셋 · 사람이 읽는 조건 표시(스탯ID→텍스트, `/api/trade/data/stats`) · query 캡처(페이지 state/POST 가로채기) · 폴더 · 영어 i18n · **기능 #2(다중 Live Search, Origin 스파이크 선행)**.
