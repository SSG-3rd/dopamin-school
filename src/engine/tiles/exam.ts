// 시험 칸(4·12): 전략을 고른 뒤 학업 판정(보통 8). 3학년 칸 12는 진로 시험.
import { CAREER_NAMES, content } from '../content';
import { addCareerExp, applyEffects, applyStress } from '../effects';
import { setChoice, setResult, since, type Ctx } from '../flow';
import { DIFF, FUMBLE_EXTRA_STRESS, GRADUATION_USES_BONUSES } from '../rules';
import type { Career, ChoiceOption, GameState } from '../types';
import { CAREERS } from '../types';

export function topCareer(d: GameState): Career {
  let best: Career = CAREERS[0];
  for (const c of CAREERS) if (d.careerExp[c] > d.careerExp[best]) best = c;
  return best;
}

export function startExam(d: GameState): void {
  const ex = content.exams;
  const isFinal = d.year === 3 && d.position === 12;
  if (isFinal) {
    const career = topCareer(d);
    const t = ex.final.types[career];
    setChoice(d, {
      source: 'exam',
      examKind: 'final',
      examCareer: career,
      title: `${ex.final.title}: ${t.name}`,
      text: `${t.text} (${CAREER_NAMES[career]} 레벨로 판정)`,
      options: ex.strategies.map((s) => ({ ...s, action: 'exam', check: { by: career, diff: DIFF.normal } })) as ChoiceOption[],
    });
    return;
  }
  const mock = d.year === 3 && d.position === 4;
  const title = mock ? ex.regular.title.mock : d.position === 4 ? ex.regular.title.first : ex.regular.title.second;
  setChoice(d, {
    source: 'exam',
    examKind: mock ? 'mock' : 'regular',
    title: `${d.year}학년 ${title}`,
    text: ex.regular.text,
    options: ex.strategies.map((s) => ({ ...s, action: 'exam', check: { by: 'study', diff: DIFF.normal } })) as ChoiceOption[],
  });
}

/** 판정 결과를 시험 효과로 바꾼다 */
export function resolveExam(d: GameState, ctx: Ctx): void {
  const p = d.pending!;
  const j = p.judge!;
  const opt = p.chosen!;
  const ex = content.exams;
  const start = ctx.log.length;
  let text: string;
  if (p.examKind === 'final') {
    if (j.outcome === 'success' || j.outcome === 'critical') {
      const career = p.examCareer!;
      addCareerExp(d, career, 5, ctx.log);
      d.finalExamBonus = true;
      applyEffects(d, ex.final.success.effects, ctx.log);
      if (GRADUATION_USES_BONUSES) ctx.log.push({ kind: 'note', text: '졸업 판정 +1' });
      text = ex.final.success.text;
    } else {
      applyEffects(d, ex.final.fail.effects, ctx.log);
      text = ex.final.fail.text;
    }
  } else if (j.outcome === 'critical') {
    applyEffects(d, ex.regular.critical.effects, ctx.log);
    text = ex.regular.critical.text;
  } else if (j.outcome === 'success') {
    applyEffects(d, ex.regular.success.effects, ctx.log);
    text = ex.regular.success.text;
  } else {
    applyEffects(d, ex.regular.fail.effects, ctx.log);
    text = ex.regular.fail.text;
  }
  if (j.outcome === 'fumble') applyStress(d, FUMBLE_EXTRA_STRESS, ctx.log);
  if (j.resolvedBy === 'study' && (j.outcome === 'fail' || j.outcome === 'fumble') && d.traitId === 'effort') {
    applyEffects(d, { stats: { study: 3 } }, ctx.log);
    ctx.log.push({ kind: 'note', text: '노력형: 실패에서도 배운다' });
  }
  applyEffects(d, opt.after, ctx.log);
  setResult(d, {
    source: 'exam',
    title: p.title,
    text: '',
    resultText: text,
    changes: since(ctx.log, start),
    examKind: p.examKind,
  });
}
