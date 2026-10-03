'use client';
import type { ReactNode } from 'react';
import type { BoardTile } from '@/engine/content';
import { tileGridPos } from '@/engine/rules';

const CORNER_BG: Record<string, string> = {
  promotion: 'bg-sun',
  exam: 'bg-sky',
  summer: 'bg-accent',
};

const KIND_BG: Record<BoardTile['kind'], string> = {
  corner: 'bg-sun',
  place: 'bg-white',
  general: 'bg-paper-2',
};

/** 보드의 한 칸. 아이콘과 이름을 함께 보여 주고, 현재 칸은 굵은 테두리와 "여기" 표시로 강조한다. */
export function Tile({ tile, here, children }: { tile: BoardTile; here: boolean; children?: ReactNode }) {
  const { row, col } = tileGridPos(tile.index);
  const corner = tile.kind === 'corner';
  const bg = corner ? (CORNER_BG[tile.type] ?? KIND_BG.corner) : KIND_BG[tile.kind];
  return (
    <div
      className="relative min-h-0 min-w-0 p-[3px]"
      style={{ gridRow: row, gridColumn: col }}
      aria-label={`${tile.index}번 칸 ${tile.name}${here ? ' (지금 위치)' : ''}`}
      role="listitem"
    >
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[14px] border-2 px-px text-center ${bg} ${
          here ? 'border-ink ring-4 ring-sun' : corner ? 'border-ink/60' : 'border-line'
        }`}
      >
        <span
          aria-hidden="true"
          className={`leading-none ${corner ? 'text-[clamp(20px,4.6vw,34px)]' : 'text-[clamp(16px,3.6vw,26px)]'}`}
        >
          {tile.icon}
        </span>
        <span
          className={`font-display leading-[1.1] break-keep text-ink ${
            corner ? 'text-[clamp(14px,4vw,18px)]' : 'text-[clamp(14px,3.9vw,16px)]'
          }`}
        >
          {tile.name}
        </span>
      </div>
      {children}
    </div>
  );
}
