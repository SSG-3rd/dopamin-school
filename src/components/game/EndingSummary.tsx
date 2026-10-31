'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { content, findTrait, getClub, getRoute } from '@/engine/content';
import { lit, money, type Text } from '@/engine/text';
import type { Candidate, EndingResult, GameState } from '@/engine/types';
import { Bar, Button, Card, buttonClass } from '@/components/ui';
import { useI18n, useLocalePath } from '@/i18n/client';
import { useSettings } from '@/lib/settings';
import { sharePath } from '@/lib/share';
import { useGame } from '@/store/game';
import { pct } from './meta';
import { CareerRows, StatRows, StressGauge } from './StatPanel';

/** 후보(분야·조합)에 속한 직업 이름들 (문장 키) */
function candidateJobs(c: Candidate, ending: EndingResult): Text[] {
  const E = content.endings;
  let table: { top: { name: string }[]; mid: { name: string }[]; low: { name: string }[] } | undefined;
  if (c.id.startsWith('combo:')) {
    table = E.combos[c.id.slice(6)];
  } else if (c.id.startsWith('field:')) {
    const field = c.id.slice(6);
    let track = field;
    if (field === 'arts') {
      track =
        (ending.pick === c.id && ending.track) ||
        Object.entries(E.fieldNames).find(([k, v]) => k.startsWith('arts') && v === c.label)?.[0] ||
        'arts_general';
    }
    table = E.fields[track];
  }
  if (!table) return [];
  return [...table.top, ...table.mid, ...table.low].map((j) => j.name);
}

