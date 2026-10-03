'use client';
import { motion } from 'framer-motion';

/**
 * 플레이어 말. 칸이 바뀌면 layoutId로 다음 칸까지 미끄러지고, 안쪽 요소가 한 번 깡총 뛴다.
 * Tile 안에 그려지므로 칸 위치 계산은 격자가 맡는다.
 */
export function Pawn({ emoji, position, stepMs }: { emoji: string; position: number; stepMs: number }) {
  const duration = Math.max(0.08, (stepMs / 1000) * 0.9);
  return (
    <motion.div
      layoutId="yd-pawn"
      transition={{ layout: { type: 'tween', duration, ease: 'easeInOut' } }}
      className="pointer-events-none absolute -top-[14%] -right-[10%] z-20 flex w-[50%] max-w-14 justify-center"
      aria-hidden="true"
    >
      <motion.div
        key={position}
        initial={{ y: 0 }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration, ease: 'easeOut' }}
        className="flex aspect-square w-full items-center justify-center rounded-full border-[3px] border-ink bg-accent text-[clamp(14px,2.6vw,26px)] leading-none shadow-[0_3px_0_0_var(--color-ink)]"
      >
        <span>{emoji}</span>
      </motion.div>
    </motion.div>
  );
}
