'use client';
// 엔딩 도감 (§8): 본 직업은 이름과 처음 본 날짜, 못 본 직업은 ??? 실루엣.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bar, Card, Chip, buttonClass } from '@/components/ui';
import { allJobs, content, trackName } from '@/engine/content';
import type { JobInfo } from '@/engine/content';
import { loadCollection } from '@/lib/collection';
import type { Collection } from '@/lib/collection';

const HIDDEN_TRACKS = ['miracle', 'rescue', 'explore'] as const;

const HIDDEN_HINTS: Record<(typeof HIDDEN_TRACKS)[number], { icon: string; hint: string }> = {
  miracle: { icon: '✨', hint: '축제 영상, 학교 SNS, 공모전… 특별한 순간을 만들고 운이 따르면?' },
  rescue: { icon: '📞', hint: '인맥은 넓은데 진로를 정하지 못했다면, 졸업식 날 밤 전화가 올지도.' },
  explore: { icon: '🧭', hint: '어느 진로도 Lv2에 닿지 못하면 찾아오는 엔딩.' },
};

const GRADE_TONE = { top: 'warn', mid: 'info', low: 'neutral' } as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function JobTile({ job, seen, hint }: { job: JobInfo; seen?: Collection[string]; hint?: string }) {
  if (seen) {
    return (
      <Card className="flex h-full flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-lg leading-snug">{job.name}</span>
          {job.grade && (
            <Chip tone={GRADE_TONE[job.grade]} className="shrink-0">
              {content.endings.gradeNames[job.grade]}
            </Chip>
          )}
        </div>
        <span className="text-base text-muted">
          <span aria-hidden="true">📅</span> {formatDate(seen.first)} 처음 봄
          {seen.count > 1 ? ` · ${seen.count}번` : ''}
        </span>
      </Card>
    );
  }
  return (
    <div className="flex h-full flex-col gap-1 rounded-2xl border-2 border-dashed border-line bg-paper-2/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden="true" className="font-display text-lg leading-snug text-ink/30 select-none">
          ？？？
        </span>
        <span className="sr-only">아직 못 본 엔딩</span>
        {job.grade && (
          <Chip className="shrink-0 opacity-70">{content.endings.gradeNames[job.grade]}</Chip>
        )}
      </div>
      <span className="text-base text-muted">{hint ?? '아직 못 본 직업'}</span>
    </div>
  );
}

export default function CollectionPage() {
  const [col, setCol] = useState<Collection>({});
  const [loaded, setLoaded] = useState(false);

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
        <Link href="/" className={`${buttonClass('ghost', 'sm')} self-start`}>
          <span aria-hidden="true">←</span> 타이틀로
        </Link>
        <h1 className="text-4xl">
          <span aria-hidden="true">📖</span> 엔딩 도감
        </h1>
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-lg">모은 직업</span>
            <span className="font-display text-2xl" aria-live="polite">
              {loaded ? seenCount : '–'} <span className="text-muted">/ {total}</span>
            </span>
          </div>
          <Bar value={seenCount} max={total} color="var(--color-mint)" label="도감 진행도" />
          <p className="text-base text-muted">이 기기의 브라우저에만 저장돼요.</p>
        </Card>
      </header>

      {groups.map(([track, jobs]) => {
        const got = jobs.filter((j) => col[j.id]).length;
        return (
          <section key={track} aria-labelledby={`t-${track}`} className="flex flex-col gap-2">
            <h2 id={`t-${track}`} className="flex items-baseline justify-between gap-2 text-2xl">
              <span>{track.startsWith('combo:') ? `조합 · ${trackName(track)}` : trackName(track)}</span>
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
            <span aria-hidden="true">🔒</span> 숨겨진 엔딩
          </span>
          <span className="font-display text-base text-muted">
            {hidden.filter((j) => col[j.id]).length} / {hidden.length}
          </span>
        </h2>
        {HIDDEN_TRACKS.map((t) => {
          const jobs = hidden.filter((j) => j.track === t);
          if (jobs.length === 0) return null;
          return (
            <div key={t} className="flex flex-col gap-2">
              <h3 className="text-lg text-board">
                <span aria-hidden="true">{HIDDEN_HINTS[t].icon}</span> {trackName(t)}
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <JobTile job={j} seen={col[j.id]} hint={HIDDEN_HINTS[t].hint} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <Link href="/" className={buttonClass('primary', 'lg', true)}>
        <span aria-hidden="true">🎲</span> 게임하러 가기
      </Link>
    </main>
  );
}
