// 자동 플레이 정책: 밸런스 시뮬레이션과 테스트가 쓴다.
import { content } from './content';
import { reduce } from './reducer';
import type { Rng } from './rng';
import { createRng } from './rng';
import { newGame } from './state';
import type { Action, GameState } from './types';
import { STATS } from './types';
import { getAbilityView, getOptionViews, getRouteViews, getShopView } from './view';

export type Policy = 'random' | 'greedy';

export function autoAction(state: GameState, rng: Rng, policy: Policy = 'random'): Action {
  const p = state.pending;
  switch (state.phase) {
    case 'trait_select':
      return { type: 'SELECT_TRAIT', traitId: rng.pick(content.traits).id };
    case 'enroll_roll':
      return p?.enrollDie === 6 ? { type: 'ENROLL_PICK_STAT', stat: rng.pick(STATS) } : { type: 'ROLL_ENROLL' };
    case 'await_roll':
      return { type: 'ROLL_MOVE' };
    case 'moving':
      return { type: 'STEP_DONE' };
    case 'choice': {
      const views = getOptionViews(state).filter((v) => !v.disabled);
      if (views.length === 0) throw new Error(`no enabled option: ${p?.title}`);
      if (policy === 'greedy') {
        // 성공 확률이 높은 판정, 그다음 성장형을 고른다
        const best = [...views].sort((a, b) => score(b) - score(a))[0];
        return { type: 'CHOOSE', optionId: best.option.id };
      }
      return { type: 'CHOOSE', optionId: rng.pick(views).option.id };
    }
    case 'judge':
      return getAbilityView(state)?.available ? { type: 'USE_ABILITY' } : { type: 'CONTINUE' };
    case 'shop': {
      const affordable = getShopView(state).filter((s) => s.affordable);
      if (affordable.length > 0 && (p?.bought?.length ?? 0) < 2 && rng.next() < 0.6) {
        return { type: 'BUY', itemId: rng.pick(affordable).item.id };
      }
      return { type: 'LEAVE_SHOP' };
    }
    case 'route_select': {
      const routes = getRouteViews(state).filter((r) => !r.disabled);
      return { type: 'SELECT_ROUTE', routeId: rng.pick(routes).route.id };
    }
    case 'ending':
      return { type: 'ROULETTE_REROLL', accept: rng.next() < 0.5 };
    default:
      return { type: 'CONTINUE' };
  }
}

function score(v: ReturnType<typeof getOptionViews>[number]): number {
  if (v.judge) return v.judge.probability * 2;
  if (v.option.kind === 'growth') return 1.5;
  if (v.option.kind === 'rest') return 0.5;
  return 1;
}

export interface SimResult {
  state: GameState;
  actions: number;
}

/** 한 판을 끝까지 자동 진행 */
export function playToEnd(seed: number, opts: { policy?: Policy; traitId?: string; maxActions?: number } = {}): SimResult {
  const rng = createRng(seed ^ 0x5bd1e995);
  let state = newGame(seed, 0);
  let actions = 0;
  const max = opts.maxActions ?? 5000;
  while (!(state.phase === 'ending' && state.ending && !state.ending.awaitingReroll)) {
    if (actions++ > max) throw new Error(`stuck at phase ${state.phase} (seed ${seed})`);
    let action = autoAction(state, rng, opts.policy);
    if (action.type === 'SELECT_TRAIT' && opts.traitId) action = { type: 'SELECT_TRAIT', traitId: opts.traitId };
    const r = reduce(state, action);
    if (r.error) throw new Error(`action ${action.type} failed in ${state.phase}: ${r.error} (seed ${seed})`);
    state = r.state;
  }
  return { state, actions };
}