function SharePanel({ game }: { game: GameState }) {
  const booth = useSettings((s) => s.booth);
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [canShare, setCanShare] = useState(false);
  const { t, locale } = useI18n();

  useEffect(() => {
    try {
      setUrl(window.location.origin + sharePath(game, locale));
      setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    } catch {
      setUrl('');
    }
  }, [game, locale]);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    import('qrcode')
      .then((mod) => {
        const lib = (mod as unknown as { default?: typeof mod }).default ?? mod;
        return lib.toDataURL(url, {
          margin: 1,
          width: booth ? 520 : 240,
          errorCorrectionLevel: 'M',
          color: { dark: '#4a3a2f', light: '#ffffff' },
        });
      })
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [url, booth]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: t('ui.summary.shareTitle', { name: t('brand.name') }), text: t('ui.summary.shareText'), url });
    } catch {
      // 사용자가 취소한 경우 등
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-2xl">
        <span aria-hidden="true">🔗</span> {t('ui.summary.share')}
      </h2>
      <div className={`flex flex-col items-center gap-3 ${booth ? '' : 'sm:flex-row sm:items-start'}`}>
        {qr ? (
          <figure className="flex flex-col items-center gap-1">
            <img
              src={qr}
              alt={t('ui.summary.qrAlt')}
              width={booth ? 320 : 160}
              height={booth ? 320 : 160}
              className={`rounded-xl border-2 border-outline/45 bg-paper ${booth ? 'h-auto w-[min(320px,80vw)]' : 'h-40 w-40'}`}
            />
            <figcaption className="text-center text-base text-muted">
              {t(booth ? 'ui.summary.qrBooth' : 'ui.summary.qrNormal')}
            </figcaption>
          </figure>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-outline/45 text-base text-muted">
            {t('ui.summary.qrLoading')}
          </div>
        )}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <label className="text-base text-muted" htmlFor="yd-share-url">
            {t('ui.summary.url')}
          </label>
          <input
            id="yd-share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full min-w-0 rounded-xl border-2 border-outline/45 bg-paper-2 px-3 py-2 text-base"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={copy} disabled={!url}>
              {t('ui.summary.copy')}
            </Button>
            {canShare && (
              <Button variant="secondary" size="sm" onClick={share} disabled={!url}>
                {t('ui.summary.shareButton')}
              </Button>
            )}
            {url && (
              <Link href={sharePath(game, locale)} className={buttonClass('ghost', 'sm')}>
                {t('ui.summary.card')}
              </Link>
            )}
          </div>
          <p className="min-h-6 text-base" aria-live="polite">
            {copied === 'ok' ? t('ui.summary.copied') : copied === 'fail' ? t('ui.summary.copyFail') : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** 엔딩 연출이 끝난 뒤 보여 주는 정리 화면 */
export function EndingSummary({ game, onReplay }: { game: GameState; onReplay?: () => void }) {
  const ending = game.ending!;
  const newGame = useGame((s) => s.newGame);
  const trait = findTrait(game.traitId);
  const club = getClub(game.clubId);
  const route = getRoute(game.routeId);
  const cands = [...ending.candidates].sort((a, b) => b.probability - a.probability);
  const { t, text } = useI18n();
  const href = useLocalePath();

  const again = () => {
    newGame();
    try {
      window.history.replaceState(null, '', href('/play'));
      window.scrollTo({ top: 0 });
    } catch {
      // 무시
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-2xl">
          <span aria-hidden="true">🎰</span> {t('ui.summary.candidates')}
        </h2>
        {cands.length === 0 ? (
          <p className="text-base text-muted">{t('ui.summary.noCandidates')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cands.map((c) => {
              const picked = ending.pick === c.id && ending.kind !== 'rescue' && ending.kind !== 'miracle';
              const jobs = candidateJobs(c, ending);
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border-2 px-3 py-2 ${picked ? 'border-outline bg-sun/30' : 'border-outline/45 bg-paper'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg">
                      {picked && <span aria-hidden="true">🎯 </span>}
                      {text(c.label)}
                      {picked && <span className="text-base text-muted">{t('ui.summary.won')}</span>}
                    </span>
                    <span className="font-display text-lg tabular-nums">{pct(c.probability)}</span>
                  </div>
                  <Bar
                    value={c.probability}
                    max={1}
                    color="var(--color-accent)"
                    label={t('ui.summary.chanceAria', { label: c.label, p: lit(pct(c.probability)) })}
                    className="mt-1 h-2"
                  />
                  {jobs.length > 0 && <p className="mt-1 text-base text-muted">{jobs.map((j) => text(j)).join(' · ')}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {ending.rerolled && <p className="text-base text-muted">{t('ui.summary.rerolled')}</p>}
      </Card>

      {ending.epilogue.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-2xl">
            <span aria-hidden="true">📔</span> {t('ui.summary.epilogue')}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {ending.epilogue.map((line, i) => (
              <li key={i} className="rounded-xl bg-paper-2 px-3 py-2 text-base leading-relaxed">
                {text(line)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl">
          <span aria-hidden="true">📋</span> {t('ui.summary.report')}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-base">
          {trait && (
            <span>
              {t('ui.summary.trait')}{' '}
              <strong className="font-display font-normal">
                {trait.emoji} {text(trait.name)}
              </strong>
            </span>
          )}
          <span>
            {t('ui.summary.club')}{' '}
            <strong className="font-display font-normal">{club ? `${club.emoji} ${text(club.name)}` : t('ui.summary.none')}</strong>
          </span>
          <span>
            {t('ui.summary.route')}{' '}
            <strong className="font-display font-normal">{route ? `${route.emoji} ${text(route.name)}` : t('ui.summary.none')}</strong>
          </span>
          <span className="font-display">{t('ui.summary.turns', { n: game.turn })}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <StatRows game={game} />
            <StressGauge stress={game.stress} />
            <p className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
              <span>
                <span aria-hidden="true">💰</span> {t('ui.summary.moneyLeft')}
              </span>
              <strong className="font-display text-xl font-normal tabular-nums">{text(money(game.money))}</strong>
            </p>
          </div>
          <CareerRows game={game} />
        </div>
      </Card>

      <SharePanel game={game} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button size="lg" onClick={again}>
          {t('ui.summary.again')}
        </Button>
        <Link href={href('/collection')} className={buttonClass('secondary', 'lg')}>
          {t('ui.summary.collection')}
        </Link>
        <Link href={href('/')} className={buttonClass('secondary', 'lg')}>
          {t('ui.summary.home')}
        </Link>
      </div>
      {onReplay && (
        <button type="button" onClick={onReplay} className="self-center text-base text-muted underline">
          {t('ui.summary.replay')}
        </button>
      )}
    </div>
  );
}
