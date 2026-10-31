// 판정: 주사위 2개 합 + 보정 ≥ 난이도. 12는 대성공, 2는 대실패.
import { CAREER_TEXT, STAT_TEXT, getBuffDef, getClub, getTrait } from './content';
import { hasBuff } from './effects';
import { careerBonus, careerLevel, statBonus, stressJudgeMod, successProbability } from './rules';
import type { Rng } from './rng';
import { lit, tx, type Text } from './text';
import type { Career, Check, CheckBy, GameState, JudgeBonus, JudgeResult, OptionKind, Outcome, Stat } from './types';
import { STATS } from './types';

export interface JudgeContext {
  check: Check;
  kind?: OptionKind;
  /** 시험 전략 등 선택지 자체 보정 */
  judgeMod?: number;
  exam?: boolean;
  /** 인싸형 능력: 기준을 인맥으로 */
  armed?: boolean;
}

export function isStat(by: string): by is Stat {
  return (STATS as readonly string[]).includes(by);
}

export function resolveCheckBy(state: GameState, by: CheckBy): Stat | Career {
  if (by === 'club') return getClub(state.clubId)?.career ?? 'social';
  return by;
}

export interface JudgePlan {
  resolvedBy: Stat | Career;
  diff: number;
  bonuses: JudgeBonus[];
  bonus: number;
  probability: number;
}

/** 판정 전에 보정과 성공 확률을 계산 (화면 미리보기와 실제 판정이 같은 식을 쓴다) */
export function planJudge(state: GameState, jc: JudgeContext): JudgePlan {
  const bonuses: JudgeBonus[] = [];
  const resolvedBy: Stat | Career = jc.armed ? 'social' : resolveCheckBy(state, jc.check.by);
  if (isStat(resolvedBy)) {
    const v = state.stats[resolvedBy];
    bonuses.push({ label: tx(jc.armed ? 'judge.statArmed' : 'judge.stat', { stat: STAT_TEXT[resolvedBy], v }), value: statBonus(v) });
  } else {
    const lv = careerLevel(state.careerExp[resolvedBy]);
    bonuses.push({ label: tx('judge.career', { career: CAREER_TEXT[resolvedBy], lv }), value: careerBonus(lv) });
  }
  if (jc.judgeMod) bonuses.push({ label: tx('judge.examStrategy'), value: jc.judgeMod });
  if (jc.exam && state.traitId === 'talent') bonuses.push({ label: getTrait('talent').name, value: 2 });
  if (jc.exam && hasBuff(state, 'prestudy')) bonuses.push({ label: buffName('prestudy'), value: 2 });
  if (hasBuff(state, 'energy_drink')) bonuses.push({ label: buffName('energy_drink'), value: 1 });
  if (resolvedBy === 'social' && hasBuff(state, 'travel')) bonuses.push({ label: buffName('travel'), value: 2 });
  if (hasBuff(state, 'allnighter')) bonuses.push({ label: buffName('allnighter'), value: -1 });
  const sm = stressJudgeMod(state.stress, jc.kind);
  if (sm) bonuses.push({ label: tx(sm > 0 ? 'judge.relaxed' : 'stress.name'), value: sm });

  let diff = jc.check.diff;
  if (jc.exam && state.traitId === 'athlete') diff += 1;
  const bonus = bonuses.reduce((a, b) => a + b.value, 0);
  return { resolvedBy, diff, bonuses: bonuses.filter((b) => b.value !== 0 || b === bonuses[0]), bonus, probability: successProbability(bonus, diff) };
}

function buffName(id: string): Text {
  return getBuffDef(id)?.name ?? lit(id);
}

export function rollJudge(rng: Rng, plan: JudgePlan, by: CheckBy): JudgeResult {
  const d1 = rng.d6();
  const d2 = rng.d6();
  const sum = d1 + d2;
  let outcome: Outcome;
  if (sum === 12) outcome = 'critical';
  else if (sum === 2) outcome = 'fumble';
  else outcome = sum + plan.bonus >= plan.diff ? 'success' : 'fail';
  return {
    by,
    resolvedBy: plan.resolvedBy,
    diff: plan.diff,
    dice: [d1, d2],
    bonuses: plan.bonuses,
    total: sum + plan.bonus,
    outcome,
  };
}

export function isSuccess(o: Outcome): boolean {
  return o === 'success' || o === 'critical';
}
