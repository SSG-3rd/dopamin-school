'use client';
// 선택지 화면에서 지금까지 쌓은 능력치·스트레스·돈·진로를 펼쳐 보는 버튼과 패널.
// 버튼은 화면 오른쪽 위에 고정. 넓은 화면은 버튼 아래 오른쪽 패널, 좁은 화면은 버튼 아래 위쪽 패널(카드는 그 아래로 비켜 난다).
import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type Ref } from 'react';
import { CAREER_ICONS, CAREER_NAMES, STAT_ICONS, STAT_NAMES } from '@/engine/content';
import { careerLevel, formatMoney, stressTier } from '@/engine/rules';
import { CAREERS, STATS } from '@/engine/types';
import type { GameState } from '@/engine/types';
import { activeBuffViews } from '@/engine/view';
import { Bar } from '@/components/ui';
import { STAT_COLORS, STRESS_META } from './meta';
import { StatPanel } from './StatPanel';

export const STATS_DRAWER_WIDTH = 340;

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
      className={`fixed top-3 right-3 z-[55] inline-flex min-h-11 items-center gap-2 rounded-full border-[2.5px] border-outline px-3.5 py-1 font-display text-lg leading-tight text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.3)] transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-sky-deep ${
        open ? 'bg-sky' : 'bg-[#e3f2fb] hover:bg-sky/70'
      }`}
    >
      <span>
        <span aria-hidden="true">{open ? '✕' : '📊'}</span> {open ? '능력치 닫기' : '내 능력치'}
      </span>
      {!open && (
        <span className="rounded-full border-2 border-outline/40 bg-paper px-2 text-base tabular-nums">
          <span aria-hidden="true">💰</span> {formatMoney(game.money)}
        </span>
      )}
      {showKey && (
        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border-2 border-outline/70 bg-paper px-1 text-sm leading-none">
          {open ? 'Esc' : 'S'}
        </kbd>
      )}
    </button>
  );
}

/** 좁은 화면용: 한눈에 보는 요약 (카드가 가려지지 않게 짧게) */
function StatsCompact({ game }: { game: GameState }) {
  const tier = stressTier(game.stress);
  const meta = STRESS_META[tier.id];
  const buffs = activeBuffViews(game);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xl leading-none">
          {game.year}학년 · {game.turn}턴
        </p>
        <p className="rounded-full border-2 border-outline/40 bg-paper-2 px-2.5 py-0.5 font-display text-lg tabular-nums">
          <span aria-hidden="true">💰</span> {formatMoney(game.money)}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {STATS.map((s) => (
          <li key={s} className="flex flex-col gap-0.5">
            <span className="flex items-center justify-between text-base">
              <span>
                <span aria-hidden="true">{STAT_ICONS[s]}</span> {STAT_NAMES[s]}
              </span>
              <span className="font-display text-lg tabular-nums">{game.stats[s]}</span>
            </span>
            <Bar value={game.stats[s]} color={STAT_COLORS[s]} label={`${STAT_NAMES[s]} ${game.stats[s]} / 100`} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center justify-between text-base">
          <span>
            <span aria-hidden="true">{meta.icon}</span> 스트레스 · <strong className="font-display font-normal">{tier.label}</strong>
          </span>
          <span className="font-display text-lg tabular-nums">{game.stress}</span>
        </span>
        <Bar value={game.stress} color={meta.color} label={`스트레스 ${game.stress} / 100, ${tier.label}`} />
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="진로 레벨">
        {CAREERS.map((c) => (
          <li key={c} className="rounded-full border-2 border-outline/35 bg-paper px-2 py-0.5 text-base">
            <span aria-hidden="true">{CAREER_ICONS[c]}</span> {CAREER_NAMES[c]}{' '}
            <strong className="font-display font-normal">Lv{careerLevel(game.careerExp[c])}</strong>
          </li>
        ))}
      </ul>
      {buffs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="버프">
          {buffs.map((b) => (
            <li
              key={b.id}
              className={`rounded-full border-2 px-2 py-0.5 text-base ${b.debuff ? 'border-danger/40 bg-danger/10' : 'border-mint/50 bg-mint/15'}`}
            >
              <span aria-hidden="true">{b.emoji}</span> {b.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatsDrawer({
  game,
  wide,
  fast,
  onClose,
  onHeight,
}: {
  game: GameState;
  wide: boolean;
  fast: boolean;
  onClose: () => void;
  /** 좁은 화면: 패널 높이를 알려 주면 카드가 그 아래로 비켜 난다 */
  onHeight?: (h: number) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || wide || !onHeight) return;
    const report = () => onHeight(el.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      onHeight(0);
    };
  }, [wide, onHeight]);

  // 패널 안에서 Tab이 돈다
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
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
      tabIndex={-1}
      onKeyDown={onKeyDown}
      initial={wide ? { x: '110%' } : { y: -16, opacity: 0 }}
      animate={wide ? { x: 0 } : { y: 0, opacity: 1 }}
      exit={wide ? { x: '110%' } : { y: -16, opacity: 0 }}
      transition={spring}
      style={wide ? { width: STATS_DRAWER_WIDTH } : undefined}
      className={
        wide
          ? 'fixed top-[4.25rem] right-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-[26px] border-[3px] border-outline bg-paper shadow-[0_6px_0_0_rgb(107_79_58/0.3)] outline-none'
          : 'fixed inset-x-3 top-[4.25rem] z-50 mx-auto flex max-h-[60dvh] max-w-[620px] flex-col overflow-hidden rounded-[24px] border-[3px] border-outline bg-paper shadow-[0_6px_0_0_rgb(107_79_58/0.3)] outline-none'
      }
    >
      <header className="flex items-center gap-2 border-b-2 border-dashed border-outline/30 bg-[#e3f2fb] px-4 py-2">
        <h3 className="flex-1 text-xl leading-tight text-ink">
          <span aria-hidden="true">📊</span> 지금까지의 나
        </h3>
        {!wide && (
          <button
            type="button"
            aria-expanded={full}
            onClick={() => setFull((f) => !f)}
            className="rounded-full border-2 border-outline/50 bg-paper px-2.5 py-0.5 font-display text-base text-ink"
          >
            {full ? '간단히 ▴' : '자세히 ▾'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="능력치 닫기"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-outline bg-paper font-display text-base text-ink hover:bg-paper-2 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {wide || full ? (
          <StatPanel game={game} className="border-0 bg-transparent p-1 shadow-none" />
        ) : (
          <StatsCompact game={game} />
        )}
      </div>
    </motion.section>
  );
}
