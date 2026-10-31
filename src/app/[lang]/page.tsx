'use client';
// 타이틀 화면 (§8): 새 게임 · 이어하기 · 엔딩 도감 · 통계 · 설정 · 게임 방법
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { DiceBuddy } from '@/components/DiceBuddy';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Card, buttonClass } from '@/components/ui';
import { useI18n, useLocalePath } from '@/i18n/client';
import type { MessageKey } from '@/i18n/keys';
import { APP_NAME_EN } from '@/lib/brand';
import { KEYS, readJSON } from '@/lib/storage';
import { useSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';

type SaveInfo = { resumable: boolean; year?: number; turn?: number };

/** 'yd:save'는 GameState 그대로이거나 zustand persist 래퍼 { state: { game }, version }. */
function readSaveInfo(): SaveInfo {
  const raw = readJSON<unknown>(KEYS.save, null);
  if (!raw || typeof raw !== 'object') return { resumable: false };
  const obj = raw as Record<string, unknown>;
  let game: Record<string, unknown> | null = null;
  const wrapped = (obj.state as Record<string, unknown> | undefined)?.game;
  if (wrapped && typeof wrapped === 'object') game = wrapped as Record<string, unknown>;
  else if ('phase' in obj) game = obj;
  if (!game || game.version !== 1 || typeof game.phase !== 'string') return { resumable: false };
  if (game.phase === 'ending') return { resumable: false };
  return {
    resumable: true,
    year: typeof game.year === 'number' ? game.year : undefined,
    turn: typeof game.turn === 'number' ? game.turn : undefined,
  };
}

const HOW_TO = [
  { id: 'trait', icon: '🧑‍🎓' },
  { id: 'enroll', icon: '🎲' },
  { id: 'board', icon: '🏫' },
  { id: 'ending', icon: '🎓' },
] as const satisfies readonly { id: string; icon: string }[];

const TOGGLES = [
  { key: 'fast', icon: '⏩' },
  { key: 'music', icon: '🎵' },
  { key: 'sound', icon: '🔊' },
  { key: 'booth', icon: '🎪' },
] as const satisfies readonly { key: keyof Settings; icon: string }[];

function Toggle({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div id={`${id}-l`} className="font-display text-lg">
          <span aria-hidden="true">{icon}</span> {label}
        </div>
        <p id={`${id}-d`} className="text-base leading-snug text-muted">
          {desc}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border-2 transition-colors ${
          checked ? 'border-outline bg-bush-deep' : 'border-outline bg-paper-2'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_0_0_rgb(0_0_0/0.15)] transition-[left] ${
            checked ? 'left-[calc(100%-1.75rem)]' : 'left-1'
          }`}
        />
        <span className="sr-only">{t(checked ? 'ui.common.on' : 'ui.common.off')}</span>
      </button>
    </div>
  );
}

export default function TitlePage() {
  const [save, setSave] = useState<SaveInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();
  const { t } = useI18n();
  const href = useLocalePath();

  useEffect(() => {
    setSave(readSaveInfo());
    useSettings.getState().load();
  }, []);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const resumable = save?.resumable === true;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-6 pb-12 sm:pt-10">
      {/* 하늘 위 타이틀 */}
      <header className="relative flex flex-col items-center pt-2 text-center">
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:justify-between">
          <p className="rounded-full border-2 border-outline bg-paper px-3 py-0.5 font-display text-base text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.22)]">
            {t('ui.title.badge')}
          </p>
          <LanguageSwitcher />
        </div>
        <div className="mt-3 flex items-center gap-2 sm:gap-4">
          <DiceBuddy size={72} className="yd-buddy-hop shrink-0 -rotate-6" />
          <h1 className="yd-logo font-display text-[3.4rem] leading-[1.05] sm:text-7xl">
            <span className="text-accent">{t('brand.namePart1')}</span>
            <br className="sm:hidden" />
            <span className="text-sun sm:ml-3">{t('brand.namePart2')}</span>
          </h1>
          <DiceBuddy size={56} mood="wink" color="#ffe08a" className="yd-buddy-hop yd-buddy-hop--late hidden shrink-0 rotate-6 sm:block" />
        </div>
        {t('brand.name').toUpperCase() !== APP_NAME_EN && (
          <p className="mt-2 font-display text-lg tracking-[0.35em] text-outline/80">{APP_NAME_EN}</p>
        )}
        <p className="yd-panel mt-4 max-w-sm px-5 py-3 text-base leading-relaxed text-ink">
          {t('brand.tagline')}
          <br />
          {t('brand.question')}
        </p>
      </header>

      {/* 메뉴 */}
      <nav aria-label={t('ui.title.menu')} className="flex flex-col gap-3">
        {resumable && (
          <Link href={href('/play')} className={buttonClass('primary', 'lg', true)}>
            <span aria-hidden="true">▶️</span> {t('ui.title.resume')}
            {save?.year ? (
              <span className="font-sans text-base text-ink/75">
                {save.turn
                  ? t('ui.title.resumeYearTurn', { year: save.year, turn: save.turn })
                  : t('ui.title.resumeYear', { year: save.year })}
              </span>
            ) : null}
          </Link>
        )}

        {resumable ? (
          <button
            type="button"
            className={buttonClass('secondary', 'lg', true)}
            aria-expanded={confirming}
            aria-controls="new-game-confirm"
            onClick={() => setConfirming(true)}
          >
            <span aria-hidden="true">✏️</span> {t('ui.title.newGame')}
          </button>
        ) : (
          <Link href={href('/play?new=1')} className={buttonClass('primary', 'lg', true)}>
            <span aria-hidden="true">✏️</span> {t('ui.title.newGame')}
          </Link>
        )}

        {confirming && resumable && (
          <Card
            id="new-game-confirm"
            ref={confirmRef}
            tabIndex={-1}
            role="alertdialog"
            aria-labelledby="new-game-confirm-title"
            aria-describedby="new-game-confirm-desc"
            className="border-accent/60 bg-paper-2 p-4"
          >
            <h2 id="new-game-confirm-title" className="text-xl">
              <span aria-hidden="true">⚠️</span> {t('ui.title.confirmTitle')}
            </h2>
            <p id="new-game-confirm-desc" className="mt-1 text-muted">
              {t('ui.title.confirmText')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className={buttonClass('secondary', 'md', true)} onClick={() => setConfirming(false)}>
                {t('ui.common.cancel')}
              </button>
              <Link href={href('/play?new=1')} className={buttonClass('danger', 'md', true)}>
                {t('ui.title.restart')}
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href={href('/collection')} className={buttonClass('secondary', 'md', true)}>
            <span aria-hidden="true">📖</span> {t('ui.title.collection')}
          </Link>
          <Link href={href('/stats')} className={buttonClass('secondary', 'md', true)}>
            <span aria-hidden="true">📊</span> {t('ui.title.stats')}
          </Link>
        </div>
      </nav>

      {/* 설정 */}
      <Card className="px-4 py-2 sm:px-5">
        <h2 className="pt-2 text-xl">
          <span aria-hidden="true">⚙️</span> {t('ui.title.settings')}
        </h2>
        <div className="divide-y-2 divide-dashed divide-line">
          {TOGGLES.map((tg) => (
            <Toggle
              key={tg.key}
              icon={tg.icon}
              label={t(`ui.settings.${tg.key}.label` satisfies MessageKey)}
              desc={t(`ui.settings.${tg.key}.desc` satisfies MessageKey)}
              checked={settings[tg.key]}
              onChange={(v) => settings.set({ [tg.key]: v })}
            />
          ))}
        </div>
      </Card>

      {/* 게임 방법 */}
      <section aria-labelledby="howto-title" className="flex flex-col gap-3">
        <h2 id="howto-title" className="yd-panel self-start px-4 py-1 text-2xl">
          <span aria-hidden="true">📝</span> {t('ui.title.howto')}
        </h2>
        <ol className="flex flex-col gap-3">
          {HOW_TO.map((s, i) => (
            <li key={s.id}>
              <Card className="flex gap-3 p-4">
                <div
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-outline bg-sky/40 text-2xl"
                >
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg">
                    <span className="text-accent-deep">{i + 1}.</span> {t(`ui.howto.${s.id}.title` satisfies MessageKey)}
                  </h3>
                  <p className="text-base leading-relaxed text-muted">{t(`ui.howto.${s.id}.text` satisfies MessageKey)}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        <p className="yd-panel px-4 py-2 text-base text-muted">
          {t('ui.title.keyboard')} <kbd className="rounded border border-line bg-white px-1.5">Space</kbd>{' '}
          {t('ui.title.keyDice')} · <kbd className="rounded border border-line bg-white px-1.5">1</kbd>
          <kbd className="ml-0.5 rounded border border-line bg-white px-1.5">2</kbd>
          <kbd className="ml-0.5 rounded border border-line bg-white px-1.5">3</kbd> {t('ui.title.keyChoose')} ·{' '}
          <kbd className="rounded border border-line bg-white px-1.5">Enter</kbd> {t('ui.title.keyContinue')}
        </p>
      </section>

      <footer className="yd-panel px-4 py-2 text-center text-base text-muted">
        {t('ui.title.footer')}
      </footer>
    </main>
  );
}
