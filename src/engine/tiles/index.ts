// 칸 도착 처리와 코너 칸의 여러 단계(용돈 → 루트 → 방학 → 상점 …)를 순서대로 진행한다.
import { STAT_TEXT, content } from '../content';
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
import { money, tx } from '../text';
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
        title: tx('engine.promo.title', { year: d.year }),
        text: tx('engine.promo.text', { money: money(amount) }),
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'summer_allowance': {
      const amount = giveAllowance(d, ctx, ALLOWANCE_SUMMER);
      setResult(d, {
        source: 'allowance',
        title: tx('engine.summer.title'),
        text: tx('engine.summer.text', { money: money(amount) }),
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'route':
      d.pending = {
        source: 'route',
        tile: d.position,
        icon: '🧭',
        title: tx('engine.route.title'),
        text: tx('engine.route.text'),
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
        title: tx('engine.shop.title'),
        text: tx('engine.shop.text'),
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
    title: tx('engine.burnout.title'),
    text: tx('engine.burnout.text', {
      stat: STAT_TEXT[top],
      loss: BURNOUT_TOP_STAT_LOSS,
      stamina: BURNOUT_STAMINA_LOSS,
      reset: BURNOUT_STRESS_RESET,
    }),
  };
  d.phase = 'burnout';
}

function startGraduation(d: GameState): void {
  d.queue = [];
  d.pending = {
    source: 'graduation',
    tile: d.position,
    icon: '🎓',
    title: tx('engine.graduation.title'),
    text: tx('engine.graduation.text'),
  };
  d.phase = 'graduation';
}
