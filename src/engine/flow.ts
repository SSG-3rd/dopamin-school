// 화면 단계 전환 도우미
import { content } from './content';
import type { Rng } from './rng';
import type { Change, ChoiceOption, GameState, PendingEvent, PendingSource } from './types';

export interface Ctx {
  rng: Rng;
  log: Change[];
}

export function tileIcon(d: GameState): string {
  return content.board[d.position]?.icon ?? '🎲';
}

export function setChoice(
  d: GameState,
  p: { source: PendingSource; title: string; text: string; options: ChoiceOption[] } & Partial<PendingEvent>,
): void {
  d.pending = { tile: d.position, icon: tileIcon(d), ...p };
  d.phase = 'choice';
}

/** 결과 화면. changes는 이번 처리에서 생긴 로그 조각 */
export function setResult(
  d: GameState,
  p: { source: PendingSource; title: string; text?: string; resultText?: string; changes: Change[] } & Partial<PendingEvent>,
): void {
  d.pending = { tile: d.position, icon: tileIcon(d), text: '', ...p };
  d.phase = 'result';
}

export function endTurn(d: GameState): void {
  d.pending = undefined;
  d.phase = 'await_roll';
}

/** log의 start 이후 부분 */
export function since(log: Change[], start: number): Change[] {
  return log.slice(start);
}
