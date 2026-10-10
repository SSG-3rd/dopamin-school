'use client';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { GameState } from '@/engine/types';
import { buttonClass } from '@/components/ui';
import { APP_NAME } from '@/lib/brand';
import { useSettings } from '@/lib/settings';
import { playSound } from '@/lib/sound';
import { useGame } from '@/store/game';
import { AugmentPicker, pickerKey } from './AugmentPicker';
import { Board } from './Board';
import { EndingScene } from './EndingScene';
import { EnrollRoll } from './EnrollRoll';
import { EventCard } from './EventCard';
import { JudgeOverlay } from './JudgeOverlay';
import { ChalkStatus, MoveDieDisplay, RollButton, RollPanel } from './RollPanel';
import { RouteSelect } from './RouteSelect';
import { Shop } from './Shop';
import { StatPanel, StatSummary } from './StatPanel';
import { Toasts } from './Toasts';
import { TraitSelect } from './TraitSelect';
import { type Timing, useMediaQuery, useTiming } from './hooks';

/** 'moving' 동안 한 칸씩 STEP_DONE을 보낸다. 첫 칸은 주사위가 멈춘 뒤에 출발. */
function useMoveDriver(game: GameState, timing: Timing) {
  const dispatch = useGame((s) => s.dispatch);
  useEffect(() => {
    if (game.phase !== 'moving' || !game.move) return;
    const first = game.move.remaining === game.move.die;
    const delay = first ? timing.dieRoll + timing.dieHold : timing.step;
    const t = setTimeout(() => {
      const err = dispatch({ type: 'STEP_DONE' });
      if (!err) playSound('step');
    }, delay);
    return () => clearTimeout(t);
  }, [game, timing, dispatch]);
}

function GameHeader() {
  const fast = useSettings((s) => s.fast);
  const sound = useSettings((s) => s.sound);
  const setSettings = useSettings((s) => s.set);
  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2">
        <Link href="/" className={buttonClass('ghost', 'sm')} aria-label="처음 화면으로">
          ← 처음으로
        </Link>
        <span className="hidden font-display text-xl sm:inline">
          <span aria-hidden="true">🎲</span> {APP_NAME}
        </span>
        <span className="ml-auto" />
        <button
          type="button"
          aria-pressed={fast}
          onClick={(e) => {
            setSettings({ fast: !fast });
            if (e.detail > 0) e.currentTarget.blur();
          }}
          className={`${buttonClass(fast ? 'primary' : 'secondary', 'sm')} whitespace-nowrap`}
        >
          ⚡ 빠른 진행 <span className="text-base">{fast ? '켬' : '끔'}</span>
        </button>
        <button
          type="button"
          aria-pressed={sound}
          onClick={(e) => {
            setSettings({ sound: !sound });
            if (e.detail > 0) e.currentTarget.blur();
          }}
          className={`${buttonClass('secondary', 'sm')} whitespace-nowrap`}
          aria-label={sound ? '소리 끄기' : '소리 켜기'}
        >
          {sound ? '🔊 켬' : '🔇 끔'}
        </button>
      </div>
    </header>
  );
}

/** 선택지 창(AugmentPicker)이 떠 있는 동안 보드 가운데에 두는 자리 표시 */
function ChoosingPlaceholder({ game }: { game: GameState }) {
  const p = game.pending;
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
      <span aria-hidden="true" className="text-5xl leading-none">
        {p?.icon ?? '🃏'}
      </span>
      {p?.title && <h2 className="text-2xl text-ink">{p.title}</h2>}
      <p className="font-display text-lg text-muted">고르는 중…</p>
    </div>
  );
}

/** 사건 카드·상점·반 고르기 등 지금 단계의 본문 (넓은 화면: 보드 가운데 / 세로 화면: 아래 시트) */
function StageContent({ game }: { game: GameState }) {
  if (game.pending?.source === 'enroll') return <EnrollRoll game={game} />;
  switch (game.phase) {
    case 'shop':
      return <Shop game={game} />;
    case 'route_select':
      return <RouteSelect game={game} />;
    case 'choice':
      return <ChoosingPlaceholder game={game} />;
    case 'judge':
    case 'result':
    case 'tile_event':
    case 'burnout':
    case 'graduation':
      return <EventCard game={game} />;
    default:
      return null;
  }
}

