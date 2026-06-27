---
task: <slug>
run: pt-N
status: open          # open → wip → done → merged / blocked
owner: codex
branch: codex/<slug>
base: <세션 HEAD>      # 하달 시점 git branch --show-current
files:                # 이 task가 건드릴 범위 (disjoint — 범위 밖 수정 금지)
  - "src/x/**"
---

<!-- 자가체크(Claude): 이 카드만으로 신병이 *탐색 없이* 일하나?
     CONTEXT(필요 사실)·정확한 파일/라인·인터페이스 계약·검증 기준 다 박았나?
     못 채운 칸이 있으면 = 네가 아직 task를 충분히 이해 못 한 것. 채우고 하달. -->

## CONTEXT  (Claude 작성 — 신병은 이걸로 끝내야 코드베이스 안 헤맨다)

> 신병은 전체 탐색을 하지 않는다(`PRIMER.md`가 고정 지식, 이 칸이 task 지식).

- **필요한 사실** (2~3개): <예: 거래소 URL = `/trade/{type}/{league}/{id}`, 호스트가 realm 결정>
- **정확한 위치** (파일:라인 앵커): <예: `src/common/url.js:12` 근처 `parseTradeUrl`>
- **관련 선행 맥락**: <있으면 [[링크]]>

## SPEC  (Claude 작성)

**목표**: <한 줄>

**건드릴 파일**: (frontmatter `files`와 일치)

**인터페이스 계약**: <다른 task와 닿는 함수 시그니처·props·타입 — 있으면 명시. 없으면 "독립">

**검증 기준**: <어떻게 됐는지 확인하나 — 명령·동작·테스트. 약한 기준 금지>

**완료 정의(DoD)**:
- [ ] <체크>
- [ ] <체크>

> 신병에게: 이 카드 + `files`에 명시된 파일만 읽어라. **전체 코드베이스 탐색 금지.**
> 막히면 탐색 대신 `## LOG`에 `blocked` + 무엇이 빠졌는지 적고 멈춰라(군단장이 보강).

---

## LOG  (Codex append — 카드만 수정, BOARD.md 건드리지 말 것)

<!-- 예:
- 2026-MM-DD wip: 워크트리 생성, <접근 방향>
- 2026-MM-DD done: codex/<slug> @ <sha>. 검증: <결과>. 변경 파일 N개.
- (막히면) 2026-MM-DD blocked: <사유 — 카드에 빠진 사실 / 군단장 개입 필요>
-->
