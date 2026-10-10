'use client';
import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { allJobs, content } from '@/engine/content';
import type { EndingResult } from '@/engine/types';
import { Button } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { useGame } from '@/store/game';
import { KeyBadge } from './EventCard';
import { digitKey, type Timing, useHotkeys } from './hooks';
import { pct } from './meta';

type Phase = 'spin1' | 'landed1' | 'spin2' | 'landed2';

interface Slot {
  id: string;
  label: string;
  probability: number;
}

/**
 * 진로 룰렛. 불빛이 후보 사이를 돌다 점점 느려지며 엔진이 고른 후보(firstPick)에 멈춘다.
 * 운 60 이상이면 멈춘 뒤 다시 돌릴지 묻고, 다시 돌리면 두 번째 결과(pick)에 멈춘다.
 * 후보가 없거나 firstPick이 'explore'면 "아직 나를 찾는 중" 한 칸짜리 슬롯.
 */
export function Roulette({
  ending,
  instant,
  timing,
  onDone,
}: {
  ending: EndingResult;
  instant: boolean;
  timing: Timing;
  onDone: () => void;
}) {
  const dispatch = useGame((s) => s.dispatch);
  const exploreOnly = ending.candidates.length === 0 || ending.firstPick === 'explore';
  const slots: Slot[] = useMemo(
    () =>
      exploreOnly
        ? [{ id: 'explore', label: content.endings.explore.name, probability: 1 }]
        : ending.candidates.map((c) => ({ id: c.id, label: c.label, probability: c.probability })),
    [exploreOnly, ending.candidates],
  );
  const indexOf = (id: string | undefined) => Math.max(0, slots.findIndex((s) => s.id === id));
  const firstIdx = exploreOnly ? 0 : indexOf(ending.firstPick);
  const finalIdx = exploreOnly ? 0 : indexOf(ending.pick ?? ending.firstPick);

  const [phase, setPhase] = useState<Phase>(instant ? 'landed1' : 'spin1');
  const [active, setActive] = useState(instant ? firstIdx : 0);
  const [flicker, setFlicker] = useState<string | null>(null);

  const doneRef = useRef(onDone);
  useLayoutEffect(() => {
    doneRef.current = onDone;
  });

  const jobNames = useMemo(() => allJobs().map((j) => j.name), []);

  // 돌리기
  useEffect(() => {
    if (phase !== 'spin1' && phase !== 'spin2') return;
    const target = phase === 'spin1' ? firstIdx : finalIdx;
    const n = slots.length;
    const rounds = n === 1 ? 14 : Math.max(2, Math.ceil(14 / n));
    const total = rounds * n + target;
    const weights = Array.from({ length: total + 1 }, (_, i) => 1 + 7 * (i / total) ** 3);
    const sum = weights.reduce((a, b) => a + b, 0);
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setActive(i % n);
      if (n === 1) setFlicker(jobNames[Math.floor(Math.random() * jobNames.length)] ?? null);
      if (i % 2 === 0) playSound('step');
      if (i >= total) {
        setFlicker(null);
        setPhase(phase === 'spin1' ? 'landed1' : 'landed2');
        return;
      }
      t = setTimeout(tick, (timing.roulette * weights[i]) / sum);
    };
    setActive(0);
    t = setTimeout(tick, (timing.roulette * weights[0]) / sum);
    return () => clearTimeout(t);
  }, [phase, firstIdx, finalIdx, slots.length, timing.roulette, jobNames]);

  // 멈춘 뒤
  const awaiting = !!ending.awaitingReroll;
  const rerolled = ending.rerolled;
  useEffect(() => {
    if (phase === 'landed1') {
      if (!instant) playSound(exploreOnly ? 'fail' : 'success');
      if (awaiting) return;
      if (rerolled) {
        const t = setTimeout(() => setPhase('spin2'), timing.rouletteHold);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => doneRef.current(), timing.rouletteHold);
      return () => clearTimeout(t);
    }
    if (phase === 'landed2') {
      playSound('success');
      const t = setTimeout(() => doneRef.current(), timing.rouletteHold);
      return () => clearTimeout(t);
    }
  }, [phase, awaiting, rerolled, instant, exploreOnly, timing.rouletteHold]);

  const decide = (accept: boolean) => {
    // 이미 결정했으면(두 번 누름) 무시
    if (!useGame.getState().game?.ending?.awaitingReroll) return;
    playSound('click');
    dispatch({ type: 'ROULETTE_REROLL', accept });
  };
  const showPrompt = phase === 'landed1' && awaiting;
  useHotkeys(
    (e) => {
      const n = digitKey(e);
      if (n === 1) {
        decide(true);
        return true;
      }
      if (n === 2) {
        decide(false);
        return true;
      }
    },
    showPrompt,
  );

  const landed = phase === 'landed1' || phase === 'landed2';
  const landedSlot = slots[active];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-6">
      <div className="text-center">
        <p className="font-display text-lg text-accent">졸업식 날</p>
        <h1 className="text-3xl sm:text-4xl">
          <span aria-hidden="true">🎰</span> {phase === 'spin2' || phase === 'landed2' ? '두 번째 진로 룰렛!' : '진로 룰렛'}
        </h1>
        {!exploreOnly && <p className="mt-1 text-base text-muted">진로 레벨이 높을수록 당첨 확률이 커요.</p>}
      </div>

      <ul
        className={`grid w-full gap-2 ${slots.length === 1 ? 'grid-cols-1' : slots.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
        aria-live="polite"
      >
        {slots.map((s, i) => {
          const on = active === i;
          const hit = landed && on;
          return (
            <motion.li
              key={s.id}
              animate={on ? { scale: hit ? [1, 1.08, 1.04] : 1.04 } : { scale: 1 }}
              transition={{ duration: hit ? 0.5 : 0.08 }}
              className={`flex flex-col gap-1 rounded-2xl border-[3px] px-4 py-3 ${
                on ? 'border-outline bg-sun shadow-[0_4px_0_0_rgb(107_79_58/0.32)]' : 'border-outline/45 bg-paper'
              }`}
              aria-current={hit ? 'true' : undefined}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-xl leading-tight">
                  {on && <span aria-hidden="true">{hit ? '🎯 ' : '▶ '}</span>}
                  {flicker && on && !landed ? flicker : exploreOnly && !landed ? '???' : s.label}
                </span>
                {!exploreOnly && <span className="font-display text-lg tabular-nums">{pct(s.probability)}</span>}
              </span>
              {!exploreOnly && (
                <span className="h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                  <span className="block h-full rounded-full bg-accent" style={{ width: pct(s.probability) }} />
                </span>
              )}
            </motion.li>
          );
        })}
      </ul>

      {landed && landedSlot && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center font-display text-2xl"
        >
          {exploreOnly ? '룰렛이 멈춘 곳은… 🧭 아직 나를 찾는 중' : `🎯 ${landedSlot.label}!`}
        </motion.p>
      )}

      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-md flex-col gap-2 rounded-3xl border-[3px] border-outline bg-paper p-4 shadow-[0_4px_0_0_rgb(107_79_58/0.32)]"
          role="group"
          aria-label="룰렛 다시 돌리기"
        >
          <p className="text-center font-display text-xl">🍀 운이 좋아요! 룰렛을 한 번 더 돌릴까요?</p>
          <p className="text-center text-base text-muted">다시 돌리면 두 번째 결과로 확정돼요.</p>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Button size="md" onClick={() => decide(true)}>
              <KeyBadge>1</KeyBadge> 🎰 다시 돌리기
            </Button>
            <Button size="md" variant="secondary" onClick={() => decide(false)}>
              <KeyBadge>2</KeyBadge> ✅ 이대로 확정
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
