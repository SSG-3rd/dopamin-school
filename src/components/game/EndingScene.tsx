'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { content, trackName } from '@/engine/content';
import { GRADE_MID, GRADE_TOP, GRADUATION_USES_BONUSES } from '@/engine/rules';
import type { EndingResult, GameState, Grade } from '@/engine/types';
import { Button } from '@/components/ui';
import { ENDING_KIND_LABELS, GRADE_ICONS, gradeName } from '@/lib/share';
import { playSound } from '@/lib/sound';
import { useGame } from '@/store/game';
import { RollingDie } from './Dice';
import { EndingSummary } from './EndingSummary';
import { KeyBadge } from './EventCard';
import { type Timing, isEnter, isSpace, useHotkeys, useTiming } from './hooks';
import { signed } from './meta';
import { Roulette } from './Roulette';

const KIND_EMOJI: Record<EndingResult['kind'], string> = {
  normal: '🎓',
  combo: '🔗',
  miracle: '✨',
  rescue: '🤝',
  explore: '🧭',
};

// ───────── 실패 장면: 화면이 어두워지고 문장이 한 줄씩 ─────────
function FailScene({ timing, onDone }: { timing: Timing; onDone: () => void }) {
  const lines = content.endings.failScene;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n < lines.length) {
      const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 500 : timing.sceneLine);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, timing.sceneLine + 500);
    return () => clearTimeout(t);
  }, [n, lines.length, timing.sceneLine, onDone]);

  useHotkeys((e) => {
    if (isEnter(e) || isSpace(e)) {
      onDone();
      return true;
    }
  });

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-[#2b2640] px-6 text-center text-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: timing.fast ? 0.2 : 0.8 }}
    >
      <div className="flex max-w-lg flex-col gap-4" aria-live="polite">
        {lines.slice(0, n).map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: timing.fast ? 0.2 : 0.7 }}
            className="font-display text-xl leading-relaxed text-paper/90 sm:text-2xl"
          >
            {l}
          </motion.p>
        ))}
      </div>
      <button type="button" onClick={onDone} className="mt-4 text-base text-paper/60 underline">
        계속 <span aria-hidden="true">⏎</span>
      </button>
    </motion.div>
  );
}

