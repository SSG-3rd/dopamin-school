// 장소 칸(등굣길·교실·도서관·운동장): 사건 풀에서 하나를 뽑아 선택지 3개(+해금 1개)를 보여 준다.
import { content, type GameEvent } from '../content';
import { hasBuff } from '../effects';
import { setChoice, setResult, type Ctx } from '../flow';
import { careerLevel } from '../rules';
import type { ChoiceOption, GameState } from '../types';

export function requiresOk(d: GameState, e: GameEvent): boolean {
  const r = e.requires;
  if (!r) return true;
  if (r.routeId != null && d.routeId !== r.routeId) return false;
  if (r.clubId != null && d.clubId !== r.clubId) return false;
  if (r.minStats) {
    for (const [s, v] of Object.entries(r.minStats)) {
      if (d.stats[s as keyof typeof d.stats] < (v ?? 0)) return false;
    }
  }
  return true;
}

export function unlockOk(d: GameState, o: ChoiceOption): boolean {
  if (!o.unlock) return true;
  if ('buff' in o.unlock) return hasBuff(d, o.unlock.buff);
  return careerLevel(d.careerExp[o.unlock.career]) >= o.unlock.level;
}

export function pickEvent(d: GameState, ctx: Ctx, tile: GameEvent['tile']): GameEvent | null {
  const pool = content.events.filter((e) => e.tile === tile && e.years.includes(d.year) && requiresOk(d, e));
  let fresh = pool.filter((e) => !d.seenEvents.includes(e.id));
  if (fresh.length === 0) fresh = pool;
  if (fresh.length === 0) return null;
  // 루트·동아리 전용 사건은 조금 더 자주 나오게
  const weights = fresh.map((e) => (e.requires?.routeId || e.requires?.clubId ? 2 : 1));
  return fresh[ctx.rng.weighted(weights)];
}

export function showEvent(d: GameState, e: GameEvent, extra: ChoiceOption[] = []): void {
  d.seenEvents.push(e.id);
  setChoice(d, {
    source: 'event',
    eventId: e.id,
    title: e.title,
    text: e.text,
    options: [...e.options.filter((o) => unlockOk(d, o)), ...extra] as ChoiceOption[],
  });
}

export function startPlaceEvent(d: GameState, ctx: Ctx, tile: 'commute' | 'classroom' | 'library' | 'field'): void {
  const e = pickEvent(d, ctx, tile);
  if (!e) {
    setResult(d, { source: 'event', title: content.board[d.position].name, text: '오늘은 조용히 지나갔다.', changes: [] });
    return;
  }
  showEvent(d, e);
}
