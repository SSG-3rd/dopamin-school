'use client';
import { useEffect, useState } from 'react';
import { content } from '@/engine/content';
import type { GameState } from '@/engine/types';
import { Button } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { MoveDieStrip, RollingDie } from './Dice';
import { KeyBadge } from './EventCard';
import { isSpace, useAct, useHotkeys, useTiming } from './hooks';

/** 이동 주사위 + 면 구성 띠. 'moving'에 들어온 첫 순간에 구르다가 엔진이 정한 눈에 멈춘다. */
export function MoveDieDisplay({ game, size = 88, showStrip = true }: { game: GameState; size?: number; showStrip?: boolean }) {
  const timing = useTiming();
  const move = game.phase === 'moving' ? game.move : undefined;
  const rollId = move && move.remaining === move.die ? `${game.turn}-${move.from}` : null;
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (rollId == null) return;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), timing.dieRoll);
    return () => {
      clearTimeout(t);
      setRolling(false);
    };
  }, [rollId, timing.dieRoll]);

  const value = move?.die;
  return (
    <div className="flex flex-col items-center gap-2">
      <RollingDie value={value} rolling={rolling} variant="move" size={size} />
      {showStrip && <MoveDieStrip value={rolling ? undefined : value} dark />}
      <p className="min-h-6 text-center font-display text-lg leading-tight text-white" aria-live="polite">
        {move
          ? rolling
            ? '데굴데굴…'
            : `${move.die}칸 이동! (${move.die - move.remaining}/${move.die})`
          : '이동 주사위 1·1·1·2·2·3'}
      </p>
    </div>
  );
}

/** 주사위 굴리기 버튼 (Space) */
export function RollButton({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const canRoll = game.phase === 'await_roll';
  const roll = () => {
    if (!canRoll) return;
    playSound('roll');
    dispatch({ type: 'ROLL_MOVE' });
  };
  useHotkeys(
    (e) => {
      if (isSpace(e)) {
        roll();
        return true;
      }
    },
    canRoll,
  );
  return (
    <Button size="lg" block onClick={roll} disabled={!canRoll}>
      🎲 주사위 굴리기 <KeyBadge>Space</KeyBadge>
    </Button>
  );
}

/** 칠판(보드 가운데)에 쓰는 지금 상황 */
export function ChalkStatus({ game }: { game: GameState }) {
  const tile = content.board[game.position];
  return (
    <div className="flex flex-col items-center gap-0.5 text-center text-white">
      <p className="font-display text-xl leading-tight">
        {game.year}학년 · {game.turn}턴
      </p>
      {tile && (
        <p className="font-display text-lg leading-tight text-white/85">
          <span aria-hidden="true">{tile.icon}</span> {tile.name}
        </p>
      )}
    </div>
  );
}

/** 넓은 화면의 보드 가운데: 칠판 위에 주사위와 버튼 */
export function RollPanel({ game }: { game: GameState }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-white/15 bg-board-2/60 p-4">
      <ChalkStatus game={game} />
      <MoveDieDisplay game={game} />
      <div className="w-full max-w-xs">
        {game.phase === 'await_roll' ? (
          <RollButton game={game} />
        ) : (
          <p className="text-center text-base text-white/80">코너 칸(진급·시험·방학)에 닿으면 남은 눈과 상관없이 멈춰요.</p>
        )}
      </div>
    </div>
  );
}
