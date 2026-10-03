// 상담실: 고정 선택지 3개(원하는 능력치 +5 / 원하는 진로 +3 / 스트레스 −20) + 선생님의 신뢰 해금 1개.
import { CAREER_ICONS, CAREER_NAMES, STAT_ICONS, STAT_NAMES, content } from '../content';
import { setChoice, type Ctx } from '../flow';
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
        title: '어떤 능력치를 키울까?',
        text: '상담 선생님이 맞춤 계획을 짜 주신다.',
        options: STATS.map((s) => ({
          id: `stat:${s}`,
          label: `${STAT_ICONS[s]} ${STAT_NAMES[s]}`,
          kind: 'special' as const,
          effects: { stats: { [s]: 5 } },
          resultText: { done: `${STAT_NAMES[s]} 계획표를 받아 들었다.` },
        })),
      });
      return true;
    case 'pick_career3':
    case 'pick_career3_trust': {
      const trust = opt.action === 'pick_career3_trust';
      setChoice(d, {
        source: 'pick',
        pickFor: trust ? 'career3_trust' : 'career3',
        title: '어떤 진로를 상담할까?',
        text: trust ? '선생님과 함께 3년 로드맵을 그린다.' : '관심 있는 분야를 이야기해 보자.',
        options: CAREERS.map((c) => ({
          id: `career:${c}`,
          label: `${CAREER_ICONS[c]} ${CAREER_NAMES[c]}`,
          kind: 'special' as const,
          effects: trust ? { career: { [c]: 3 }, stress: -10 } : { career: { [c]: 3 } },
          resultText: { done: `${CAREER_NAMES[c]} 쪽 길이 조금 더 또렷해졌다.` },
        })),
      });
      return true;
    }
  }
  return false;
}
