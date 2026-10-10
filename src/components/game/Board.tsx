'use client';
import { LayoutGroup } from 'framer-motion';
import type { ReactNode } from 'react';
import { content } from '@/engine/content';
import type { GameState } from '@/engine/types';
import { Pawn } from './Pawn';
import { Tile } from './Tile';

/** 성향마다 말(데굴이) 색 */
const PAWN_COLORS: Record<string, string> = {
  talent: '#ffe08a',
  effort: '#ffc2d1',
  athlete: '#ffd0b5',
  insider: '#bdeedb',
  lucky: '#d9ccff',
};

/**
 * 5×5 보드: 테두리 16칸 + 가운데 3×3(사건 카드·주사위 자리).
 * large면 가운데를 넓히려고 테두리 칸을 조금 좁게 그린다.
 */
export function Board({
  game,
  center,
  large = false,
  stepMs,
}: {
  game: GameState;
  center?: ReactNode;
  large?: boolean;
  stepMs: number;
}) {
  const tracks = large ? '17fr 22fr 22fr 22fr 17fr' : 'repeat(5, minmax(0, 1fr))';
  const pawn = PAWN_COLORS[game.traitId] ?? '#fffaf0';
  return (
    <div className="relative aspect-square w-full rounded-[30px] border-[3px] border-outline bg-[#bfe3ad] p-1.5 shadow-[0_6px_0_0_rgb(107_79_58/0.28)] sm:p-2">
      <LayoutGroup id="board">
        <div
          role="list"
          aria-label="학교 보드"
          className="grid h-full w-full"
          style={{ gridTemplateColumns: tracks, gridTemplateRows: tracks }}
        >
          {content.board.map((t) => {
            const here = game.position === t.index;
            return (
              <Tile key={t.index} tile={t} here={here}>
                {here && <Pawn color={pawn} position={game.position} stepMs={stepMs} />}
              </Tile>
            );
          })}
          <div className="relative min-h-0 min-w-0 p-1 sm:p-1.5" style={{ gridRow: '2 / 5', gridColumn: '2 / 5' }}>
            {center}
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}
