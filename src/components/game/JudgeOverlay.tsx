'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { checkByLabel, getAbilityView } from '@/engine/view';
import type { GameState } from '@/engine/types';
import { Button } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { RollingDie } from './Dice';
import { KeyBadge } from './EventCard';
import { isEnter, isSpace, useAct, useHotkeys, useTiming } from './hooks';
import { OUTCOME_META, signed } from './meta';

/**
 * 판정 연출: 주사위 2개가 구르다 엔진이 정한 눈에 멈추고 → 보정 내역 → 합계 vs 난이도 → 결과.
 * stage 0 굴림, 1 주사위 멈춤, 2 보정 공개 중, 3 결과
 */
export function JudgeOverlay({ game }: { game: GameState }) {
  const p = game.pending;
  const j = p?.judge;
  const dispatch = useAct(game);
  const timing = useTiming();
  const [stage, setStage] = useState(0);
  const [shownBonuses, setShownBonuses] = useState(0);
  const bonusCount = j?.bonuses.length ?? 0;

  useEffect(() => {
    playSound('roll');
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), timing.judgeDie));
    for (let i = 1; i <= bonusCount; i++) {
      timers.push(
        setTimeout(() => {
          setStage(2);
          setShownBonuses(i);
        }, timing.judgeDie + timing.judgeReveal * i),
      );
    }
    timers.push(setTimeout(() => setStage(3), timing.judgeDie + timing.judgeReveal * (bonusCount + 2)));
    return () => timers.forEach(clearTimeout);
    // 판정 화면이 열릴 때 한 번만 연출한다
  }, []);

  const outcome = j?.outcome;
  useEffect(() => {
    if (stage !== 3 || !outcome) return;
    playSound(outcome === 'critical' ? 'critical' : outcome === 'success' ? 'success' : outcome === 'fumble' ? 'fumble' : 'fail');
  }, [stage, outcome]);

  const ability = getAbilityView(game);
  const luckyAvailable = !!ability?.available && game.traitId === 'lucky' && stage === 3;

  const finish = () => {
    if (stage < 3) {
      setShownBonuses(bonusCount);
      setStage(3);
      return;
    }
    dispatch({ type: 'CONTINUE' });
  };

  useHotkeys((e) => {
    if (isEnter(e) || isSpace(e)) {
      finish();
      return true;
    }
    if (luckyAvailable && (e.key === 'l' || e.key === 'L')) {
      dispatch({ type: 'USE_ABILITY' });
      return true;
    }
  });

  if (!p || !j) return null;
  const meta = OUTCOME_META[j.outcome];
  const sum = j.dice[0] + j.dice[1];
  const natural = sum === 12 || sum === 2;
  const byLabel = checkByLabel(j.resolvedBy, game);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-3 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${byLabel} 판정`}
    >
      <motion.div
        initial={{ y: 40, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border-4 border-ink bg-paper p-5 shadow-[0_6px_0_0_var(--color-ink)]"
      >
        <p className="text-base text-muted">{p.title}</p>
        <h2 className="text-2xl">
          <span aria-hidden="true">🎲</span> {byLabel} 판정
        </h2>
        {p.chosen && <p className="mt-0.5 font-display text-lg text-ink/80">“{p.chosen.label}”</p>}

        <div className="my-4 flex items-center justify-center gap-4 rounded-2xl bg-board py-5">
          <RollingDie value={j.dice[0]} rolling={stage === 0} size={76} />
          <RollingDie value={j.dice[1]} rolling={stage === 0} size={76} />
        </div>

        <div aria-live="polite" className="flex flex-col gap-1.5">
          {stage >= 1 && (
            <p className="flex items-center justify-between font-display text-lg">
              <span>주사위</span>
              <span className="tabular-nums">
                {j.dice[0]} + {j.dice[1]} = {sum}
              </span>
            </p>
          )}
          <AnimatePresence initial={false}>
            {j.bonuses.slice(0, stage >= 3 ? bonusCount : shownBonuses).map((b, i) => (
              <motion.p
                key={`${b.label}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between text-base"
              >
                <span>{b.label}</span>
                <span className={`font-display tabular-nums ${b.value > 0 ? 'text-[#146b52]' : b.value < 0 ? 'text-[#a8282c]' : 'text-muted'}`}>
                  {signed(b.value)}
                </span>
              </motion.p>
            ))}
          </AnimatePresence>
          {stage >= 3 && (
            <p className="mt-1 flex items-center justify-between border-t-2 border-dashed border-line pt-2 font-display text-xl">
              <span>합계</span>
              <span className="tabular-nums">
                {j.total} {natural ? '' : j.total >= j.diff ? '≥' : '<'} 난이도 {j.diff}
              </span>
            </p>
          )}
          {stage >= 3 && natural && (
            <p className="text-base text-muted">
              눈 합 {sum}은(는) 보정과 상관없이 {sum === 12 ? '무조건 대성공' : '무조건 대실패'}!
            </p>
          )}
        </div>

        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              key={j.outcome}
              initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink py-3 font-display text-3xl"
              style={{ backgroundColor: meta.color, color: j.outcome === 'fumble' ? '#fff' : 'var(--color-ink)' }}
            >
              <span aria-hidden="true">{meta.icon}</span> {meta.word}
            </motion.div>
          )}
        </AnimatePresence>
        {stage >= 3 && j.converted && (
          <p className="mt-2 text-center font-display text-base">🍀 행운 발동! 대실패를 일반 실패로 바꿨어요.</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {luckyAvailable && ability && (
            <Button variant="secondary" size="md" block onClick={() => dispatch({ type: 'USE_ABILITY' })}>
              🍀 행운: 대실패 → 실패 (남은 {ability.usesLeft}회) <KeyBadge>L</KeyBadge>
            </Button>
          )}
          <Button size="lg" block onClick={finish}>
            {stage < 3 ? '바로 보기' : '결과 보기'} <KeyBadge>Enter</KeyBadge>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
