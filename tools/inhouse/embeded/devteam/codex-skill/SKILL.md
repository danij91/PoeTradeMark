---
name: devteam
description: >
  poeTradeBookmark 병렬 실행 팀의 Codex측 스킬. Claude가 _ops/devteam/ 보드에 올린
  disjoint task를 워크트리서 병렬 실행하고 결과를 카드 LOG·브랜치로 돌려준다.
  트리거: "devteam 실행", "보드 실행", "팀 task 처리", BOARD.md를 가리키는 하달.
---

# DevTeam — Codex 실행측 (슬림판)

권위 프로토콜 = repo의 `AGENTS.md` `## DevTeam`. **먼저 그걸 + `_ops/devteam/PRIMER.md`를 읽는다.**

> 이 파일은 repo 정본(`tools/inhouse/embeded/devteam/codex-skill/SKILL.md`)의 배포본이다 — 수정은 repo 정본에서 하고 `~/.codex/skills/devteam/`로 복사.

## 실행 절차

1. `_ops/devteam/BOARD.md` + 지정 run의 `cards/*.md`(status: open) 읽기.
2. 자기 task 픽업 → 카드 frontmatter status: wip + `## LOG`에 착수 기록.
3. **워크트리**에서 base(카드 `base` frontmatter)부터 작업. 카드 `files` 범위**만** 수정(disjoint 계약 — 범위 밖 금지):
   ```bash
   git worktree add -b codex/<slug> ../poeTradeBookmark.wt/<slug> <base>
   ```
   corpus·서브모듈 없음 → sparse 불필요. 같은 머신·같은 repo라 push 불필요(커밋이 메인 워크트리에 즉시 보임).
4. SPEC의 검증 기준·DoD 충족까지 루프 (가정 명시·최소 코드·외과적·검증까지 — Karpathy 4).
5. 커밋: Conventional Commits + run id `pt-N` 귀속. 브랜치 `codex/<slug>`.
6. 완료 → 카드 `## LOG`에 결과(브랜치·커밋 sha·검증결과·변경 파일수) append + status: done. 막히면 status: blocked + 사유.

## 금지

- 다른 task의 `files` 범위 침범 (충돌 유발).
- **BOARD.md 직접 수정** (Claude 전유 — 카드만 건드림).
- 작업 브랜치 / `master` 직접 머지 (통합·품질 게이트는 Claude 몫).
