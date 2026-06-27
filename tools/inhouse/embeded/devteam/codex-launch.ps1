#!/usr/bin/env pwsh
# codex-launch.ps1 — devteam Codex 표준 발사 (Windows)
#
# 출력을 공유 .out 파일로 보장 → devteam-watch.mjs가 VERDICT·tokens·진행줄을 읽는다.
# (runbook의 2대 원인 — 공유 ~/.codex / Windows 샌드박스 — 도 함께 처리)
#
# 사용:
#   ./codex-launch.ps1 -Card vb128-zoom-axis -Worktree D:\path\to\wt -PromptFile D:\path\prompt.txt
#   node tools/inhouse/embeded/devteam/devteam-watch.mjs -w    # 다른 터미널서 실시간 감시
#
# 비용: codex 토큰·속도 영향 0 (출력을 버리지 않고 파일에도 남길 뿐). 디스크 몇 KB뿐.

param(
  [Parameter(Mandatory)][string]$Card,        # 카드 슬러그 (codex/<run>-<card> 의 <card>)
  [Parameter(Mandatory)][string]$Worktree,    # 작업 worktree 경로 (격리 = bypass sandbox 안전조건)
  [Parameter(Mandatory)][string]$PromptFile,  # 카드 SPEC 프롬프트 파일
  [string]$Effort = "high"                    # 스모크는 low
)

$tmp = $env:TEMP
$out = Join-Path $tmp "codex-$Card.out.txt"
$iso = Join-Path $tmp "codex-iso-$Card"

# 격리 홈 (runbook 원인1: 공유 ~/.codex 쓰면 기동 직후 영구 정지)
if (-not (Test-Path (Join-Path $iso "config.toml"))) {
  New-Item -ItemType Directory $iso -Force | Out-Null
  Copy-Item (Join-Path $HOME ".codex\auth.json") (Join-Path $iso "auth.json") -Force
  "model = `"gpt-5.5`"`nmodel_reasoning_effort = `"$Effort`"`napproval_policy = `"never`"" |
    Set-Content (Join-Path $iso "config.toml") -Encoding utf8
}

# 발사 헤더 (watch가 즉시 '발사됨' 인식)
"=== LAUNCH $Card @ $(Get-Date -Format 'HH:mm:ss') | wt=$Worktree ===" | Set-Content $out -Encoding utf8

# detach + 출력 redirect (runbook 원인2: Windows는 -s workspace-write가 read-only 강제 →
#   --dangerously-bypass 필수, 워크트리가 그 격리. 출력 *>> 로 stdout+stderr 모두 파일에)
$inner = "`$env:CODEX_HOME='$iso'; Get-Content -Raw '$PromptFile' | " +
         "codex exec --dangerously-bypass-approvals-and-sandbox -C '$Worktree' - *>> '$out'"
Start-Process pwsh -ArgumentList "-NoProfile", "-Command", $inner -WindowStyle Hidden

Write-Host "발사: $Card"
Write-Host "  로그: $out"
Write-Host "  감시: node tools/inhouse/embeded/devteam/devteam-watch.mjs -w"
