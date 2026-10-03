// 엔딩 계산: 친구 구원 → 기적 → 룰렛 후보 → 룰렛 → 졸업 판정 → 에필로그
import { CAREER_NAMES, STAT_NAMES, content, getClub, trackName } from './content';
import type { Ctx } from './flow';
import {
  BIZ_MONEY_CANDIDATE,
  COMBO_MIN_LEVEL,
  EPILOGUE_MONEY,
  EPILOGUE_STRESS,
  GRADE_MID,
  GRADE_TOP,
  MIRACLE_FLAGS,
  REROLL_MIN_LUCK,
  RESCUE_MAX_OTHER_LEVEL,
  RESCUE_MIN_SOCIAL,
  ROULETTE_MIN_LEVEL,
  careerBonus,
  careerLevels,
  moneyBonus,
  statBonus,
} from './rules';
import type { Candidate, Career, EndingResult, GameState, Grade, JudgeBonus } from './types';
import { CAREERS } from './types';

export function artsTrack(d: GameState): string {
  const club = getClub(d.clubId);
  return club?.career === 'arts' && club.artsKind ? `arts_${club.artsKind}` : 'arts_general';
}

function fieldTrack(d: GameState, c: Career): string {
  return c === 'arts' ? artsTrack(d) : c;
}

export function comboKey(a: Career, b: Career): string {
  const [x, y] = [a, b].sort((p, q) => CAREERS.indexOf(p) - CAREERS.indexOf(q));
  return `${x}+${y}`;
}

export function buildCandidates(d: GameState): Candidate[] {
  const lv = careerLevels(d);
  const raw: Omit<Candidate, 'probability'>[] = [];
  for (const c of CAREERS) {
    if (lv[c] >= ROULETTE_MIN_LEVEL) {
      raw.push({ id: `field:${c}`, label: trackName(fieldTrack(d, c)), weight: lv[c] ** 2 });
    }
  }
  for (let i = 0; i < CAREERS.length; i++) {
    for (let j = i + 1; j < CAREERS.length; j++) {
      const a = CAREERS[i];
      const b = CAREERS[j];
      if (lv[a] >= COMBO_MIN_LEVEL && lv[b] >= COMBO_MIN_LEVEL) {
        const key = comboKey(a, b);
        raw.push({ id: `combo:${key}`, label: trackName(`combo:${key}`), weight: ((lv[a] + lv[b]) / 2) ** 2 });
      }
    }
  }
  if (d.money >= BIZ_MONEY_CANDIDATE && lv.biz < ROULETTE_MIN_LEVEL) {
    raw.push({ id: 'field:biz', label: `${trackName('biz')} (모아 둔 돈)`, weight: ROULETTE_MIN_LEVEL ** 2 });
  }
  const total = raw.reduce((a, c) => a + c.weight, 0);
  return raw.map((c) => ({ ...c, probability: total > 0 ? c.weight / total : 0 }));
}

function epilogue(d: GameState): string[] {
  const out: string[] = [];
  if (d.stress >= EPILOGUE_STRESS) out.push(content.endings.epilogue.burnout);
  if (d.money >= EPILOGUE_MONEY) out.push(content.endings.epilogue.money);
  return out;
}

function finish(d: GameState, e: EndingResult): void {
  d.ending = e;
  d.phase = 'ending';
  d.pending = undefined;
  d.queue = [];
}

