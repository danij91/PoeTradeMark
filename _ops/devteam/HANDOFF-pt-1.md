# 핸드오프 — run pt-1 (다음 세션 Claude에게)

아래 블록을 새 세션 첫 메시지로 붙여넣으면 이어서 진행된다.

---

poeTradeBookmark 프로젝트 이어서. **PoE 거래소 즐겨찾기 익스텐션(기능#1 MVP)을 devteam(Codex 군단)으로 빌드**할 차례.

**먼저 읽어(컨텍스트, 전부 master에 커밋됨):**
- `docs/trade-bookmark-plan.md` — 상세 계획 + 조사 핵심(검색ID 정체·realm·ToS)
- `_ops/devteam/BOARD.md` — run pt-1 (2 wave)
- `_ops/devteam/cards/pt-1-{foundation,content-capture,popup-ui}.md` — 카드 3장
- `AGENTS.md` `## DevTeam` — 슬림 프로토콜

**현재 상태:** devteam 슬림 세팅 완료, Codex 스킬 `~/.codex/skills/devteam` 설치됨, 커밋 2개(d6efb43 세팅, 1181a6c 계획·카드). `/devteam` 스킬 = `poeTradeBookmark:devteam`.

**진행 순서:**
1. **시작 전 나한테 2개 확인**: ① 스택을 순수 JS(빌드툴 없음)로 가정해놨는데 그대로 갈지 vs React/Vite(바꾸면 카드 SPEC 수정). ② codex CLI가 PATH에 있는지(`Get-Command codex` — 없으면 codex-launch.ps1 안 됨).
2. **Wave 1 — `pt-1-foundation`** 먼저(공유 모듈 url.js/storage.js + manifest + ko i18n). 작고 계약 정의자라 네가 직접 만들어도 되고 Codex로 하달해도 됨. 검증(`node --check` + parseTradeUrl 단위테스트) 후 **master 통합**.
3. **Wave 2 — `pt-1-content-capture` + `pt-1-popup-ui` 병렬**. foundation 통합된 master에서 각자 워크트리:
   `git worktree add -b codex/<slug> ../poeTradeBookmark.wt/<slug> master`
   Codex에 하달 한 줄 전달 → 끝나면 검토 → 작업브랜치/master 통합 → 워크트리·브랜치 정리.
4. **라이브 검증(네 몫)**: Chrome MCP(`mcp__Claude_in_Chrome__*`)로 unpacked 로드 후 KR(poe.kakaogames.com)·글로벌(pathofexile.com) 거래소에서 버튼·저장·목록·이동 확인. (MCP 없으면 나한테 수동 확인 요청.)

**Codex 하달 한 줄 (Wave 2, 내가 Codex 창에 붙여넣을 것):**
> poeTradeBookmark devteam 실행 — `_ops/devteam/PRIMER.md` 읽고, `_ops/devteam/BOARD.md` run pt-1의 Wave2 open 카드(pt-1-content-capture, pt-1-popup-ui)를 각자 워크트리서 카드 CONTEXT/SPEC만으로 처리(전체 탐색 금지), 카드 LOG append + `codex/<slug>` 커밋.

**불변 제약:** ToS 안전선 = 읽기전용 + 수동 동작만(이동·귓속말 복사). 자동 귓속말/구매/이동 금지. 거래소 API 직접 호출은 MVP에서 안 함(아이콘은 결과 DOM에서 긁음).

---
