// (state, action) → { state, log }. 순수 함수: 입력 상태를 바꾸지 않는다.
import { STAT_NAMES, findTrait, getClub, getEvent, getItem, getRoute } from './content';
import {
  addCareerExp,
  applyEffects,
  applyMoney,
  applyStat,
  applyStress,
  baseCareerGain,
  consumeBuffs,
  hasBuff,
  removeBuff,
  setStress,
  tickMoveBuffs,
} from './effects';
import { resolveReroll, startEnding } from './ending';
import { setResult, since, type Ctx } from './flow';
import { isSuccess, planJudge, rollJudge } from './judge';
import { createRng } from './rng';
import {
  ABILITY_USES_PER_YEAR,
  BOARD_SIZE,
  BURNOUT_STAMINA_LOSS,
  BURNOUT_TOP_STAT_LOSS,
  BURNOUT_STRESS_RESET,
  CORNERS,
  CRITICAL_STRESS_RELIEF,
  FUMBLE_EXTRA_STRESS,
  MOVE_DIE,
  START_MONEY,
  highestStat,
  scaleStatGain,
} from './rules';
import { handleClubAction } from './tiles/club';
import { handleCounselAction } from './tiles/counsel';
import { resolveExam } from './tiles/exam';
import { land, runNext } from './tiles/index';
import type { Action, ChoiceOption, Effects, GameState, PendingEvent, ReduceResult, Stat } from './types';
import { STATS } from './types';
import { getRouteViews, optionAvailability } from './view';

const ENROLL_FACES: Record<number, { label: string; effects?: Effects }> = {
  1: { label: `학업 +${scaleStatGain(10)}`, effects: { stats: { study: 10 } } },
  2: { label: `체력 +${scaleStatGain(10)}`, effects: { stats: { stamina: 10 } } },
  3: { label: `인맥 +${scaleStatGain(10)}`, effects: { stats: { social: 10 } } },
  4: { label: `운 +${scaleStatGain(10)}`, effects: { stats: { luck: 10 } } },
  5: { label: '스트레스 −10', effects: { stress: -10 } },
  6: { label: `원하는 능력치 +${scaleStatGain(10)}` },
};

export function reduce(state: GameState, action: Action): ReduceResult {
  const d: GameState = structuredClone(state);
  const rng = createRng(d.rngState);
  const ctx: Ctx = { rng, log: [] };
  const error = step(d, ctx, action);
  if (error) return { state, log: [], error };
  d.rngState = rng.state;
  return { state: d, log: ctx.log };
}

