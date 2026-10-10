// 밸런스 시뮬레이션: pnpm simulate --games 1000 [--policy greedy] [--trait talent] [--seed 1]
import { playToEnd, type Policy } from '../src/engine/autoplay';
import { careerLevels } from '../src/engine/rules';
import { content, jobName } from '../src/engine/content';
import { CAREERS } from '../src/engine/types';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const games = Number(arg('games', '1000'));
const policy = (arg('policy', 'random') as Policy) ?? 'random';
const trait = arg('trait');
const seed0 = Number(arg('seed', '1'));

const kinds = new Map<string, number>();
const grades = new Map<string, number>();
const jobs = new Map<string, number>();
const traits = new Map<string, Map<string, number>>();
let turns = 0;
let maxTurns = 0;
let minTurns = Infinity;
let rerolled = 0;
const avgLevel: Record<string, number> = Object.fromEntries(CAREERS.map((c) => [c, 0]));
const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

const t0 = Date.now();
for (let i = 0; i < games; i++) {
  const { state } = playToEnd(seed0 + i, { policy, traitId: trait });
  const e = state.ending!;
  inc(kinds, e.kind);
  inc(grades, e.grade ?? '-');
  inc(jobs, e.jobId);
  if (!traits.has(state.traitId)) traits.set(state.traitId, new Map());
  inc(traits.get(state.traitId)!, e.kind);
  turns += state.turn;
  maxTurns = Math.max(maxTurns, state.turn);
  minTurns = Math.min(minTurns, state.turn);
  if (e.rerolled) rerolled++;
  const lv = careerLevels(state);
  for (const c of CAREERS) avgLevel[c] += lv[c] / games;
}

const pct = (n: number) => `${((n / games) * 100).toFixed(1)}%`;
console.log(`\n터닝포인트 시뮬레이션 — ${games}판, 정책 ${policy}${trait ? `, 성향 ${trait}` : ''} (${Date.now() - t0}ms)`);
console.log(`턴: 평균 ${(turns / games).toFixed(1)} (최소 ${minTurns}, 최대 ${maxTurns})`);
console.log('\n엔딩 종류');
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(8)} ${String(n).padStart(5)}  ${pct(n)}`);
console.log('\n등급');
for (const [k, n] of [...grades].sort()) console.log(`  ${k.padEnd(8)} ${String(n).padStart(5)}  ${pct(n)}`);
console.log('\n평균 진로 레벨');
console.log('  ' + CAREERS.map((c) => `${c} ${avgLevel[c].toFixed(2)}`).join(' · '));
console.log('\n성향별 엔딩 종류');
for (const t of content.traits) {
  const m = traits.get(t.id);
  if (!m) continue;
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`  ${t.name.padEnd(4)} ` + [...m].map(([k, n]) => `${k} ${((n / total) * 100).toFixed(0)}%`).join(' · '));
}
console.log('\n직업 상위 15');
for (const [k, n] of [...jobs].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${jobName(k).padEnd(12)} ${pct(n)}`);
console.log(`\n직업 종류 ${jobs.size}개 등장 · 룰렛 다시 돌림 ${pct(rerolled)}`);