/** 졸업식 다음: 1~4단계까지 계산. 운 60 이상이면 다시 돌릴지 묻고 멈춘다. */
export function startEnding(d: GameState, ctx: Ctx): void {
  const { rng } = ctx;
  const lv = careerLevels(d);
  const candidates = buildCandidates(d);
  const E = content.endings;

  // 1. 친구 구원
  const othersLow = CAREERS.filter((c) => c !== 'comm').every((c) => lv[c] <= RESCUE_MAX_OTHER_LEVEL);
  if (d.stats.social >= RESCUE_MIN_SOCIAL && othersLow) {
    const f = rng.pick(E.rescue);
    finish(d, {
      kind: 'rescue',
      jobId: f.id,
      jobName: f.name,
      track: 'rescue',
      candidates,
      firstPick: 'explore',
      pick: 'explore',
      rerolled: false,
      epilogue: epilogue(d),
      sequence: ['roulette', 'fail_scene', 'phone_call', 'reveal'],
      rescueFriend: f.friend,
      flavor: f.call,
    });
    return;
  }

  // 2. 기적
  const flags = MIRACLE_FLAGS.filter((f) => d.flags.includes(f));
  if (flags.length > 0 && rng.next() < d.stats.luck / 10 / 100) {
    const f = rng.pick(flags);
    const m = E.miracles[f];
    finish(d, {
      kind: 'miracle',
      jobId: m.id,
      jobName: m.name,
      track: 'miracle',
      candidates,
      rerolled: false,
      epilogue: epilogue(d),
      sequence: ['reveal'],
      flavor: m.text,
    });
    return;
  }

  // 3. 후보 없음 → 탐색 엔딩
  if (candidates.length === 0) {
    finish(d, {
      kind: 'explore',
      jobId: E.explore.id,
      jobName: E.explore.name,
      track: 'explore',
      candidates,
      firstPick: 'explore',
      pick: 'explore',
      rerolled: false,
      epilogue: epilogue(d),
      sequence: ['roulette', 'fail_scene', 'reveal'],
      flavor: E.explore.text,
    });
    return;
  }

  // 4. 룰렛
  const first = candidates[rng.weighted(candidates.map((c) => c.weight))].id;
  const base: EndingResult = {
    kind: first.startsWith('combo:') ? 'combo' : 'normal',
    jobId: '',
    jobName: '',
    candidates,
    firstPick: first,
    pick: first,
    rerolled: false,
    epilogue: epilogue(d),
    sequence: ['roulette', 'grade_roll', 'reveal'],
  };
  if (d.stats.luck >= REROLL_MIN_LUCK) {
    finish(d, { ...base, awaitingReroll: true });
    return;
  }
  finish(d, finalizeRoulette(d, ctx, base, first));
}

/** 운 60 이상: 다시 돌릴지 결정 */
export function resolveReroll(d: GameState, ctx: Ctx, accept: boolean): void {
  const e = d.ending!;
  let pick = e.firstPick!;
  if (accept) pick = e.candidates[ctx.rng.weighted(e.candidates.map((c) => c.weight))].id;
  finish(d, finalizeRoulette(d, ctx, { ...e, rerolled: accept, awaitingReroll: false }, pick));
}

/** 5단계: 졸업 판정으로 등급과 직업을 정한다 */
function finalizeRoulette(d: GameState, ctx: Ctx, e: EndingResult, pick: string): EndingResult {
  const lv = careerLevels(d);
  let field: Career;
  let track: string;
  let table;
  if (pick.startsWith('combo:')) {
    const key = pick.slice(6);
    const [a, b] = key.split('+') as Career[];
    field = lv[b] > lv[a] ? b : a;
    track = `combo:${key}`;
    table = content.endings.combos[key];
  } else {
    field = pick.slice(6) as Career;
    track = fieldTrack(d, field);
    table = content.endings.fields[track];
  }
  const bonuses = graduationBonuses(d, field, lv[field]);
  const bonus = bonuses.reduce((s, b) => s + b.value, 0);
  const d1 = ctx.rng.d6();
  const d2 = ctx.rng.d6();
  const total = d1 + d2 + bonus;
  const grade: Grade = total >= GRADE_TOP ? 'top' : total >= GRADE_MID ? 'mid' : 'low';
  const job = ctx.rng.pick(table[grade]);
  return {
    ...e,
    kind: pick.startsWith('combo:') ? 'combo' : 'normal',
    pick,
    jobId: job.id,
    jobName: job.name,
    track,
    grade,
    graduationRoll: { dice: [d1, d2], bonus, total, bonuses },
    awaitingReroll: false,
  };
}

export function graduationBonuses(d: GameState, field: Career, level: number): JudgeBonus[] {
  const out: JudgeBonus[] = [{ label: `${CAREER_NAMES[field]} Lv${level}`, value: careerBonus(level) }];
  if (field === 'biz') {
    out.push({ label: `모아 둔 돈 ${d.money.toLocaleString('ko-KR')}원`, value: moneyBonus(d.money) });
  } else {
    const stat =
      field === 'academic'
        ? 'study'
        : field === 'sports'
          ? 'stamina'
          : field === 'comm'
            ? 'social'
            : (['study', 'stamina', 'social'] as const).reduce((best, s) => (d.stats[s] > d.stats[best] ? s : best), 'study' as 'study' | 'stamina' | 'social');
    out.push({ label: `${STAT_NAMES[stat]} ${d.stats[stat]}`, value: statBonus(d.stats[stat]) });
  }
  out.push({ label: `운 ${d.stats.luck}`, value: statBonus(d.stats.luck) });
  if (d.finalExamBonus) out.push({ label: '진로 시험 성공', value: 1 });
  if (d.stress >= 80) out.push({ label: '스트레스', value: -1 });
  return out;
}