function step(d: GameState, ctx: Ctx, a: Action): string | undefined {
  const p = d.pending;
  switch (a.type) {
    case 'SELECT_TRAIT': {
      if (d.phase !== 'trait_select') return 'not now';
      const t = findTrait(a.traitId);
      if (!t) return 'unknown trait';
      d.traitId = t.id;
      d.stats = { study: t.stats.study, stamina: t.stats.stamina, social: t.stats.social, luck: t.stats.luck };
      d.stress = t.stress;
      d.money = START_MONEY;
      d.phase = 'enroll_roll';
      d.pending = {
        source: 'enroll',
        icon: '🎲',
        tile: 0,
        title: '입학 주사위',
        text: `${t.emoji} ${t.name}(으)로 입학했다! 입학식 날의 운을 주사위로 정해 보자.`,
      };
      return;
    }
    case 'ROLL_ENROLL': {
      if (d.phase !== 'enroll_roll' || !p || p.enrollDie != null) return 'not now';
      const die = ctx.rng.d6();
      if (die === 6) {
        d.pending = { ...p, enrollDie: 6, pickFor: 'enroll_stat', text: '6이 나왔다! 원하는 능력치 하나를 +10 올릴 수 있다.' };
        return;
      }
      const start = ctx.log.length;
      applyEffects(d, ENROLL_FACES[die].effects, ctx.log);
      setResult(d, {
        source: 'enroll',
        enrollDie: die,
        title: `입학 주사위: ${die}`,
        text: ENROLL_FACES[die].label,
        resultText: '설레는 고등학교 생활이 시작된다!',
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'ENROLL_PICK_STAT': {
      if (d.phase !== 'enroll_roll' || p?.enrollDie !== 6) return 'not now';
      if (!STATS.includes(a.stat)) return 'unknown stat';
      const start = ctx.log.length;
      applyStat(d, a.stat, 10, ctx.log);
      setResult(d, {
        source: 'enroll',
        enrollDie: 6,
        title: '입학 주사위: 6',
        text: `${STAT_NAMES[a.stat as Stat]} +${scaleStatGain(10)}`,
        resultText: '설레는 고등학교 생활이 시작된다!',
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'ROLL_MOVE': {
      if (d.phase !== 'await_roll') return 'not now';
      const die = MOVE_DIE[ctx.rng.int(MOVE_DIE.length)];
      d.turn += 1;
      d.move = { die, remaining: die, from: d.position };
      d.pending = undefined;
      d.phase = 'moving';
      return;
    }
    case 'STEP_DONE': {
      if (d.phase !== 'moving' || !d.move) return 'not now';
      d.position = (d.position + 1) % BOARD_SIZE;
      d.move.remaining -= 1;
      tickMoveBuffs(d, ctx.log);
      if ((CORNERS as readonly number[]).includes(d.position) || d.move.remaining <= 0) {
        d.move = undefined;
        land(d, ctx);
      }
      return;
    }
    case 'CHOOSE': {
      if (d.phase !== 'choice' || !p?.options) return 'not now';
      const opt = p.options.find((o) => o.id === a.optionId);
      if (!opt) return 'unknown option';
      const av = optionAvailability(d, opt);
      if (av.disabled) return av.reason ?? 'disabled';
      return choose(d, ctx, p, opt);
    }
    case 'USE_ABILITY':
      return useAbility(d, ctx);
    case 'CONTINUE': {
      switch (d.phase) {
        case 'result':
        case 'tile_event':
          runNext(d, ctx);
          return;
        case 'judge':
          resolveJudge(d, ctx);
          return;
        case 'burnout': {
          const top = highestStat(d.stats);
          applyStat(d, top, -BURNOUT_TOP_STAT_LOSS, ctx.log);
          applyStat(d, 'stamina', -BURNOUT_STAMINA_LOSS, ctx.log);
          setStress(d, BURNOUT_STRESS_RESET, ctx.log);
          d.burnoutPending = false;
          runNext(d, ctx);
          return;
        }
        case 'graduation':
          startEnding(d, ctx);
          return;
        default:
          return 'not now';
      }
    }
    case 'BUY': {
      if (d.phase !== 'shop' || !p) return 'not now';
      const item = getItem(a.itemId);
      if (!item || !p.shopItems?.includes(item.id)) return 'unknown item';
      if (d.money < item.price) return '용돈 부족';
      applyMoney(d, -item.price, ctx.log);
      applyEffects(d, item.effects, ctx.log);
      d.pending = { ...d.pending!, bought: [...(p.bought ?? []), item.id] };
      return;
    }
    case 'LEAVE_SHOP': {
      if (d.phase !== 'shop') return 'not now';
      runNext(d, ctx);
      return;
    }
    case 'SELECT_ROUTE': {
      if (d.phase !== 'route_select') return 'not now';
      const route = getRoute(a.routeId);
      const view = getRouteViews(d).find((v) => v.route.id === a.routeId);
      if (!route || !view) return 'unknown route';
      if (view.disabled) return view.reason ?? 'disabled';
      const start = ctx.log.length;
      d.routeId = route.id;
      ctx.log.push({ kind: 'route', id: route.id });
      applyEffects(d, route.effects, ctx.log);
      setResult(d, {
        source: 'route',
        icon: route.emoji,
        title: `${route.emoji} ${route.name} 배정!`,
        text: route.desc,
        changes: since(ctx.log, start),
      });
      return;
    }
    case 'ROULETTE_REROLL': {
      if (d.phase !== 'ending' || !d.ending?.awaitingReroll) return 'not now';
      resolveReroll(d, ctx, a.accept);
      return;
    }
  }
  return 'unknown action';
}

function choose(d: GameState, ctx: Ctx, p: PendingEvent, opt: ChoiceOption): string | undefined {
  if (opt.action === 'exam') {
    startJudge(d, ctx, p, opt, true);
    return;
  }
  if (handleClubAction(d, ctx, opt)) return;
  if (handleCounselAction(d, opt)) return;
  if (opt.check) {
    startJudge(d, ctx, p, opt, false);
    return;
  }
  const start = ctx.log.length;
  applyEffects(d, opt.effects, ctx.log, { kind: opt.kind });
  clubEventBonus(d, ctx, p, opt.effects);
  refuseFavorPenalty(d, ctx, opt);
  setResult(d, {
    source: p.source,
    eventId: p.eventId,
    icon: p.icon,
    title: p.title,
    text: opt.label,
    resultText: opt.resultText?.done,
    chosen: opt,
    changes: since(ctx.log, start),
  });
}

function startJudge(d: GameState, ctx: Ctx, p: PendingEvent, opt: ChoiceOption, exam: boolean): void {
  const armed = !!p.abilityArmed && d.traitId === 'insider' && d.abilityUses < ABILITY_USES_PER_YEAR;
  const plan = planJudge(d, { check: opt.check!, kind: opt.kind, judgeMod: opt.judgeMod, exam, armed });
  const judge = rollJudge(ctx.rng, plan, opt.check!.by);
  if (armed) {
    d.abilityUses += 1;
    ctx.log.push({ kind: 'note', text: '인싸력 발동! 인맥으로 판정' });
  }
  if (hasBuff(d, 'energy_drink')) removeBuff(d, 'energy_drink', ctx.log);
  if (plan.resolvedBy === 'social' && hasBuff(d, 'travel')) removeBuff(d, 'travel', ctx.log);
  if (exam) consumeBuffs(d, 'exam', ctx.log);
  d.pending = { ...p, chosen: opt, judge, abilityArmed: false };
  d.phase = 'judge';
}

function resolveJudge(d: GameState, ctx: Ctx): void {
  const p = d.pending!;
  if (p.source === 'exam') {
    resolveExam(d, ctx);
    return;
  }
  const j = p.judge!;
  const opt = p.chosen!;
  const ok = isSuccess(j.outcome);
  const start = ctx.log.length;
  const eff = ok ? opt.onSuccess : opt.onFail;
  applyEffects(d, eff, ctx.log, { kind: opt.kind });
  if (j.outcome === 'critical') {
    applyStress(d, -CRITICAL_STRESS_RELIEF, ctx.log, opt.kind);
    ctx.log.push({ kind: 'note', text: '대성공 보너스!' });
  }
  if (j.outcome === 'fumble') applyStress(d, FUMBLE_EXTRA_STRESS, ctx.log);
  if (!ok && j.resolvedBy === 'study' && d.traitId === 'effort') {
    applyStat(d, 'study', 3, ctx.log);
    ctx.log.push({ kind: 'note', text: '노력형: 실패에서도 배운다' });
  }
  if (ok) clubEventBonus(d, ctx, p, eff);
  applyEffects(d, opt.after, ctx.log, { kind: opt.kind });
  refuseFavorPenalty(d, ctx, opt);
  setResult(d, {
    source: p.source,
    eventId: p.eventId,
    icon: p.icon,
    title: p.title,
    text: opt.label,
    resultText: ok ? opt.resultText?.success : opt.resultText?.fail,
    chosen: opt,
    judge: j,
    changes: since(ctx.log, start),
  });
}

function useAbility(d: GameState, ctx: Ctx): string | undefined {
  const p = d.pending;
  if (!p) return 'not now';
  if (d.traitId === 'insider') {
    if (d.phase !== 'choice' || !p.options?.some((o) => o.check)) return 'not now';
    if (!p.abilityArmed && d.abilityUses >= ABILITY_USES_PER_YEAR) return '올해 능력을 다 썼다';
    d.pending = { ...p, abilityArmed: !p.abilityArmed };
    return;
  }
  if (d.traitId === 'lucky') {
    if (d.phase !== 'judge' || p.judge?.outcome !== 'fumble') return 'not now';
    if (d.abilityUses >= ABILITY_USES_PER_YEAR) return '올해 능력을 다 썼다';
    d.abilityUses += 1;
    d.pending = { ...p, judge: { ...p.judge, outcome: 'fail', converted: true } };
    ctx.log.push({ kind: 'note', text: '행운 발동! 대실패를 실패로' });
    return;
  }
  return 'no active ability';
}

/** 인싸형 약점: 부탁을 거절하면 스트레스 +10 */
function refuseFavorPenalty(d: GameState, ctx: Ctx, opt: ChoiceOption): void {
  if (d.traitId === 'insider' && opt.tags?.includes('refuseFavor')) {
    applyStress(d, 10, ctx.log);
    ctx.log.push({ kind: 'note', text: '인싸형: 거절하고 나니 마음이 쓰인다' });
  }
}

/** 댄스부 등: 동아리 사건에서 동아리 분야 경험치를 얻으면 보너스 분야도 함께 */
function clubEventBonus(d: GameState, ctx: Ctx, p: PendingEvent, eff: Effects | undefined): void {
  if (p.source !== 'event' || !p.eventId) return;
  if (getEvent(p.eventId)?.tile !== 'club') return;
  const club = getClub(d.clubId);
  if (!club?.bonusCareer) return;
  if (baseCareerGain(d, eff, club.career) < 3) return;
  for (const [c, v] of Object.entries(club.bonusCareer)) {
    if (v) addCareerExp(d, c as keyof typeof d.careerExp, v, ctx.log);
  }
}

