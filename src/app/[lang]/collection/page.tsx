'use client';
// 엔딩 도감 (§8): 본 직업은 이름과 처음 본 날짜, 못 본 직업은 ??? 실루엣.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Card, Chip, buttonClass } from '@/components/ui';
import { allJobs, content, trackName } from '@/engine/content';
import type { JobInfo } from '@/engine/content';
import { lit } from '@/engine/text';
import { useI18n, useLocalePath } from '@/i18n/client';
import { LOCALE_INFO, type Locale } from '@/i18n/config';
import type { MessageKey } from '@/i18n/keys';
import { loadCollection } from '@/lib/collection';
import type { Collection } from '@/lib/collection';

const HIDDEN_TRACKS = ['miracle', 'rescue', 'explore'] as const;

const HIDDEN_HINTS: Record<(typeof HIDDEN_TRACKS)[number], { icon: string; hint: MessageKey }> = {
  miracle: { icon: '✨', hint: 'ui.collection.hintMiracle' },
  rescue: { icon: '📞', hint: 'ui.collection.hintRescue' },
  explore: { icon: '🧭', hint: 'ui.collection.hintExplore' },
};

const GRADE_TONE = { top: 'warn', mid: 'info', low: 'neutral' } as const;

function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_INFO[locale].htmlLang, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function JobTile({ job, seen, hint }: { job: JobInfo; seen?: Collection[string]; hint?: MessageKey }) {
  const { t, text, locale } = useI18n();
  if (seen) {
    return (
      <Card className="flex h-full flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-lg leading-snug">{text(job.name)}</span>
          {job.grade && (
            <Chip tone={GRADE_TONE[job.grade]} className="shrink-0">
              {text(content.endings.gradeNames[job.grade])}
            </Chip>
          )}
        </div>
        <span className="text-base text-muted">
          <span aria-hidden="true">📅</span> {t('ui.collection.firstSeen', { date: lit(formatDate(seen.first, locale)) })}
          {seen.count > 1 ? t('ui.collection.times', { n: seen.count }) : ''}
        </span>
      </Card>
    );
  }
  return (
    <div className="flex h-full flex-col gap-1 rounded-2xl border-2 border-dashed border-outline/40 bg-paper-2/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden="true" className="font-display text-lg leading-snug text-ink/30 select-none">
          ？？？
        </span>
        <span className="sr-only">{t('ui.collection.unseenAria')}</span>
        {job.grade && <Chip className="shrink-0 opacity-70">{text(content.endings.gradeNames[job.grade])}</Chip>}
      </div>
      <span className="text-base text-muted">{t(hint ?? 'ui.collection.unseen')}</span>
    </div>
  );
}

export default function CollectionPage() {
  const [col, setCol] = useState<Collection>({});
  const [loaded, setLoaded] = useState(false);
  const { t, text } = useI18n();
  const href = useLocalePath();

  useEffect(() => {
    setCol(loadCollection());
    setLoaded(true);
  }, []);

  const { groups, hidden, total } = useMemo(() => {
    const jobs = allJobs();
    const byTrack = new Map<string, JobInfo[]>();
    const hiddenJobs: JobInfo[] = [];
    for (const j of jobs) {
      if (j.special || (HIDDEN_TRACKS as readonly string[]).includes(j.track)) {
        hiddenJobs.push(j);
        continue;
      }
      const list = byTrack.get(j.track) ?? [];
      list.push(j);
      byTrack.set(j.track, list);
    }
    return { groups: [...byTrack.entries()], hidden: hiddenJobs, total: jobs.length };
  }, []);

  const seenCount = useMemo(() => {
    const ids = new Set(allJobs().map((j) => j.id));
    return Object.keys(col).filter((id) => ids.has(id)).length;
  }, [col]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-12 sm:pt-10">
      <header className="flex flex-col gap-3">
        <Link href={href('/')} className={`${buttonClass('ghost', 'sm')} self-start`}>
          <span aria-hidden="true">←</span> {t('ui.collection.back')}
        </Link>
        <h1 className="text-4xl">
          <span aria-hidden="true">📖</span> {t('ui.collection.title')}
        </h1>
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-lg">{t('ui.collection.collected')}</span>
            <span className="font-display text-2xl" aria-live="polite">
              {loaded ? seenCount : '–'} <span className="text-muted">/ {total}</span>
            </span>
          </div>
          <Bar value={seenCount} max={total} color="var(--color-mint)" label={t('ui.collection.progressAria')} />
          <p className="text-base text-muted">{t('ui.collection.localOnly')}</p>
        </Card>
      </header>

      {groups.map(([track, jobs]) => {
        const got = jobs.filter((j) => col[j.id]).length;
        return (
          <section key={track} aria-labelledby={`t-${track}`} className="flex flex-col gap-2">
            <h2 id={`t-${track}`} className="flex items-baseline justify-between gap-2 text-2xl">
              <span>{track.startsWith('combo:') ? t('ui.collection.combo', { track: trackName(track) }) : text(trackName(track))}</span>
              <span className="font-display text-base text-muted">
                {got} / {jobs.length}
              </span>
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {jobs.map((j) => (
                <li key={j.id}>
                  <JobTile job={j} seen={col[j.id]} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="t-hidden" className="flex flex-col gap-2">
        <h2 id="t-hidden" className="flex items-baseline justify-between gap-2 text-2xl">
          <span>
            <span aria-hidden="true">🔒</span> {t('ui.collection.hidden')}
          </span>
          <span className="font-display text-base text-muted">
            {hidden.filter((j) => col[j.id]).length} / {hidden.length}
          </span>
        </h2>
        {HIDDEN_TRACKS.map((track) => {
          const jobs = hidden.filter((j) => j.track === track);
          if (jobs.length === 0) return null;
          return (
            <div key={track} className="flex flex-col gap-2">
              <h3 className="text-lg text-board">
                <span aria-hidden="true">{HIDDEN_HINTS[track].icon}</span> {text(trackName(track))}
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <JobTile job={j} seen={col[j.id]} hint={HIDDEN_HINTS[track].hint} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <Link href={href('/')} className={buttonClass('primary', 'lg', true)}>
        <span aria-hidden="true">🎲</span> {t('ui.collection.play')}
      </Link>
    </main>
  );
}
