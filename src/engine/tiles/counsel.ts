// 상담실: 고정 선택지 3개(원하는 능력치 +5 / 원하는 진로 +3 / 스트레스 −20) + 선생님의 신뢰 해금 1개.
import { CAREER_ICONS, CAREER_TEXT, STAT_ICONS, STAT_TEXT, content } from '../content';
import { setChoice, type Ctx } from '../flow';
import { lit, tx } from '../text';
import type { ChoiceOption, GameState } from '../types';
import { CAREERS, STATS } from '../types';
import { unlockOk } from './place';

export function startCounsel(d: GameState, ctx: Ctx): void {
  const c = content.counsel;
  setChoice(d, {
    source: 'counsel',
    title: c.title,
    text: ctx.rng.pick(c.texts),
    options: c.options.filter((o) => unlockOk(d, o)) as ChoiceOption[],
  });
}

/** 상담실 '원하는 …' 하위 선택. 처리했으면 true */
export function handleCounselAction(d: GameState, opt: ChoiceOption): boolean {
  switch (opt.action) {
    case 'pick_stat5':
      setChoice(d, {
        source: 'pick',
        pickFor: 'stat5',
        title: tx('engine.counsel.statTitle'),
        text: tx('engine.counsel.statText'),
        options: STATS.map((s) => ({
          id: `stat:${s}`,
          label: tx('fmt.iconName', { icon: lit(STAT_ICONS[s]), name: STAT_TEXT[s] }),
          kind: 'special' as const,
          effects: { stats: { [s]: 5 } },
          resultText: { done: tx('engine.counsel.statDone', { stat: STAT_TEXT[s] }) },
        })),
      });
      return true;
    case 'pick_career3':
    case 'pick_career3_trust': {
      const trust = opt.action === 'pick_career3_trust';
      setChoice(d, {
        source: 'pick',
        pickFor: trust ? 'career3_trust' : 'career3',
        title: tx('engine.counsel.careerTitle'),
        text: tx(trust ? 'engine.counsel.careerTextTrust' : 'engine.counsel.careerText'),
        options: CAREERS.map((c) => ({
          id: `career:${c}`,
          label: tx('fmt.iconName', { icon: lit(CAREER_ICONS[c]), name: CAREER_TEXT[c] }),
          kind: 'special' as const,
          effects: trust ? { career: { [c]: 3 }, stress: -10 } : { career: { [c]: 3 } },
          resultText: { done: tx('engine.counsel.careerDone', { career: CAREER_TEXT[c] }) },
        })),
      });
      return true;
    }
  }
  return false;
}
