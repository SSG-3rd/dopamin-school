'use client';
import { motion } from 'framer-motion';
import { DiceBuddy } from '@/components/DiceBuddy';

/**
 * 플레이어 말(데굴이). 칸이 바뀌면 layoutId로 다음 칸까지 미끄러지고, 안쪽 요소가 한 번 깡총 뛴다.
 * Tile 안에 그려지므로 칸 위치 계산은 격자가 맡는다.
 */
export function Pawn({ color, position, stepMs }: { color: string; position: number; stepMs: number }) {
  const duration = Math.max(0.08, (stepMs / 1000) * 0.9);
  return (
    <motion.div
      layoutId="yd-pawn"
      transition={{ layout: { type: 'tween', duration, ease: 'easeInOut' } }}
      className="pointer-events-none absolute -top-[22%] -right-[12%] z-20 flex w-[58%] max-w-16 justify-center"
      aria-hidden="true"
    >
      <motion.div
        key={position}
        initial={{ y: 0, rotate: 0 }}
        animate={{ y: [0, -16, 0], rotate: [0, -10, 0] }}
        transition={{ duration, ease: 'easeOut' }}
        className="w-full"
      >
        <DiceBuddy size={64} color={color} className="h-auto w-full" />
      </motion.div>
    </motion.div>
  );
}
