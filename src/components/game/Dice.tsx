'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MOVE_DIE } from '@/engine/rules';

const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** 일반 주사위 한 면 (점 1~6). value가 없으면 '?' */
export function DieFace({ value, size = 64, className = '' }: { value?: number; size?: number; className?: string }) {
  const cells = value ? (PIP_CELLS[value] ?? []) : [];
  const pip = Math.max(6, Math.round(size * 0.17));
  return (
    <div
      role="img"
      aria-label={value ? `주사위 ${value}` : '주사위'}
      className={`grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-[22%] border-[3px] border-ink bg-white shadow-[0_4px_0_0_var(--color-ink)] ${className}`}
      style={{ width: size, height: size, padding: size * 0.12 }}
    >
      {value ? (
        Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: pip,
              height: pip,
              backgroundColor: cells.includes(i) ? (value === 1 ? 'var(--color-danger)' : 'var(--color-ink)') : 'transparent',
            }}
          />
        ))
      ) : (
        <span className="col-span-3 row-span-3 font-display text-ink/40" style={{ fontSize: size * 0.5 }}>
          ?
        </span>
      )}
    </div>
  );
}

/** 이동 주사위 한 면 (1·1·1·2·2·3). 노란 바탕에 큰 숫자와 발자국 화살표 */
export function MoveDieFace({ value, size = 72, className = '' }: { value?: number; size?: number; className?: string }) {
  return (
    <div
      role="img"
      aria-label={value ? `이동 주사위 ${value}칸` : '이동 주사위'}
      className={`relative flex shrink-0 flex-col items-center justify-center rounded-[26%] border-[3px] border-ink bg-sun shadow-[0_4px_0_0_var(--color-ink)] ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[9%] rounded-[22%] border-2 border-dashed border-ink/35"
      />
      <span className="font-display leading-none text-ink" style={{ fontSize: size * 0.46 }}>
        {value ?? '?'}
      </span>
      <span aria-hidden="true" className="font-display leading-none text-ink/80" style={{ fontSize: Math.max(10, size * 0.2) }}>
        {value ? '▶'.repeat(value) : '칸'}
      </span>
    </div>
  );
}

/**
 * 굴러가는 주사위. rolling 동안 아무 면이나 빠르게 보여 주고,
 * 멈추면 엔진이 정한 value에 착 붙는다.
 */
export function RollingDie({
  value,
  rolling,
  variant = 'pip',
  size = 64,
  className = '',
}: {
  value?: number;
  rolling: boolean;
  variant?: 'pip' | 'move';
  size?: number;
  className?: string;
}) {
  const [face, setFace] = useState<number>(1);
  useEffect(() => {
    if (!rolling) return;
    const faces: readonly number[] = variant === 'move' ? MOVE_DIE : [1, 2, 3, 4, 5, 6];
    const iv = setInterval(() => {
      setFace(faces[Math.floor(Math.random() * faces.length)]);
    }, 70);
    return () => clearInterval(iv);
  }, [rolling, variant]);

  const shown = rolling ? face : value;
  return (
    <motion.div
      className={`inline-block ${className}`}
      animate={
        rolling
          ? { rotate: [0, -18, 14, -10, 8, 0], y: [0, -10, 0, -6, 0] }
          : { rotate: 0, y: 0, scale: [1.18, 1] }
      }
      transition={
        rolling
          ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 420, damping: 14 }
      }
    >
      {variant === 'move' ? <MoveDieFace value={shown} size={size} /> : <DieFace value={shown} size={size} />}
    </motion.div>
  );
}

/** 이동 주사위 면 구성 띠: 1·1·1·2·2·3, 나온 눈과 같은 면을 강조 */
export function MoveDieStrip({ value, dark = false }: { value?: number; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1" aria-label="이동 주사위 면: 1, 1, 1, 2, 2, 3">
        {MOVE_DIE.map((f, i) => {
          const hit = value === f;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`flex h-7 w-7 items-center justify-center rounded-md border-2 font-display text-base leading-none ${
                hit
                  ? 'border-ink bg-sun text-ink'
                  : dark
                    ? 'border-white/40 text-white/80'
                    : 'border-line bg-white text-muted'
              }`}
            >
              {f}
            </span>
          );
        })}
      </div>
    </div>
  );
}
