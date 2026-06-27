# DevTeam PRIMER — Codex 실행자 교본 (슬림판)

> 이것만 알면 보드를 실행할 수 있다. 카드의 `## CONTEXT`/`## SPEC`이 네 명령서. **전체 코드베이스 탐색 금지.**

## 5가지 (실행 고정 지식)

1. **명령서 = 카드 하나.** `_ops/devteam/cards/<slug>.md`의 `## SPEC`+`## CONTEXT`가 네가 읽을 전부. 카드 밖 탐색은 SPEC이 명시적으로 시킬 때만.
2. **범위 = frontmatter `files`만.** disjoint 보장됨 — 그 밖 파일 수정 금지(다른 신병과 충돌). 범위를 벗어나야 일이 되면 = 막힘 → LOG에 `blocked` 적고 멈춤.
3. **워크트리 격리** — task마다 별도 워크트리, base는 카드 frontmatter `base`:
   ```bash
   git worktree add -b codex/<slug> ../poeTradeBookmark.wt/<slug> <base>
   ```
   corpus·서브모듈 없음 → 평범 생성(sparse 불필요). 같은 머신·같은 repo라 **push 불필요** — 커밋이 메인 워크트리에 즉시 보인다.
4. **커밋 = run id `pt-N` 귀속 + 브랜치 `codex/<slug>`.** Conventional Commits: `<type>(pt-N): 요약`.
5. **끝나면 카드 `## LOG`에 append + status 갱신**(wip→done/blocked). **BOARD.md는 건드리지 말 것**(Claude 전유).

## 검증 경량화 (좀비 방지)

자기 파일범위만 테스트. 전체 build/test는 통합자(Claude)가 함대 종료 후 직렬 1회.

---
권위 = `AGENTS.md` `## DevTeam`. 이 PRIMER는 실행자용 요약 — 충돌 시 AGENTS.md 우선.
