#!/usr/bin/env node
// devteam-watch — Codex devteam 실시간 현황 (Conductor 환경 가시성 보완)
//
// devteam의 "팀 현황"(/devteam status)은 카드 status = 완료 후 신호라
// "지금 도는지"를 못 본다. 실시간 신호는 ① codex 프로세스 ② output 파일 mtime 둘뿐.
// 이 도구는 그 둘 + 카드 status + 브랜치를 한 화면에 모은다. Claude 세션 불필요.
//
// 사용:  node tools/inhouse/embeded/devteam/devteam-watch.mjs        # 1회 스냅샷
//        node tools/inhouse/embeded/devteam/devteam-watch.mjs -w     # 5초마다 갱신(실시간)
//
// HQ 루트에서 실행. (어느 worktree에서 켜도 됨 — 프로세스·TMP는 머신 공유)

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WATCH = process.argv.includes('-w') || process.argv.includes('--watch');
const TMP = tmpdir();
const HQ = process.cwd();
const ZOMBIE_MIN = 12; // output이 N분+ 정체 + 미완 = 좀비 의심 (runbook 기준)

const C = { dim:'\x1b[2m', red:'\x1b[31m', grn:'\x1b[32m', yel:'\x1b[33m', cyn:'\x1b[36m', b:'\x1b[1m', x:'\x1b[0m' };

// ① codex 프로세스 (OS별) — PID / CPU초 / 경과분
function procs() {
  try {
    if (process.platform === 'win32') {
      const ps = `Get-Process codex -EA SilentlyContinue | ForEach-Object { '{0}|{1}|{2}' -f $_.Id,[int]$_.CPU,[int]((Get-Date)-$_.StartTime).TotalMinutes }`;
      const out = execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
      return out.trim().split('\n').filter(Boolean).map(l => { const [pid,cpu,min]=l.split('|'); return { pid, cpu:+cpu, min:+min }; });
    } else {
      const out = execSync(`ps -eo pid,etimes,%cpu,comm | grep -i 'codex' | grep -v grep`, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
      return out.trim().split('\n').filter(Boolean).map(l => { const p=l.trim().split(/\s+/); return { pid:p[0], cpu:+p[2], min:Math.round(+p[1]/60) }; });
    }
  } catch { return []; }
}

// ② 발사 카드 — 프롬프트(codex-<card>.txt)는 발사 사실, 출력(codex-<card>.out.txt)은 진행/결과.
//    codex-launch가 .out을 보장 → VERDICT/tokens/진행줄을 읽는다. .out 없으면 '구식 발사'(시각만).
function outs() {
  try {
    const all = readdirSync(TMP).filter(f => /^codex-/.test(f) && !/^codex-iso/.test(f));
    const prompts = all.filter(f => /\.txt$/.test(f) && !/\.out\.txt$/.test(f));
    return prompts.map(f => {
      const card = f.replace(/\.txt$/, '').replace(/^codex-/, '');
      const ptxt = (() => { try { return readFileSync(join(TMP, f), 'utf8'); } catch { return ''; } })();
      const goal = (/요약[:：]\s*(.+)/.exec(ptxt)?.[1]
        || ptxt.split('\n').map(l => l.trim()).find(l => l.length > 15 && !l.startsWith('==='))
        || '').replace(/\s+/g, ' ').slice(0, 72);
      const op = join(TMP, `codex-${card}.out.txt`);
      if (existsSync(op)) {                                   // codex-launch로 발사됨 → 진행 보임
        const ost = statSync(op), otxt = readFileSync(op, 'utf8');
        const lines = otxt.trim().split('\n').filter(Boolean);
        return {
          name: card, goal, hasOut: true,
          ageMin: Math.round((Date.now() - ost.mtimeMs) / 60000),
          verdict: /VERDICT:\s*([A-Z_]+)/i.exec(otxt)?.[1],
          tokens: /tokens used[:\s]+([\d,]+)/i.exec(otxt)?.[1],
          last: (lines[lines.length - 1] || '').replace(/\s+/g, ' ').slice(0, 72),
          err: /\b(error|BLOCKER|read-only filesystem)\b/i.test(otxt),
        };
      }
      const pst = statSync(join(TMP, f));                     // 구식 발사 (출력 미기록)
      return { name: card, goal, hasOut: false, ageMin: Math.round((Date.now() - pst.mtimeMs) / 60000) };
    }).sort((a, b) => a.ageMin - b.ageMin);
  } catch { return []; }
}

// ③ 카드 status
function cards() {
  const dir = join(HQ, '_ops', 'devteam', 'cards');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => {
      const c = readFileSync(join(dir, f), 'utf8');
      return { name: f.replace(/\.md$/, ''), status: (/status:\s*(\w+)/.exec(c)?.[1] || '?') };
    });
  } catch { return []; }
}

