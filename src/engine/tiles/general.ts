// 일반 칸: 급식실·보건실·교무실·돌발
import { content, getClub } from '../content';
import { addCareerExp, applyEffects } from '../effects';
import { setChoice, setResult, since, type Ctx } from '../flow';
import type { ChoiceOption, GameState } from '../types';

export function startCafeteria(d: GameState, ctx: Ctx): void {
  const c = content.cafeteria;
  const start = ctx.log.length;
  const o = ctx.rng.pick(c.outcomes);
  applyEffects(d, o.effects, ctx.log);
  if (d.money >= c.treat.minMoney) d.queue.unshift('treat');
  setResult(d, { source: 'cafeteria', title: o.title, text: o.text, changes: since(ctx.log, start) });
}

export function startTreat(d: GameState): void {
  const t = content.cafeteria.treat;
  if (d.money < t.minMoney) return;
  setChoice(d, { source: 'treat', title: t.title, text: t.text, options: t.options as ChoiceOption[] });
}

export function startNurse(d: GameState, ctx: Ctx): void {
  const n = content.nurse;
  const start = ctx.log.length;
  if (d.stress >= n.stressRelief.minStress) {
    applyEffects(d, n.stressRelief.effects, ctx.log);
    setResult(d, { source: 'nurse', title: n.title, text: n.stressRelief.text, changes: since(ctx.log, start) });
    return;
  }
  if (d.stats.stamina < n.heal.maxStamina) {
    applyEffects(d, n.heal.effects, ctx.log);
    setResult(d, { source: 'nurse', title: n.title, text: n.heal.text, changes: since(ctx.log, start) });
    return;
  }
  setChoice(d, { source: 'nurse', title: n.title, text: n.quiz.text, options: [n.quiz.option as ChoiceOption] });
}

export function startStaffroom(d: GameState, ctx: Ctx): void {
  const s = content.staffroom;
  const r = s.rules;
  const start = ctx.log.length;
  const lines: string[] = [];
  const rec = d.records;
  if (rec.examPass >= 1 && d.stats.study >= r.scholarship.minStudy) {
    applyEffects(d, r.scholarship.effects, ctx.log);
    lines.push(r.scholarship.text);
  }
  if (rec.award >= 1) {
    applyEffects(d, r.award.effects, ctx.log);
    const club = getClub(d.clubId);
    if (club) addCareerExp(d, club.career, 2, ctx.log, true);
    lines.push(r.award.text);
  }
  if (rec.praise >= 1) {
    applyEffects(d, r.praise.effects, ctx.log);
    lines.push(r.praise.text);
  }
  if (rec.late >= r.late.minLate) {
    applyEffects(d, r.late.effects, ctx.log);
    lines.push(r.late.text);
  }
  if (lines.length === 0) {
    applyEffects(d, r.none.effects, ctx.log);
    lines.push(r.none.text);
  }
  d.records = { examPass: 0, award: 0, praise: 0, late: 0 };
  setResult(d, {
    source: 'staffroom',
    title: s.title,
    text: s.text,
    resultText: lines.join('\n'),
    changes: since(ctx.log, start),
  });
}

export function startSurprise(d: GameState, ctx: Ctx): void {
  const all = content.surprises;
  let pool = all.filter((e) => !d.seenEvents.includes(e.id));
  if (pool.length === 0) pool = all;
  const e = ctx.rng.pick(pool);
  d.seenEvents.push(e.id);
  setChoice(d, {
    source: 'surprise',
    eventId: e.id,
    title: e.title,
    text: e.text,
    options: [
      {
        id: e.id,
        label: e.label,
        kind: 'special',
        check: e.check,
        onSuccess: e.onSuccess,
        onFail: e.onFail,
        resultText: e.resultText,
      },
    ],
  });
}
