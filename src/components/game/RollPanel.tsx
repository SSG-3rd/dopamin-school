'use client';
import { useEffect, useState } from 'react';
import { content } from '@/engine/content';
import type { GameState } from '@/engine/types';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/client';
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
  const { t } = useI18n();

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
      {showStrip && <MoveDieStrip value={rolling ? undefined : value} />}
      <p className="min-h-6 text-center font-display text-lg leading-tight text-ink" aria-live="polite">
        {move
          ? rolling
            ? t('ui.roll.rolling')
            : t('ui.roll.moving', { die: move.die, done: move.die - move.remaining })
          : t('ui.roll.faces')}
      </p>
    </div>
  );
}

/** 주사위 굴리기 버튼 (Space) */
export function RollButton({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const canRoll = game.phase === 'await_roll';
  const { t } = useI18n();
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
      {t('ui.roll.button')} <KeyBadge>Space</KeyBadge>
    </Button>
  );
}

/** 칠판(보드 가운데)에 쓰는 지금 상황 */
export function ChalkStatus({ game }: { game: GameState }) {
  const tile = content.board[game.position];
  const { t, text } = useI18n();
  return (
    <div className="flex flex-col items-center gap-0.5 text-center text-ink">
      <p className="font-display text-xl leading-tight">{t('ui.panel.yearTurn', { year: game.year, turn: game.turn })}</p>
      {tile && (
        <p className="font-display text-lg leading-tight text-muted">
          <span aria-hidden="true">{tile.icon}</span> {text(tile.name)}
        </p>
      )}
    </div>
  );
}

/** 넓은 화면의 보드 가운데: 칠판 위에 주사위와 버튼 */
export function RollPanel({ game }: { game: GameState }) {
  const { t } = useI18n();
  return (
    <div className="yd-ground flex h-full flex-col items-center justify-center gap-3 rounded-[22px] border-[2.5px] border-outline p-4">
      <ChalkStatus game={game} />
      <MoveDieDisplay game={game} />
      <div className="w-full max-w-xs">
        {game.phase === 'await_roll' ? (
          <RollButton game={game} />
        ) : (
          <p className="text-center text-base text-muted">{t('ui.roll.cornerHint')}</p>
        )}
      </div>
    </div>
  );
}
