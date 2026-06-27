# DevTeam 보드 — 병렬 실행 팀 매체 (슬림판)

Claude(설계·통합) ↔ Codex(워크트리 병렬 실행)를 잇는 **git-tracked 파일 메시지 버스**.
프로토콜 SSOT: `AGENTS.md` `## DevTeam`. 이 폴더는 그 매체.

```
BOARD.md            마스터 현황 (Claude 전유). 여기만 보면 전체 파악.
PRIMER.md           Codex 실행자 교본 — 실행 5가지.
cards/<slug>.md     task 카드 — frontmatter + CONTEXT/SPEC(Claude) + LOG(Codex). task별 disjoint.
cards/_TEMPLATE.md  카드 양식 (## CONTEXT 빈칸 = 신병 탐색 제거 forcing function).
```

## 흐름

```
사용자 →Claude:  /devteam <목표>
Claude:          분해 → cards/ → BOARD → "하달 한 줄"
사용자 →Codex:   하달 한 줄 붙여넣기
Codex:           워크트리 병렬 실행 → 카드 LOG + codex/<slug> 커밋
사용자 →Claude:  "팀 현황" / "팀 통합"
Claude:          검토 → 머지 → 워크트리 정리
```

> 같은 머신이라 워크트리가 `.git` object store를 공유 → push/fetch 불필요. Claude가 Codex를 못 켜므로, "하달 한 줄"을 사용자가 Codex에 붙여넣는 게 유일한 수동 이음매. 나머지는 전부 파일+git으로 자동.

실시간 현황: `node tools/inhouse/embeded/devteam/devteam-watch.mjs -w`
Codex 발사(Windows): `tools/inhouse/embeded/devteam/codex-launch.ps1`