function stageKey(game: GameState): string {
  const p = game.pending;
  if (p?.source === 'enroll') return 'enroll';
  if (game.phase === 'judge' || game.phase === 'choice') return `ev-${p?.eventId ?? p?.title ?? ''}-${game.turn}`;
  return `${game.phase}-${p?.title ?? ''}-${game.turn}`;
}

function WideLayout({ game, timing }: { game: GameState; timing: Timing }) {
  const rolling = game.phase === 'await_roll' || game.phase === 'moving';
  const key = stageKey(game);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [key]);
  const center = rolling ? (
    <RollPanel game={game} />
  ) : (
    <div
      ref={scroller}
      className="h-full overflow-y-auto overscroll-contain rounded-2xl border-[3px] border-ink bg-paper p-4 shadow-[0_4px_0_0_rgb(0_0_0/0.25)]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: timing.fast ? 0.1 : 0.2 }}
        >
          <StageContent game={game} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
  return (
    <main className="mx-auto flex w-full max-w-[1400px] items-start gap-4 px-4 py-4">
      <div className="flex min-w-0 flex-1 justify-center">
        <div style={{ width: 'min(100%, calc(100dvh - 6rem))' }}>
          <Board game={game} center={center} large stepMs={timing.step} />
        </div>
      </div>
      <aside className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] w-[320px] shrink-0 overflow-y-auto xl:w-[360px]">
        <StatPanel game={game} />
      </aside>
    </main>
  );
}

function BottomSheet({ children, label }: { children: ReactNode; label: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <motion.section
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-[78dvh] w-full max-w-[640px] flex-col rounded-t-[28px] border-x-[3px] border-t-[3px] border-ink bg-paper shadow-[0_-6px_24px_rgb(43_42_51/0.25)]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex w-full flex-col items-center gap-0.5 pb-1 pt-2 text-base text-muted"
      >
        <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-ink/25" />
        <span>{collapsed ? '▲ 펼치기' : '▼ 보드 보기'}</span>
      </button>
      {!collapsed && (
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      )}
    </motion.section>
  );
}

function NarrowLayout({ game, timing }: { game: GameState; timing: Timing }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const rolling = game.phase === 'await_roll' || game.phase === 'moving';
  const center = (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-board-2/60 p-1">
      {rolling ? (
        <MoveDieDisplay game={game} size={64} showStrip={false} />
      ) : (
        <>
          <ChalkStatus game={game} />
          {game.pending?.icon && (
            <span aria-hidden="true" className="text-4xl leading-none">
              {game.pending.icon}
            </span>
          )}
        </>
      )}
    </div>
  );
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pb-[45dvh] pt-3">
      <div className="mx-auto w-full" style={{ maxWidth: 'max(18rem, calc(100dvh - 4.5rem))' }}>
        <Board game={game} center={center} stepMs={timing.step} />
      </div>
      <StatSummary game={game} open={statsOpen} onToggle={() => setStatsOpen((o) => !o)} />
      <AnimatePresence initial={false}>
        {statsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <StatPanel game={game} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {game.phase === 'await_roll' && (
          <motion.div
            key="roll"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[640px] border-t-2 border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
          >
            <RollButton game={game} />
          </motion.div>
        )}
        {!rolling && game.phase !== 'choice' && (
          <BottomSheet key="sheet" label={game.pending?.title ?? '사건'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stageKey(game)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: timing.fast ? 0.1 : 0.2 }}
              >
                <StageContent game={game} />
              </motion.div>
            </AnimatePresence>
          </BottomSheet>
        )}
      </AnimatePresence>
    </main>
  );
}

/** /play 화면 전체. phase에 따라 성향 선택 → 보드 → 엔딩을 그린다. */
export function GameScreen({ game }: { game: GameState }) {
  const timing = useTiming();
  const wide = useMediaQuery('(min-width: 960px) and (min-height: 600px)');
  useMoveDriver(game, timing);

  let body: ReactNode;
  if (game.phase === 'trait_select') body = <TraitSelect />;
  else if (game.phase === 'ending') body = <EndingScene game={game} />;
  else if (wide) body = <WideLayout game={game} timing={timing} />;
  else body = <NarrowLayout game={game} timing={timing} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh">
        <GameHeader />
        {body}
        <AnimatePresence>{game.phase === 'choice' && game.pending && <AugmentPicker key={pickerKey(game)} game={game} />}</AnimatePresence>
        <AnimatePresence>{game.phase === 'judge' && <JudgeOverlay key="judge" game={game} />}</AnimatePresence>
        <Toasts />
      </div>
    </MotionConfig>
  );
}