function render() {
  const ps = procs(), os = outs(), cs = cards();
  const now = new Date().toLocaleTimeString('ko-KR');
  let s = `${C.b}${C.cyn}━━━ Codex devteam 현황  ${now} ━━━${C.x}\n`;

  // 프로세스
  const live = ps.filter(p => p.cpu > 0 || p.min < 3);
  const zomb = ps.filter(p => p.cpu === 0 && p.min >= 5);
  s += `\n${C.b}프로세스${C.x}  codex ${ps.length}대`;
  if (zomb.length) s += `  ${C.red}(좀비의심 ${zomb.length}대)${C.x}`;
  s += '\n';
  for (const p of ps) {
    const z = (p.cpu === 0 && p.min >= 5);
    s += `  ${z ? C.red+'⚠' : C.grn+'●'}${C.x} PID ${p.pid}  CPU ${p.cpu}s  경과 ${p.min}분${z ? C.red+' ← CPU 0, 좀비?' + C.x : ''}\n`;
  }
  if (!ps.length) s += `  ${C.dim}(도는 codex 없음)${C.x}\n`;

  // 발사된 카드 (출력 .out = 진행 신호)
  s += `\n${C.b}발사된 카드 (분=마지막 갱신)${C.x}\n`;
  if (!os.length) s += `  ${C.dim}(codex 발사 없음)${C.x}\n`;
  let oldStyle = false;
  for (const o of os.slice(0, 12)) {
    let tag, col;
    if (o.verdict) { tag = `✓ ${o.verdict}`; col = C.grn; }
    else if (o.err) { tag = '✗ ERROR'; col = C.red; }
    else if (!o.hasOut) { tag = `${o.ageMin}분전 발사`; col = C.dim; oldStyle = true; }
    else if (o.ageMin >= ZOMBIE_MIN) { tag = `⚠ ${o.ageMin}분정체`; col = C.red; }
    else { tag = `▶ ${o.ageMin}분째`; col = C.yel; }
    const tok = o.tokens ? `  ${C.dim}${o.tokens}tok${C.x}` : '';
    s += `  ${col}${tag.padEnd(14)}${C.x} ${C.b}${o.name}${C.x}${tok}\n`;
    const detail = (o.hasOut && o.last) ? o.last : o.goal;
    if (detail) s += `     ${C.dim}└ ${detail}${C.x}\n`;
  }
  if (oldStyle) s += `  ${C.dim}↑ 회색=출력 미기록(구식 발사). codex-launch.ps1로 발사하면 VERDICT·진행 보임${C.x}\n`;

  // 카드
  if (cs.length) {
    const by = cs.reduce((m, c) => (m[c.status] = (m[c.status]||0)+1, m), {});
    s += `\n${C.b}카드${C.x}  ${Object.entries(by).map(([k,v]) => `${k}:${v}`).join('  ')}\n`;
    for (const c of cs.filter(c => c.status !== 'merged')) s += `  ${C.dim}·${C.x} ${c.name} ${C.cyn}[${c.status}]${C.x}\n`;
  }
  return s;
}

if (WATCH) {
  const tick = () => { process.stdout.write('\x1b[2J\x1b[H' + render() + `\n${C.dim}(-w 모드 · 5초 갱신 · Ctrl-C 종료)${C.x}\n`); };
  tick(); setInterval(tick, 5000);
} else {
  console.log(render());
}
