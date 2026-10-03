'use client';
import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { checkByLabel, describeChange, getAbilityView, getOptionViews } from '@/engine/view';
import type { Change, GameState, JudgeResult, PendingEvent } from '@/engine/types';
import { Button, Chip } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { digitKey, isEnter, useAct, useHotkeys, useTiming } from './hooks';
import { KIND_META, OUTCOME_META, TONE_ICON, pct, previewTone, signed } from './meta';

type OptionView = ReturnType<typeof getOptionViews>[number];

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

function PreviewChips({ items, prefix }: { items: string[]; prefix?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {prefix && <span className="text-base text-muted">{prefix}</span>}
      {items.map((t, i) => (
        <Chip key={`${t}-${i}`} tone={previewTone(t)}>
          {t}
        </Chip>
      ))}
    </div>
  );
}

function OptionButton({ view, onChoose }: { view: OptionView; onChoose: (id: string) => void }) {
  const o = view.option;
  const kind = KIND_META[o.kind];
  return (
    <button
      type="button"
      onClick={() => onChoose(o.id)}
      disabled={view.disabled}
      aria-disabled={view.disabled}
      className={`group flex w-full flex-col gap-1.5 rounded-2xl border-2 bg-white p-3 text-left transition-[transform,box-shadow,background-color] ${
        view.disabled
          ? 'cursor-not-allowed border-line bg-paper-2 opacity-70'
          : 'border-ink/70 shadow-[0_3px_0_0_rgb(43_42_51/0.6)] hover:bg-paper active:translate-y-[2px] active:shadow-[0_1px_0_0_rgb(43_42_51/0.6)]'
      }`}
      style={{ borderLeftWidth: 8, borderLeftColor: view.disabled ? undefined : kind.color }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <KeyBadge>{view.key}</KeyBadge>
        <span className="font-display text-base text-muted">
          <span aria-hidden="true">{kind.icon}</span> {kind.word}
        </span>
        {view.unlocked && <Chip tone="warn">🔓 해금</Chip>}
      </div>
      <span className="font-display text-xl leading-snug text-ink">{o.label}</span>
      {o.desc && view.preview[0] !== o.desc && <span className="text-base text-muted">{o.desc}</span>}
      <PreviewChips items={view.preview} prefix={view.judge && view.failPreview ? '성공 시' : undefined} />
      {view.judge && (
        <p className="text-base">
          <span aria-hidden="true">🎲</span> <strong className="font-display font-normal">{view.judge.byLabel} 판정</strong> · 성공{' '}
          <strong className="font-display text-lg font-normal">{pct(view.judge.probability)}</strong>
          <span className="text-muted">
            {' '}
            (보정 {signed(view.judge.bonus)} / 난이도 {view.judge.diff})
          </span>
        </p>
      )}
      {view.failPreview && view.failPreview.length > 0 && <PreviewChips items={view.failPreview} prefix="실패 시" />}
      {view.disabled && view.reason && (
        <p className="font-display text-base text-danger">
          <span aria-hidden="true">🔒</span> {view.reason}
        </p>
      )}
    </button>
  );
}

function ChoiceList({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const views = getOptionViews(game);
  const ability = getAbilityView(game);
  const canToggle = !!ability && ability.available && game.traitId === 'insider';

  const choose = (id: string) => {
    playSound('click');
    dispatch({ type: 'CHOOSE', optionId: id });
  };

  useHotkeys((e) => {
    const n = digitKey(e);
    if (n != null) {
      const v = views.find((x) => x.key === n);
      if (v && !v.disabled) {
        choose(v.option.id);
        return true;
      }
      return false;
    }
    if (canToggle && (e.key === 'a' || e.key === 'A' || e.key === 'ㅁ')) {
      dispatch({ type: 'USE_ABILITY' });
      return true;
    }
  });

  return (
    <div className="flex flex-col gap-2.5">
      {canToggle && ability && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-grape/40 bg-grape/10 p-2.5">
          <Button
            variant={ability.armed ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={!!ability.armed}
            onClick={() => dispatch({ type: 'USE_ABILITY' })}
          >
            🎉 {ability.label} {ability.armed ? '발동 중 (취소)' : '쓰기'}
          </Button>
          <span className="text-base">
            {ability.armed ? (
              <strong className="font-display font-normal">판정 기준: 인맥</strong>
            ) : (
              ability.desc
            )}{' '}
            <span className="text-muted">· 남은 {ability.usesLeft}회 · A 키</span>
          </span>
        </div>
      )}
      {views.map((v) => (
        <OptionButton key={v.option.id} view={v} onChoose={choose} />
      ))}
      <p className="text-base text-muted">숫자 키 1~{Math.max(1, views.length)}로도 고를 수 있어요.</p>
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
              d.tone === 'good' ? 'bg-mint/12 text-[#146b52]' : d.tone === 'bad' ? 'bg-danger/10 text-[#a8282c]' : 'bg-sky/12 text-[#1d5a8a]'
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
  burnout: '푹 쉬기',
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
      <ChangeList changes={p.changes ?? []} />
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

/** 사건 카드: 상황 문장 + 선택지 / 판정 대기 / 결과 */
export function EventCard({ game }: { game: GameState }) {
  const p = game.pending;
  if (!p) return null;
  const phase = game.phase;
  const isResult = phase === 'result' || phase === 'tile_event' || phase === 'burnout' || phase === 'graduation';
  return (
    <div className="flex flex-col gap-3">
      <EventHeader pending={p} showText={phase === 'choice' || phase === 'judge'} />
      {phase === 'choice' && <ChoiceList game={game} />}
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
