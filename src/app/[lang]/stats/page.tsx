// 부스용 통계 (§8): 오늘 플레이 수, 인기 성향, 직업 분포. Supabase get_stats()를 30초 캐시.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, buttonClass } from '@/components/ui';
import { content, jobName } from '@/engine/content';
import { lit } from '@/engine/text';
import { LOCALE_INFO, localePath } from '@/i18n/config';
import { languageAlternates, localeOf } from '@/i18n/route';
import { getTranslator } from '@/i18n/server';
import type { Translator } from '@/i18n/translator';
import { fetchStats, statsEnabled } from '@/lib/supabase';

export const revalidate = 30;

export async function generateMetadata({ params }: PageProps<'/[lang]/stats'>): Promise<Metadata> {
  const locale = await localeOf(params);
  const { t } = await getTranslator(locale);
  return {
    title: t('ui.stats.title'),
    description: t('ui.stats.description', { name: t('brand.name') }),
    alternates: { canonical: localePath(locale, '/stats'), languages: languageAlternates('/stats') },
  };
}

type Range = 'day' | 'week';

interface Row {
  key: string;
  label: string;
  icon?: string;
  count: number;
}

function toRows(
  map: Record<string, number> | null,
  label: (id: string) => { label: string; icon?: string },
  collator: Intl.Collator,
): Row[] {
  if (!map) return [];
  return Object.entries(map)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .map(([key, count]) => ({ key, count, ...label(key) }))
    .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
}

/** 한 계열 가로 막대 목록. 값은 막대 옆 글자로도 보여서 그대로 표 역할을 한다. */
function BarList({ rows, total, color, caption, tr }: { rows: Row[]; total: number; color: string; caption: string; tr: Translator }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="flex flex-col gap-3" aria-label={caption}>
      {rows.map((r, i) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 font-display text-lg leading-snug">
                <span className="mr-1 text-muted">{i + 1}.</span>
                {r.icon && <span aria-hidden="true">{r.icon} </span>}
                {r.label}
              </span>
              <span className="shrink-0 text-base text-ink">
                <span className="font-display text-lg">{tr.t('ui.stats.plays', { n: r.count })}</span>
                <span className="ml-1 text-muted">({pct}%)</span>
              </span>
            </div>
            <div aria-hidden="true" className="h-3 w-full">
              <div
                className="h-full min-w-1 rounded-r-[4px]"
                style={{ width: `${(r.count / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Unavailable({ reason, tr }: { reason: string; tr: Translator }) {
  return (
    <Card className="flex flex-col items-center gap-2 p-8 text-center">
      <span aria-hidden="true" className="text-5xl">
        📡
      </span>
      <h2 className="text-2xl">{tr.t('ui.stats.unavailable')}</h2>
      <p className="text-base text-muted">{reason}</p>
      <p className="text-base text-muted">{tr.t('ui.stats.stillPlayable')}</p>
    </Card>
  );
}

export default async function StatsPage({ params, searchParams }: PageProps<'/[lang]/stats'>) {
  const locale = await localeOf(params);
  const tr = await getTranslator(locale);
  const { t, text } = tr;
  const collator = new Intl.Collator(LOCALE_INFO[locale].htmlLang);
  const sp = await searchParams;
  const rangeParam = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range: Range = rangeParam === 'week' ? 'week' : 'day';

  // 캐시 키가 매번 달라지지 않게 분 단위로 내림
  let since: string | undefined;
  if (range === 'week') {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    d.setSeconds(0, 0);
    since = d.toISOString();
  }

  const enabled = statsEnabled();
  const stats = enabled ? await fetchStats(since) : null;

  const traitRows = stats
    ? toRows(
        stats.traits,
        (id) => {
          const trait = content.traits.find((x) => x.id === id);
          return trait ? { label: text(trait.name), icon: trait.emoji } : { label: id };
        },
        collator,
      )
    : [];
  const jobRows = stats ? toRows(stats.jobs, (id) => ({ label: text(jobName(id)) }), collator).slice(0, 10) : [];
  const plays = stats?.plays ?? 0;
  const rangeLabel = t(range === 'week' ? 'ui.stats.rangeWeek' : 'ui.stats.rangeToday');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-12 sm:pt-10">
      <header className="flex flex-col gap-3">
        <Link href={localePath(locale)} className={`${buttonClass('ghost', 'sm')} self-start`}>
          <span aria-hidden="true">←</span> {t('ui.stats.back')}
        </Link>
        <h1 className="text-4xl">
          <span aria-hidden="true">📊</span> {t('ui.stats.title')}
        </h1>
        <nav aria-label={t('ui.stats.rangeAria')} className="flex gap-2">
          <Link
            href={localePath(locale, '/stats')}
            aria-current={range === 'day' ? 'page' : undefined}
            className={buttonClass(range === 'day' ? 'primary' : 'secondary', 'sm')}
          >
            {t('ui.stats.today')}
          </Link>
          <Link
            href={localePath(locale, '/stats?range=week')}
            aria-current={range === 'week' ? 'page' : undefined}
            className={buttonClass(range === 'week' ? 'primary' : 'secondary', 'sm')}
          >
            {t('ui.stats.week')}
          </Link>
        </nav>
      </header>

      {!stats ? (
        <Unavailable tr={tr} reason={t(enabled ? 'ui.stats.serverDown' : 'ui.stats.noServer')} />
      ) : (
        <>
          <Card className="flex flex-col items-center gap-1 bg-[linear-gradient(#9dd5f1,#d6effa)] p-6 text-center text-ink">
            <h2 className="text-xl text-ink/85">{t('ui.stats.playCount', { range: lit(rangeLabel) })}</h2>
            <p className="yd-logo font-display text-7xl leading-none text-sun">{tr.num(plays)}</p>
            <p className="text-base text-ink/80">{t('ui.stats.refresh')}</p>
          </Card>

          {plays === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-lg">{t('ui.stats.empty', { range: lit(rangeLabel) })}</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="flex flex-col gap-4 p-5">
                <h2 className="text-2xl">
                  <span aria-hidden="true">🧑‍🎓</span> {t('ui.stats.traits')}
                </h2>
                <BarList tr={tr} rows={traitRows} total={plays} color="var(--color-accent)" caption={t('ui.stats.traitsAria')} />
              </Card>
              <Card className="flex flex-col gap-4 p-5">
                <h2 className="text-2xl">
                  <span aria-hidden="true">💼</span> {t('ui.stats.jobs')}
                </h2>
                <BarList tr={tr} rows={jobRows} total={plays} color="var(--color-board-2)" caption={t('ui.stats.jobsAria')} />
              </Card>
            </div>
          )}
        </>
      )}

      <p className="text-center text-base text-muted">
        {t('ui.stats.privacy')}
      </p>
    </main>
  );
}
