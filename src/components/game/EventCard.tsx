'use client';
import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { checkByLabel, describeChange } from '@/engine/view';
import type { Change, GameState, JudgeResult, PendingEvent } from '@/engine/types';
import { Button, Chip } from '@/components/ui';
import { isEnter, useAct, useHotkeys, useTiming } from './hooks';
import { OUTCOME_META, TONE_ICON, signed } from './meta';

export function KeyBadge({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border-2 border-ink/70 bg-white px-1 font-display text-base leading-none text-ink shadow-[0_2px_0_0_rgb(43_42_51/0.5)]">
      {children}
    </kbd>
  );
}

function EventHeader({ pending, showText = true }: { pending: PendingEvent; showText?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {pending.icon && (
        <span aria-hidden="true" className="text-4xl leading-none">
          {pending.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl text-ink">{pending.title}</h2>
        {showText && pending.text && <p className="mt-1 text-base leading-relaxed text-ink/90">{pending.text}</p>}
      </div>
    </div>
  );
}

export function JudgeLine({ judge }: { judge: JudgeResult }) {
  const meta = OUTCOME_META[judge.outcome];
  const sum = judge.dice[0] + judge.dice[1];
  return (
    <p className="flex flex-wrap items-center gap-2 text-base">
      <Chip tone={meta.tone}>
        {meta.icon} {meta.word}
      </Chip>
      <span>
        {checkByLabel(judge.resolvedBy)} 판정 · 🎲 {judge.dice[0]}+{judge.dice[1]}
        {judge.total !== sum ? ` ${signed(judge.total - sum)}` : ''} = {judge.total} / 난이도 {judge.diff}
        {judge.converted ? ' · 🍀 행운으로 대실패 면함' : ''}
      </span>
    </p>
  );
}

export function ChangeList({ changes }: { changes: Change[] }) {
  if (changes.length === 0) return <p className="text-base text-muted">변화 없음</p>;
  return (
    <ul className="flex flex-col gap-1">
      {changes.map((c, i) => {
        const d = describeChange(c);
        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 font-display text-base ${
              d.tone === 'good' ? 'bg-mint/15 text-good' : d.tone === 'bad' ? 'bg-danger/12 text-bad' : 'bg-sky/20 text-info'
            }`}
          >
            <span aria-hidden="true">{TONE_ICON[d.tone]}</span>
            <span>{d.text}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}

const CONTINUE_LABEL: Partial<Record<GameState['phase'], string>> = {
  burnout: '정신 차리기',
  graduation: '엔딩 보러 가기 🎓',
};

function ResultBody({ game }: { game: GameState }) {
  const p = game.pending!;
  const dispatch = useAct(game);
  const timing = useTiming();
  const [hold, setHold] = useState(false);
  const autoMs =
    timing.autoClose != null && (game.phase === 'result' || game.phase === 'tile_event') && !hold
      ? timing.autoClose + Math.min(1500, ((p.resultText ?? '').length + (p.changes?.length ?? 0) * 8) * 20)
      : null;

  const next = () => dispatch({ type: 'CONTINUE' });

  useHotkeys((e) => {
    if (isEnter(e)) {
      next();
      return true;
    }
  });

  useEffect(() => {
    if (autoMs == null) return;
    const t = setTimeout(() => dispatch({ type: 'CONTINUE' }), autoMs);
    return () => clearTimeout(t);
  }, [autoMs, p, dispatch]);

  return (
    <div className="flex flex-col gap-3">
      {p.chosen && (
        <p className="text-base text-muted">
          선택: <span className="font-display text-ink">{p.chosen.label}</span>
        </p>
      )}
      {!p.chosen && p.text && <p className="text-base leading-relaxed text-ink/90">{p.text}</p>}
      {p.judge && <JudgeLine judge={p.judge} />}
      {p.resultText && (
        <p className="rounded-2xl border-2 border-line bg-paper-2 px-3 py-2.5 text-lg leading-relaxed">{p.resultText}</p>
      )}
      {(game.phase === 'result' || game.phase === 'tile_event' || (p.changes?.length ?? 0) > 0) && <ChangeList changes={p.changes ?? []} />}
      <div className="flex flex-col gap-1.5">
        <Button size="lg" block onClick={next}>
          {CONTINUE_LABEL[game.phase] ?? '계속하기'} <KeyBadge>Enter</KeyBadge>
        </Button>
        {autoMs != null && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.div
                key={String(p.title) + String(p.resultText)}
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: autoMs / 1000, ease: 'linear' }}
              />
            </div>
            <button type="button" className="text-base text-muted underline" onClick={() => setHold(true)}>
              멈추기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 사건 카드: 상황 문장 + 판정 대기 / 결과. 선택지는 AugmentPicker(증강 선택 창)가 맡는다. */
export function EventCard({ game }: { game: GameState }) {
  const p = game.pending;
  if (!p) return null;
  const phase = game.phase;
  const isResult = phase === 'result' || phase === 'tile_event' || phase === 'burnout' || phase === 'graduation';
  return (
    <div className="flex flex-col gap-3">
      <EventHeader pending={p} showText={phase === 'choice' || phase === 'judge'} />
      {phase === 'judge' && p.chosen && (
        <div className="rounded-2xl border-2 border-ink/60 bg-white p-3">
          <p className="text-base text-muted">고른 선택지</p>
          <p className="font-display text-xl">{p.chosen.label}</p>
          <p className="mt-1 text-base text-muted">🎲 판정 중…</p>
        </div>
      )}
      {isResult && <ResultBody game={game} />}
    </div>
  );
}
