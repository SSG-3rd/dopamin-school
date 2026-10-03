'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/store/game';
import { TONE_ICON } from './meta';

const TONE_CLASS = {
  good: 'border-mint bg-[#e6f8f1] text-[#146b52]',
  bad: 'border-danger bg-[#fdeced] text-[#a8282c]',
  info: 'border-sky bg-[#e8f3fc] text-[#1d5a8a]',
} as const;

/** "예술 Lv2 달성!", "버프 획득" 같은 변화 알림. 누르면 바로 닫힌다. */
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-16 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-80 [@media(min-width:960px)_and_(min-height:600px)]:top-auto [@media(min-width:960px)_and_(min-height:600px)]:bottom-4 [@media(min-width:960px)_and_(min-height:600px)]:right-auto [@media(min-width:960px)_and_(min-height:600px)]:left-1/2 [@media(min-width:960px)_and_(min-height:600px)]:-translate-x-1/2 [@media(min-width:960px)_and_(min-height:600px)]:flex-col-reverse [@media(min-width:960px)_and_(min-height:600px)]:items-center"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            layout
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-display text-base shadow-[0_3px_0_0_rgb(43_42_51/0.15)] ${TONE_CLASS[t.tone]}`}
            aria-label={`${t.text} (알림 닫기)`}
          >
            <span aria-hidden="true">{TONE_ICON[t.tone]}</span>
            <span className="min-w-0 flex-1">{t.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
