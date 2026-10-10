'use client';
// 선택지 화면에서 지금까지 쌓은 능력치·스트레스·돈·진로를 펼쳐 보는 버튼과 패널.
// 넓은 화면은 오른쪽에서 밀려 나오는 패널, 좁은 화면은 아래에서 올라오는 시트.
import { motion } from 'framer-motion';
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type Ref } from 'react';
import { formatMoney } from '@/engine/rules';
import type { GameState } from '@/engine/types';
import { StatPanel } from './StatPanel';

export function StatsToggle({
  game,
  open,
  onToggle,
  showKey,
  buttonRef,
}: {
  game: GameState;
  open: boolean;
  onToggle: () => void;
  showKey: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-controls="yd-stats-drawer"
      onClick={onToggle}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-[2.5px] border-outline px-4 py-1 font-display text-lg leading-tight text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.25)] transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-sky-deep ${
        open ? 'bg-sky' : 'bg-[#e3f2fb] hover:bg-sky/70'
      }`}
    >
      <span>
        <span aria-hidden="true">📊</span> 내 능력치
      </span>
      <span className="rounded-full border-2 border-outline/40 bg-paper px-2 text-base tabular-nums">
        <span aria-hidden="true">💰</span> {formatMoney(game.money)}
      </span>
      {showKey && (
        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border-2 border-outline/70 bg-paper px-1 text-sm leading-none">
          S
        </kbd>
      )}
    </button>
  );
}

export function StatsDrawer({
  game,
  wide,
  fast,
  onClose,
}: {
  game: GameState;
  wide: boolean;
  fast: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  // 패널 안에서 Tab이 돈다 (선택지 창 전체의 Tab 순환과 같은 방식)
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    e.stopPropagation();
  };

  const spring = fast ? { duration: 0.12 } : { type: 'spring' as const, stiffness: 340, damping: 32 };

  return (
    <motion.section
      ref={panelRef}
      id="yd-stats-drawer"
      role="region"
      aria-label="지금까지의 능력치와 돈"
      onKeyDown={onKeyDown}
      initial={wide ? { x: '110%' } : { y: '100%' }}
      animate={wide ? { x: 0 } : { y: 0 }}
      exit={wide ? { x: '110%' } : { y: '100%' }}
      transition={spring}
      className={
        wide
          ? 'fixed top-3 right-3 bottom-3 z-50 flex w-[380px] flex-col overflow-hidden rounded-[26px] border-[3px] border-outline bg-paper shadow-[0_6px_0_0_rgb(107_79_58/0.3)]'
          : 'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[28px] border-x-[3px] border-t-[3px] border-outline bg-paper shadow-[0_-6px_24px_rgb(107_79_58/0.3)]'
      }
    >
      <header className="flex items-center gap-2 border-b-2 border-dashed border-outline/30 bg-[#e3f2fb] px-4 py-3">
        <h3 className="flex-1 text-xl leading-tight text-ink">
          <span aria-hidden="true">📊</span> 지금까지의 나
        </h3>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[2.5px] border-outline bg-paper px-3 font-display text-base text-ink shadow-[0_2px_0_0_rgb(107_79_58/0.25)] hover:bg-paper-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
        >
          <span aria-hidden="true">✕</span> 닫기
          {wide && <span className="text-sm text-muted">Esc</span>}
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <StatPanel game={game} className="border-0 bg-transparent p-1 shadow-none" />
      </div>
    </motion.section>
  );
}
