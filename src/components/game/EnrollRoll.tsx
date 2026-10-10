'use client';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { STAT_ICONS, STAT_NAMES } from '@/engine/content';
import { STATS } from '@/engine/types';
import type { GameState } from '@/engine/types';
import { Button } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { RollingDie } from './Dice';
import { ChangeList, KeyBadge } from './EventCard';
import { digitKey, isEnter, isSpace, useAct, useHotkeys, useTiming } from './hooks';

const FACES: { face: number; text: string }[] = [
  { face: 1, text: '학업 +10' },
  { face: 2, text: '체력 +10' },
  { face: 3, text: '인맥 +10' },
  { face: 4, text: '운 +10' },
  { face: 5, text: '스트레스 −10' },
  { face: 6, text: '원하는 능력치 +10' },
];

/**
 * 입학 주사위 (성향 선택 직후 1회).
 * 굴리기 → (6이면) 능력치 고르기 → 결과 → 계속.
 * pending.source가 'enroll'인 동안(enroll_roll·result) 같은 컴포넌트가 유지된다.
 */
export function EnrollRoll({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const timing = useTiming();
  const p = game.pending;
  const die = p?.enrollDie;
  const picking = game.phase === 'enroll_roll' && die === 6 && p?.pickFor === 'enroll_stat';
  const done = game.phase !== 'enroll_roll';

  // 이 화면에서 직접 굴린 경우에만 구르는 연출을 보여 준다
  const prevDie = useRef(die);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (prevDie.current === undefined && die !== undefined) {
      setRolling(true);
      const t = setTimeout(() => {
        setRolling(false);
        playSound(die === 6 ? 'critical' : 'success');
      }, timing.dieRoll + 200);
      prevDie.current = die;
      return () => {
        clearTimeout(t);
        setRolling(false);
      };
    }
    prevDie.current = die;
  }, [die, timing.dieRoll]);

  const roll = () => {
    playSound('roll');
    dispatch({ type: 'ROLL_ENROLL' });
  };
  const next = () => dispatch({ type: 'CONTINUE' });

  useHotkeys((e) => {
    if (die === undefined && (isSpace(e) || isEnter(e))) {
      roll();
      return true;
    }
    if (rolling) return;
    if (picking) {
      const n = digitKey(e);
      if (n != null && STATS[n - 1]) {
        dispatch({ type: 'ENROLL_PICK_STAT', stat: STATS[n - 1] });
        return true;
      }
      return;
    }
    if (done && isEnter(e)) {
      next();
      return true;
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-4xl leading-none">
          🎒
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl">{die === undefined || rolling ? '입학 주사위' : (p?.title ?? '입학 주사위')}</h2>
          <p className="mt-1 text-base text-ink/90">{rolling ? '데굴데굴… 무엇이 나올까?' : p?.text}</p>
        </div>
      </div>

      <div className="yd-ground flex flex-wrap items-center gap-4 rounded-[22px] border-[2.5px] border-outline p-4">
        <RollingDie value={die} rolling={rolling} size={84} />
        <ol className="grid flex-1 grid-cols-2 gap-1 text-base text-ink" aria-label="입학 주사위 표">
          {FACES.map((f) => {
            const hit = !rolling && die === f.face;
            return (
              <li
                key={f.face}
                className={`rounded-lg px-2 py-1 ${hit ? 'bg-sun font-display text-ink' : 'bg-white/10'}`}
                aria-current={hit ? 'true' : undefined}
              >
                <span className="font-display">{f.face}</span> · {f.text}
              </li>
            );
          })}
        </ol>
      </div>

      {die === undefined && (
        <Button size="lg" block onClick={roll}>
          🎲 입학 주사위 굴리기 <KeyBadge>Space</KeyBadge>
        </Button>
      )}

      {!rolling && picking && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <p className="font-display text-lg">🎉 6! 올리고 싶은 능력치를 골라요 (+10)</p>
          <div className="grid grid-cols-2 gap-2">
            {STATS.map((s, i) => (
              <Button key={s} variant="secondary" size="md" onClick={() => dispatch({ type: 'ENROLL_PICK_STAT', stat: s })}>
                <KeyBadge>{i + 1}</KeyBadge>
                <span aria-hidden="true">{STAT_ICONS[s]}</span> {STAT_NAMES[s]}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {!rolling && done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          {p?.resultText && (
            <p className="rounded-2xl border-2 border-outline/45 bg-paper-2 px-3 py-2.5 text-lg">{p.resultText}</p>
          )}
          <ChangeList changes={p?.changes ?? []} />
          <Button size="lg" block onClick={next}>
            학교 생활 시작! <KeyBadge>Enter</KeyBadge>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
