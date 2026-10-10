// 칸 도착 처리와 코너 칸의 여러 단계(용돈 → 루트 → 방학 → 상점 …)를 순서대로 진행한다.
import { STAT_NAMES, content } from '../content';
import { applyMoney, consumeBuffs, hasBuff } from '../effects';
import { endTurn, setChoice, setResult, since, type Ctx } from '../flow';
import {
  ALLOWANCE_PROMO,
  ALLOWANCE_SUMMER,
  BURNOUT_STAMINA_LOSS,
  BURNOUT_STRESS_RESET,
  BURNOUT_TOP_STAT_LOSS,
  PART_TIMER_MULT,
  highestStat,
} from '../rules';
import type { ChoiceOption, GameState } from '../types';
import { startClub } from './club';
import { startCounsel } from './counsel';
import { startExam } from './exam';
import { startCafeteria, startNurse, startStaffroom, startSurprise, startTreat } from './general';
import { startPlaceEvent } from './place';

export function land(d: GameState, ctx: Ctx): void {
  const tile = content.board[d.position];
  switch (tile.type) {
    case 'promotion':
      return landPromotion(d, ctx);
    case 'exam':
      return startExam(d);
    case 'summer':
      d.queue = ['summer_allowance', 'summer', 'shop'];
      return runNext(d, ctx);
    case 'commute':
    case 'classroom':
    case 'library':
    case 'field':
      return startPlaceEvent(d, ctx, tile.type);
    case 'club':
      return startClub(d, ctx);
    case 'counsel':
      return startCounsel(d, ctx);
    case 'cafeteria':
      return startCafeteria(d, ctx);
    case 'nurse':
      return startNurse(d, ctx);
    case 'staffroom':
      return startStaffroom(d, ctx);
    case 'surprise':
      return startSurprise(d, ctx);
  }
}

function landPromotion(d: GameState, ctx: Ctx): void {
  if (d.year === 3) {
    startGraduation(d);
    return;
  }
  d.year = (d.year + 1) as 2 | 3;
  d.seenEvents = [];
  consumeBuffs(d, 'promotion', ctx.log);
  d.queue = ['promo_allowance', ...(d.year === 2 ? (['route'] as const) : []), 'winter', 'shop', 'ability_reset'];
  runNext(d, ctx);
}

function giveAllowance(d: GameState, ctx: Ctx, base: number): number {
  const boosted = hasBuff(d, 'part_timer');
  const amount = boosted ? Math.round(base * PART_TIMER_MULT) : base;
  applyMoney(d, amount, ctx.log);
  consumeBuffs(d, 'allowance', ctx.log);
  return amount;
}

/** 대기 중인 다음 단계를 연다. 없으면 턴을 끝낸다. */
export function runNext(d: GameState, ctx: Ctx): void {
  if (d.burnoutPending) {
    startBurnout(d);
    return;
  }
  const step = d.queue.shift();
  if (!step) {
    endTurn(d);
    return;
  }
  const start = ctx.log.length;
  switch (step) {
    case 'promo_allowance': {
      const amount = giveAllowance(d, ctx, ALLOWANCE_PROMO);
      setResult(d, {
        source: 'allowance',
        title: `🎉 ${d.year}학년 진급!`,
        text: `새 학년, 새 교실. 용돈 ${amount.toLocaleString('ko-KR')}원을 받았다.`,
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'summer_allowance': {
      const amount = giveAllowance(d, ctx, ALLOWANCE_SUMMER);
      setResult(d, {
        source: 'allowance',
        title: '🏖️ 여름방학 시작!',
        text: `방학 용돈 ${amount.toLocaleString('ko-KR')}원을 받았다.`,
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'route':
      d.pending = {
        source: 'route',
        tile: d.position,
        icon: '🧭',
        title: '2학년 반 배정',
        text: '2학년은 어떤 반에서 보낼까? 조건이 맞아야 들어갈 수 있다.',
      };
      d.phase = 'route_select';
      return;
    case 'winter':
    case 'summer': {
      const v = content.vacations[step];
      setChoice(d, { source: 'vacation', title: v.title, text: v.text, options: v.options as ChoiceOption[] });
      return;
    }
    case 'shop':
      d.pending = {
        source: 'shop',
        tile: d.position,
        icon: '🛒',
        title: '학교 앞 문구점',
        text: '용돈으로 필요한 걸 사 두자. 여러 개 살 수 있다.',
        shopItems: content.items.map((i) => i.id),
        bought: [],
      };
      d.phase = 'shop';
      return;
    case 'ability_reset':
      d.abilityUses = 0;
      runNext(d, ctx);
      return;
    case 'treat':
      if (d.money >= content.cafeteria.treat.minMoney) startTreat(d);
      else runNext(d, ctx);
      return;
  }
}

function startBurnout(d: GameState): void {
  const top = highestStat(d.stats);
  d.pending = {
    source: 'burnout',
    tile: d.position,
    icon: '🫠',
    title: '번아웃!',
    text: `스트레스가 한계에 달했다. 머리가 하얘진다… 가장 자신 있던 ${STAT_NAMES[top]}마저 흔들린다. (${STAT_NAMES[top]} −${BURNOUT_TOP_STAT_LOSS}, 체력 −${BURNOUT_STAMINA_LOSS}, 스트레스 ${BURNOUT_STRESS_RESET}으로)`,
  };
  d.phase = 'burnout';
}

function startGraduation(d: GameState): void {
  d.queue = [];
  d.pending = {
    source: 'graduation',
    tile: d.position,
    icon: '🎓',
    title: '졸업식',
    text: '3년이 눈 깜짝할 새 지나갔다. 꽃다발을 든 채 교문을 나선다. 나는 어떤 어른이 될까?',
  };
  d.phase = 'graduation';
}
