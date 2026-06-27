---
name: devteam
description: >
  Claude(설계·통합) + Codex(워크트리 병렬 실행) 오케스트레이션. 목표를 disjoint task로
  분해해 _ops/devteam/ 보드에 하달하고, Codex가 워크트리서 병렬 실행한 결과를 검토·통합한다.
  트리거: "/devteam", "개발팀", "팀에 뿌려", "병렬로 시켜", "팀 현황", "팀 통합", "하달".
---

# DevTeam (슬림판) — Claude(군단장) 실행 가이드

프로토콜 SSOT = `AGENTS.md` `## DevTeam`. 이 파일은 군단장(Claude)용 실행 절차.
사용자 의도로 3모드 분기. Claude는 Codex를 직접 못 켠다 → "하달 한 줄"이 유일한 수동 이음매.

## 모드 1 — 하달 (`/devteam <목표>`, "팀에 뿌려")

1. **분해**: 목표를 파일 범위 disjoint한 N개 task로. 못 쪼개면 솔직히 "이건 순차"라 말하고 병렬 강행 금지.
2. **run id**: BOARD에서 다음 `pt-N` 눈으로 +1 (발급기 없음 — 슬림판).
3. **카드**: task당 `_ops/devteam/cards/<slug>.md` (`cards/_TEMPLATE.md` 양식). `## CONTEXT`(이 세션에서 든 맥락을 박아 신병이 탐색 안 하게)+`## SPEC`(목표·파일·계약·검증·DoD). frontmatter `files` disjoint, `base`=`git branch --show-current`.
4. **BOARD**: run 헤더 + task 테이블 갱신.
5. **커밋**: 카드·BOARD 커밋 (pt-N 귀속).
6. **하달 한 줄 출력**: Codex에 붙여넣을 명령. 예 —
   > `poeTradeBookmark devteam 실행 — _ops/devteam/PRIMER.md 읽고, _ops/devteam/BOARD.md run pt-N의 open task를 각자 워크트리서 카드 CONTEXT/SPEC만으로 처리(전체 탐색 금지), 카드 LOG append + codex/<slug> 커밋.`

## 모드 2 — 현황 (`/devteam status`, "팀 현황")

1. `cards/*.md` status 집계 → BOARD 재생성.
2. done task: `codex/<slug>` 브랜치 diff 요약 + 카드 LOG 확인.
3. 보고: 표(task | status | branch | 한줄) + 미검토 done→통합 제안, blocked→사유.

실시간(지금 도는지): `node tools/inhouse/embeded/devteam/devteam-watch.mjs -w`.

## 모드 3 — 통합 (`/devteam integrate`, "팀 통합")

1. done 브랜치 diff 검토(품질 게이트=Claude). 문제 없으면 작업 브랜치 머지(충돌 해소).
2. 머지 후 정리: `git worktree remove ../poeTradeBookmark.wt/<slug>` + `git branch -d codex/<slug>`.
3. 카드 status: merged. 전부 끝나면 통합 게이트(전체 build/test) 직렬 1회.

`master` 머지는 사용자 명시 요청 시만 — 자율 머지 금지.

## 워크트리 (평범 — corpus·서브모듈 없음)

```bash
git worktree add -b codex/<slug> ../poeTradeBookmark.wt/<slug> <base>
```
같은 머신·같은 repo라 push/fetch 불필요(`.git` object store 공유). **선결: repo에 커밋 1개 이상.**

## 규율

- disjoint 최우선. BOARD는 Claude 전유(Codex는 카드만). 되돌리기 어려운 머지는 Claude 직접.
- trivial·읽기전용·단일파일은 팀 안 띄움. 다파일·병렬 이득 있을 때만.
