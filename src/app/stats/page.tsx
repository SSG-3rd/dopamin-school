// 부스용 통계 (§8): 오늘 플레이 수, 인기 성향, 직업 분포. Supabase get_stats()를 30초 캐시.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, buttonClass } from '@/components/ui';
import { content, jobName } from '@/engine/content';
import { fetchStats, statsEnabled } from '@/lib/supabase';

export const revalidate = 30;

export const metadata: Metadata = {
  title: '플레이 통계',
  description: '청춘다이스 익명 플레이 통계: 오늘 플레이 수, 인기 성향, 직업 분포',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Range = 'day' | 'week';

interface Row {
  key: string;
  label: string;
  icon?: string;
  count: number;
}

function toRows(map: Record<string, number> | null, label: (id: string) => { label: string; icon?: string }): Row[] {
  if (!map) return [];
  return Object.entries(map)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .map(([key, count]) => ({ key, count, ...label(key) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
}

/** 한 계열 가로 막대 목록. 값은 막대 옆 글자로도 보여서 그대로 표 역할을 한다. */
function BarList({ rows, total, color, caption }: { rows: Row[]; total: number; color: string; caption: string }) {
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
                <span className="font-display text-lg">{r.count.toLocaleString('ko-KR')}</span>판
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

function Unavailable({ reason }: { reason: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 p-8 text-center">
      <span aria-hidden="true" className="text-5xl">
        📡
      </span>
      <h2 className="text-2xl">통계를 불러올 수 없어요</h2>
      <p className="text-base text-muted">{reason}</p>
      <p className="text-base text-muted">게임은 그대로 즐길 수 있어요!</p>
    </Card>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
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
    ? toRows(stats.traits, (id) => {
        const t = content.traits.find((x) => x.id === id);
        return t ? { label: t.name, icon: t.emoji } : { label: id };
      })
    : [];
  const jobRows = stats ? toRows(stats.jobs, (id) => ({ label: jobName(id) })).slice(0, 10) : [];
  const plays = stats?.plays ?? 0;
  const rangeLabel = range === 'week' ? '최근 7일' : '오늘';

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-12 sm:pt-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className={`${buttonClass('ghost', 'sm')} self-start`}>
          <span aria-hidden="true">←</span> 타이틀로
        </Link>
        <h1 className="text-4xl">
          <span aria-hidden="true">📊</span> 플레이 통계
        </h1>
        <nav aria-label="기간" className="flex gap-2">
          <Link
            href="/stats"
            aria-current={range === 'day' ? 'page' : undefined}
            className={buttonClass(range === 'day' ? 'primary' : 'secondary', 'sm')}
          >
            오늘 (24시간)
          </Link>
          <Link
            href="/stats?range=week"
            aria-current={range === 'week' ? 'page' : undefined}
            className={buttonClass(range === 'week' ? 'primary' : 'secondary', 'sm')}
          >
            최근 7일
          </Link>
        </nav>
      </header>

      {!stats ? (
        <Unavailable
          reason={
            enabled ? '통계 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' : '이 사이트에는 통계 서버가 설정되어 있지 않아요.'
          }
        />
      ) : (
        <>
          <Card className="flex flex-col items-center gap-1 bg-board p-6 text-center text-white">
            <h2 className="text-xl text-white/85">{rangeLabel} 플레이 수</h2>
            <p className="font-display text-7xl leading-none text-sun">{plays.toLocaleString('ko-KR')}</p>
            <p className="text-base text-white/80">판 · 30초마다 새로 고쳐져요</p>
          </Card>

          {plays === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-lg">아직 {rangeLabel} 끝난 판이 없어요. 첫 번째 졸업생이 되어 보세요!</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="flex flex-col gap-4 p-5">
                <h2 className="text-2xl">
                  <span aria-hidden="true">🧑‍🎓</span> 인기 성향
                </h2>
                <BarList rows={traitRows} total={plays} color="var(--color-accent)" caption="성향별 플레이 수" />
              </Card>
              <Card className="flex flex-col gap-4 p-5">
                <h2 className="text-2xl">
                  <span aria-hidden="true">💼</span> 직업 분포 TOP 10
                </h2>
                <BarList rows={jobRows} total={plays} color="var(--color-board-2)" caption="직업별 엔딩 수" />
              </Card>
            </div>
          )}
        </>
      )}

      <p className="text-center text-base text-muted">
        끝난 판의 익명 요약(성향·직업·능력치)만 모아요. 이름 같은 개인정보는 없어요.
      </p>
    </main>
  );
}
