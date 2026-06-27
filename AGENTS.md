## Karpathy 4 원칙 (R-17)

코딩 시 매 turn 자동 적용. 전문: `~/.claude/CLAUDE.md`.
1. Think Before Coding — 가정 명시
2. Simplicity First — 최소 코드
3. Surgical Changes — 꼭 필요한 곳만
4. Goal-Driven Execution — 검증까지 루프

## DevTeam — Claude + Codex 병렬 실행 팀

> Claude(설계·통합) + Codex(워크트리 병렬 실행)를 **파일 보드**(`_ops/devteam/`, git-tracked)로 잇는다. 둘은 별도 프로세스지만 같은 repo를 보므로 파일시스템이 메시지 버스가 된다. 진입점: Claude `/devteam` 스킬, Codex `devteam` 스킬("보드 실행").
> 이 슬림판은 **단일 평면 repo** 기준 — 서브모듈 포인터·거대 corpus(sparse)·엔티티 레지스트리·교차 머신 함대·포트 규약은 **의도적으로 뺐다**(원본 VibeBlocks-HQ에서 슬림화).

### 매체 = `_ops/devteam/`

- `BOARD.md` — 마스터 현황 (**Claude 전유**). 한눈에 모든 task.
- `PRIMER.md` — Codex 실행자 교본 (실행에 필요한 것만).
- `cards/<slug>.md` — task 카드: frontmatter + `## CONTEXT`(Claude가 추린 사실) + `## SPEC`(Claude) + `## LOG`(Codex append).

카드 frontmatter: `task` / `run`(pt-N) / `status` / `owner` / `branch`(codex/&lt;slug&gt;) / `files`(건드릴 범위 — disjoint) / `base`(하달 시점 `git branch --show-current`).

**카드 = 신병 브리핑 (boot-camp 이동 원칙)**: boot-camp 비용은 사라지지 않고 이동한다. Claude는 이미 이 세션에서 맥락을 들고 있으니, 그 이해를 카드 `## CONTEXT`(필요 사실 2~3 + 파일:라인 앵커 + 선행 [[링크]])에 옮겨 담아 Codex가 **전체 탐색 없이** 일하게 한다. 카드가 얇으면 Codex가 코드베이스를 헤맨다. 강제 양식 = `cards/_TEMPLATE.md`(`## CONTEXT` 빈칸이 forcing function).

### status: `open`(Claude) → `wip`(Codex 착수) → `done`(Codex 완료, 미검토) → `merged`(Claude 통합) / `blocked`

### 흐름 3단

| 단계 | 누가 | 행동 |
|---|---|---|
| **하달** | Claude | 목표 → N개 **disjoint** task 분해 → run id `pt-N` → `cards/` 작성(CONTEXT+SPEC, open) → BOARD 갱신 → 커밋 → **하달 한 줄** 출력 |
| **실행** | Codex | "보드 실행" → PRIMER 읽고 → open task 픽업 → 각자 **워크트리**서 카드대로(전체 탐색 금지) → 카드 LOG + status 갱신 → 커밋(pt-N 귀속) → `codex/<slug>` |
| **통합** | Claude | done 검토 → **작업 브랜치**(= base) 머지 → 워크트리·브랜치 정리 → status: merged |

> Claude는 Codex를 직접 못 켠다 → **"하달 한 줄"이 유일한 수동 이음매**(사용자가 Codex에 붙여넣기). 같은 머신 발사 = `tools/inhouse/embeded/devteam/codex-launch.ps1`(격리 CODEX_HOME + bypass-sandbox + gpt-5.5).

### 규율

1. **Disjoint 최우선** — 카드 `files`로 Claude가 보장. 못 쪼개면 솔직히 "순차"라 하고 병렬 강행 금지. (워크트리가 격리돼도 머지 때 같은 파일 겹치면 충돌.)
2. **워크트리 격리** — task마다 별도 워크트리, base는 카드 `base`. corpus·서브모듈 없으니 평범 생성:
   `git worktree add -b codex/<slug> ../poeTradeBookmark.wt/<slug> <base>`
   같은 머신·같은 repo라 push/fetch 불필요(`.git` object store 공유 → 커밋 즉시 보임). **선결: repo에 커밋 1개 이상**(unborn 브랜치는 워크트리 불가).
3. **Cleanup** — merged 즉시 정리(`git worktree remove`·`git branch -d`). 미검토 done 쌓이면 사용자에게 알림.
4. **검증 경량화(좀비 방지)** — 병렬 카드는 자기 파일범위만 테스트. 전체 build/test는 통합자(Claude)가 함대 종료 후 직렬 1회.
5. **BOARD = Claude 전유** — Codex는 카드만(disjoint라 동시 안전). 되돌리기 어려운 머지·`master` 머지·품질 게이트는 **Claude 직접**(자율 master 머지 금지 — 사용자 명시 요청 시만).

### 가시성

- "팀 현황" → Claude가 카드 status 집계 + `codex/*` 브랜치 diff 요약 → 보고.
- 실시간(지금 도는지): `node tools/inhouse/embeded/devteam/devteam-watch.mjs -w`.
- 모든 진행이 카드 LOG + 커밋에 남음 → git이 곧 감사 추적.

세부 절차 = 스킬 `.claude/skills/devteam/SKILL.md`.