// ───────── 졸업식 날 밤, 휴대폰이 울렸다 ─────────
function PhoneCall({ ending, timing, onDone }: { ending: EndingResult; timing: Timing; onDone: () => void }) {
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    if (answered) {
      playSound('success');
      return;
    }
    const t = setTimeout(() => setAnswered(true), timing.fast ? 1000 : 2800);
    return () => clearTimeout(t);
  }, [answered, timing.fast]);

  useHotkeys((e) => {
    if (isEnter(e) || isSpace(e)) {
      if (!answered) setAnswered(true);
      else onDone();
      return true;
    }
  });

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-[#2b2640] px-6 text-center text-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="font-display text-xl text-paper/80 sm:text-2xl">졸업식 날 밤, 휴대폰이 울렸다</p>
      <motion.div
        aria-hidden="true"
        className="text-7xl"
        animate={answered ? { rotate: 0, scale: 1 } : { rotate: [0, -14, 14, -14, 14, 0], scale: [1, 1.05, 1] }}
        transition={answered ? { duration: 0.2 } : { duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
      >
        📱
      </motion.div>
      {!answered ? (
        <Button size="lg" onClick={() => setAnswered(true)}>
          📞 전화 받기 <KeyBadge>Enter</KeyBadge>
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center gap-4"
        >
          {ending.rescueFriend && (
            <p className="font-display text-2xl">
              <span aria-hidden="true">📞</span> {ending.rescueFriend}
            </p>
          )}
          {ending.flavor && (
            <p className="rounded-3xl rounded-tl-md bg-paper px-5 py-4 text-left text-lg leading-relaxed text-ink">
              {ending.flavor}
            </p>
          )}
          <Button size="lg" onClick={onDone}>
            계속 <KeyBadge>Enter</KeyBadge>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ───────── 졸업 판정 (등급) ─────────
const GRADE_ROWS: { g: Grade; range: string }[] = [
  { g: 'low', range: `${GRADE_MID - 1} 이하` },
  { g: 'mid', range: `${GRADE_MID}~${GRADE_TOP - 1}` },
  { g: 'top', range: `${GRADE_TOP} 이상` },
];

function GradeRoll({ ending, timing, onDone }: { ending: EndingResult; timing: Timing; onDone: () => void }) {
  const r = ending.graduationRoll;
  const bonuses = r?.bonuses ?? [];
  const [stage, setStage] = useState(0); // 0 굴림, 1 멈춤, 2 보정, 3 합계·등급
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!r) {
      onDone();
      return;
    }
    playSound('roll');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const base = timing.judgeDie + 200;
    timers.push(setTimeout(() => setStage(1), base));
    bonuses.forEach((_, i) =>
      timers.push(
        setTimeout(() => {
          setStage(2);
          setShown(i + 1);
        }, base + timing.judgeReveal * 1.5 * (i + 1)),
      ),
    );
    timers.push(
      setTimeout(() => {
        setStage(3);
        playSound(ending.grade === 'top' ? 'critical' : ending.grade === 'low' ? 'fail' : 'success');
      }, base + timing.judgeReveal * 1.5 * (bonuses.length + 2)),
    );
    return () => timers.forEach(clearTimeout);
    // 장면이 열릴 때 한 번만 연출
  }, []);

  const finish = () => {
    if (stage < 3) {
      setShown(bonuses.length);
      setStage(3);
    } else onDone();
  };
  useHotkeys((e) => {
    if (isEnter(e) || isSpace(e)) {
      finish();
      return true;
    }
  });

  if (!r) return null;
  const sum = r.dice[0] + r.dice[1];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <div className="text-center">
        <p className="font-display text-lg text-accent">{ending.track ? trackName(ending.track) : ''}</p>
        <h1 className="text-3xl">
          <span aria-hidden="true">🎓</span> 졸업 판정
        </h1>
        <p className="mt-1 text-base text-muted">{GRADUATION_USES_BONUSES ? '주사위 2개 + 보정으로 직업 등급이 정해져요.' : '주사위 2개만으로 직업 등급이 정해져요. 완전히 운!'}</p>
      </div>
      <div className="flex items-center justify-center gap-4 rounded-[22px] border-[2.5px] border-outline bg-[#bfe3ad] py-5">
        <RollingDie value={r.dice[0]} rolling={stage === 0} size={80} />
        <RollingDie value={r.dice[1]} rolling={stage === 0} size={80} />
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-outline/45 bg-paper p-3" aria-live="polite">
        {stage >= 1 && (
          <p className="flex items-center justify-between font-display text-lg">
            <span>주사위</span>
            <span className="tabular-nums">
              {r.dice[0]} + {r.dice[1]} = {sum}
            </span>
          </p>
        )}
        {bonuses.slice(0, stage >= 3 ? bonuses.length : shown).map((b, i) => (
          <motion.p
            key={`${b.label}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between text-base"
          >
            <span>{b.label}</span>
            <span
              className={`font-display tabular-nums ${b.value > 0 ? 'text-good' : b.value < 0 ? 'text-bad' : 'text-muted'}`}
            >
              {signed(b.value)}
            </span>
          </motion.p>
        ))}
        {stage >= 3 && (
          <p className="mt-1 flex items-center justify-between border-t-2 border-dashed border-outline/45 pt-2 font-display text-2xl">
            <span>합계</span>
            <span className="tabular-nums">{r.total}</span>
          </p>
        )}
      </div>
      <ol className="grid grid-cols-3 gap-2" aria-label="등급 기준">
        {GRADE_ROWS.map((row) => {
          const hit = stage >= 3 && ending.grade === row.g;
          return (
            <motion.li
              key={row.g}
              animate={hit ? { scale: [1, 1.12, 1.05] } : { scale: 1 }}
              className={`flex flex-col items-center rounded-2xl border-[3px] px-2 py-2 text-center ${
                hit ? 'border-outline bg-sun shadow-[0_4px_0_0_rgb(107_79_58/0.32)]' : 'border-outline/45 bg-paper'
              }`}
              aria-current={hit ? 'true' : undefined}
            >
              <span aria-hidden="true" className="text-2xl">
                {GRADE_ICONS[row.g]}
              </span>
              <span className="font-display text-lg">{gradeName(row.g)}</span>
              <span className="text-base text-muted">{row.range}</span>
            </motion.li>
          );
        })}
      </ol>
      <Button size="lg" block onClick={finish}>
        {stage < 3 ? '바로 보기' : '직업 공개!'} <KeyBadge>Enter</KeyBadge>
      </Button>
    </div>
  );
}

// ───────── 직업 공개 ─────────
const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🌸', '🎈'];

function RevealCard({ ending, animate }: { ending: EndingResult; animate: boolean }) {
  useEffect(() => {
    if (animate) playSound('reveal');
  }, [animate]);
  const kindLabel =
    ending.kind === 'normal' && ending.track
      ? `${trackName(ending.track)} 분야`
      : ending.kind === 'combo' && ending.track
        ? `${trackName(ending.track)} · ${ENDING_KIND_LABELS.combo}`
        : ENDING_KIND_LABELS[ending.kind];
  return (
    <div className="relative overflow-hidden rounded-[28px] border-4 border-outline bg-paper px-5 py-7 text-center shadow-[0_6px_0_0_rgb(107_79_58/0.32)]">
      {animate && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl"
              style={{ left: `${(i * 37) % 100}%`, top: '-10%' }}
              initial={{ y: 0, opacity: 0, rotate: 0 }}
              animate={{ y: 420, opacity: [0, 1, 1, 0], rotate: (i % 2 ? 1 : -1) * 220 }}
              transition={{ duration: 2.2 + (i % 4) * 0.3, delay: 0.3 + (i % 5) * 0.12, ease: 'easeIn' }}
            >
              {CONFETTI[i % CONFETTI.length]}
            </motion.span>
          ))}
        </div>
      )}
      <motion.div
        initial={animate ? { scale: 0.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="relative flex flex-col items-center gap-2"
      >
        <span aria-hidden="true" className="text-6xl leading-none">
          {KIND_EMOJI[ending.kind]}
        </span>
        <p className="text-base text-muted">졸업 후 나는…</p>
        <h1 className="text-4xl leading-tight sm:text-5xl">{ending.jobName}</h1>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border-2 border-outline bg-grape/15 px-3 py-0.5 font-display text-lg">{kindLabel}</span>
          {ending.grade && (
            <span className="rounded-full border-2 border-outline bg-sun px-3 py-0.5 font-display text-lg">
              {GRADE_ICONS[ending.grade]} {gradeName(ending.grade)} 등급
            </span>
          )}
        </div>
        {ending.flavor && (
          <p className="mt-2 max-w-lg rounded-2xl bg-paper-2 px-4 py-3 text-lg leading-relaxed">{ending.flavor}</p>
        )}
      </motion.div>
    </div>
  );
}

/**
 * 엔딩 연출. 엔진이 만든 ending.sequence를 순서대로 재생하고, 끝나면 정리 화면을 보여 준다.
 * 저장본에서 불러온 끝난 게임은 정리 화면부터 보여 준다.
 */
export function EndingScene({ game }: { game: GameState }) {
  const ending = game.ending;
  const fresh = useGame((s) => s.freshEnding);
  const timing = useTiming();
  const [step, setStep] = useState<number>(() =>
    ending && !fresh && !ending.awaitingReroll ? Number.POSITIVE_INFINITY : 0,
  );
  const [instant, setInstant] = useState(false);
  // 지금 단계에서만 다음으로 (사라지는 중인 장면이 한 번 더 부르면 무시)
  const next = useMemo(() => () => setStep((s) => (s === step ? step + 1 : s)), [step]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  // 건너뛰기 중 다시 돌리기 결정을 마쳤으면 곧장 정리 화면으로
  const awaiting = !!ending?.awaitingReroll;
  useEffect(() => {
    if (instant && !awaiting) setStep(Number.POSITIVE_INFINITY);
  }, [instant, awaiting]);

  if (!ending) return null;
  const seq = ending.sequence;
  const cur = step < seq.length ? seq[step] : null;
  const isFinal = cur === null || cur === 'reveal';

  const skip = () => {
    setInstant(true);
    if (ending.awaitingReroll) {
      const r = seq.indexOf('roulette');
      setStep(r >= 0 ? r : 0);
      return;
    }
    setStep(Number.POSITIVE_INFINITY);
  };
  const replay = () => {
    setInstant(false);
    setStep(0);
  };

  return (
    <main className="relative mx-auto w-full max-w-3xl pb-16">
      {!isFinal && (
        <button
          type="button"
          onClick={skip}
          className="fixed bottom-4 right-4 z-50 rounded-full border-2 border-outline bg-paper px-4 py-2 font-display text-base shadow-[0_3px_0_0_rgb(107_79_58/0.32)]"
        >
          건너뛰기 ⏭
        </button>
      )}
      <AnimatePresence mode="wait">
        {cur === 'roulette' && (
          <motion.div key={instant ? 'roulette-instant' : 'roulette'} exit={{ opacity: 0 }}>
            <Roulette ending={ending} instant={instant} timing={timing} onDone={next} />
          </motion.div>
        )}
        {cur === 'fail_scene' && <FailScene key="fail" timing={timing} onDone={next} />}
        {cur === 'phone_call' && <PhoneCall key="phone" ending={ending} timing={timing} onDone={next} />}
        {cur === 'grade_roll' && (
          <motion.div key="grade" exit={{ opacity: 0 }}>
            <GradeRoll ending={ending} timing={timing} onDone={next} />
          </motion.div>
        )}
        {isFinal && (
          <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 px-4 py-6">
            <RevealCard ending={ending} animate={cur === 'reveal' && !instant} />
            <motion.div
              initial={cur === 'reveal' && !instant ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cur === 'reveal' && !instant ? (timing.fast ? 0.4 : 1.6) : 0 }}
            >
              <EndingSummary game={game} onReplay={replay} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
