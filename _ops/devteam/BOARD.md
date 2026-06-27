# DevTeam Board

> Claude가 생성·갱신하는 마스터 현황. Codex는 건드리지 않음(카드만). 프로토콜: `AGENTS.md` `## DevTeam`.

## run pt-1 — 거래소 즐겨찾기 MVP (썸네일+제목+이동)   (하달 준비: Claude 2026-06-27)

> 정본 계획 = `docs/trade-bookmark-plan.md`. MV3·순수 JS·빌드툴 없음. KR+글로벌 호스트 파라미터화, i18n ko 먼저. 기능 #2(다중 Live Search)는 범위 밖.
> **2 wave**(의존성): Wave1 `foundation`(공유 모듈+manifest) 통합 후 → Wave2 `content`·`popup` 병렬(파일 0겹침).
> 모듈 전략 = 클래식 스크립트 + `globalThis.PTB`(빌드툴 없이 공유). 계약 = 계획 §5.
> ⚠️ 브라우저 검증은 Codex 불가(헤드리스) → 라이브 검증 = 통합자(Claude)가 Chrome MCP로.

| task | wave | status | branch | 파일범위 | 한 줄 |
|---|---|---|---|---|---|
| pt-1-foundation | 1 | open | codex/pt-1-foundation | manifest.json · src/common/** · _locales/** | manifest + url.js/storage.js(PTB 계약) + ko i18n |
| pt-1-content-capture | 2 | open | codex/pt-1-content-capture | src/content/** | 거래소 페이지 "★즐겨찾기" 버튼 주입 + 클릭 저장(아이콘·제목 best-effort) |
| pt-1-popup-ui | 2 | open | codex/pt-1-popup-ui | src/popup/** | 즐겨찾기 목록(썸네일+제목+realm) + 이동/이름변경/삭제 |

> disjoint 확인: foundation(manifest+common+locales) / content(src/content) / popup(src/popup) — 파일 0겹침. content·popup은 common을 **읽기만**. Wave2 base = foundation 통합 후 master.
