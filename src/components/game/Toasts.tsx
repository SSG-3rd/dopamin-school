'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/store/game';
import { TONE_ICON } from './meta';

const TONE_CLASS = {
  good: 'border-mint bg-[#e6f8f1] text-good',
  bad: 'border-danger bg-[#fdeced] text-bad',
  info: 'border-sky bg-[#e8f3fc] text-info',
} as const;

/** "예술 Lv2 달성!", "버프 획득" 같은 변화 알림. 누르면 바로 닫힌다. */
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  // 선택·판정 오버레이가 떠 있으면 위쪽 상황 카드를 가리지 않게 아래로 내린다
  const overlay = useGame((s) => s.game?.phase === 'choice' || s.game?.phase === 'judge');
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-3 z-50 ${overlay ? 'bottom-4 flex-col-reverse' : 'top-16'} flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-80 [@media(min-width:960px)_and_(min-height:600px)]:top-auto [@media(min-width:960px)_and_(min-height:600px)]:bottom-4 [@media(min-width:960px)_and_(min-height:600px)]:right-auto [@media(min-width:960px)_and_(min-height:600px)]:left-4 [@media(min-width:960px)_and_(min-height:600px)]:w-72 [@media(min-width:960px)_and_(min-height:600px)]:flex-col-reverse [@media(min-width:960px)_and_(min-height:600px)]:items-start`}
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
            className={`pointer-events-auto flex w-full items-center gap-2 rounded-full border-[2.5px] px-4 py-2 text-left font-display text-base shadow-[0_3px_0_0_rgb(107_79_58/0.15)] ${TONE_CLASS[t.tone]}`}
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
