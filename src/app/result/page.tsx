// 공유용 결과 카드 (§8·§9). 결과는 주소의 d 쿼리에 담겨 있고, 잘못된 값이면 타이틀로 보낸다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bar, Card, Chip, Stars, buttonClass } from '@/components/ui';
import { CAREERS, STATS } from '@/engine/types';
import { CAREER_ICONS, CAREER_NAMES, STAT_ICONS, STAT_NAMES, findTrait, jobName, trackName } from '@/engine/content';
import { ENDING_KIND_LABELS, GRADE_ICONS, decodeShare, encodeShare, gradeName, josa } from '@/lib/share';
import type { SharePayload } from '@/lib/share';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readPayload(sp: Record<string, string | string[] | undefined>): SharePayload | null {
  const raw = sp.d;
  const d = Array.isArray(raw) ? raw[0] : raw;
  return decodeShare(d);
}

const STAT_COLORS: Record<(typeof STATS)[number], string> = {
  study: 'var(--color-academic)',
  stamina: 'var(--color-sports)',
  social: 'var(--color-comm)',
  luck: 'var(--color-grape)',
};

function describe(p: SharePayload) {
  const trait = findTrait(p.t);
  const job = jobName(p.j);
  const traitName = trait?.name ?? '고등학생';
  return {
    trait,
    job,
    title: `${traitName} 학생의 졸업 후 직업: ${job}`,
    description: `청춘다이스에서 고등학교 3년을 보내고 ${job}${josa(job, '이', '가')} 되었어요${
      p.g ? ` (${gradeName(p.g)} 등급)` : ''
    }. 나는 무엇이 될까? 지금 주사위를 굴려 보세요!`,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const p = readPayload(await searchParams);
  if (!p) return { title: '결과', robots: { index: false } };
  const { title, description, job } = describe(p);
  const image = { url: `/api/og?d=${encodeShare(p)}`, width: 1200, height: 630, alt: `청춘다이스 결과: ${job}` };
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { type: 'website', siteName: '청춘다이스', locale: 'ko_KR', title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default async function ResultPage({ searchParams }: { searchParams: SearchParams }) {
  const p = readPayload(await searchParams);
  if (!p) redirect('/');

  const { trait, job } = describe(p);
  const [study, stamina, social, luck, stress, money] = p.s;
  const statValues: Record<(typeof STATS)[number], number> = { study, stamina, social, luck };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-6 pb-12 sm:pt-10">
      <p className="text-center font-display text-lg text-muted">
        <Link href="/" className="underline-offset-4 hover:underline">
          청춘<span className="text-accent">다이스</span>
        </Link>{' '}
        · 졸업 결과
      </p>

      <Card className="overflow-hidden">
        {/* 칠판 머리 */}
        <div className="border-b-8 border-[#6b4f2a] bg-board px-5 py-7 text-center text-white sm:px-8">
          <p className="text-base text-white/85">
            {trait ? (
              <>
                <span aria-hidden="true">{trait.emoji}</span> {trait.name} 학생의 졸업 후 직업은
              </>
            ) : (
              '졸업 후 나의 직업은'
            )}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-tight text-sun sm:text-6xl">{job}</h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Chip tone="warn" className="bg-sun! text-ink!">{ENDING_KIND_LABELS[p.k]}</Chip>
            {p.g && (
              <Chip tone="info" className="bg-paper! text-ink!">
                <span aria-hidden="true">{GRADE_ICONS[p.g]}</span> {gradeName(p.g)} 등급
              </Chip>
            )}
            {p.tr && <Chip className="bg-paper! text-ink!">{trackName(p.tr)}</Chip>}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-6">
          {/* 진로 레벨 */}
          <section aria-labelledby="careers-title">
            <h2 id="careers-title" className="text-xl">
              <span aria-hidden="true">🧭</span> 진로 레벨
            </h2>
            <ul className="mt-2 divide-y-2 divide-dashed divide-line">
              {CAREERS.map((c, i) => (
                <li key={c} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-display text-lg">
                    <span aria-hidden="true">{CAREER_ICONS[c]}</span> {CAREER_NAMES[c]}
                  </span>
                  <span className="flex items-center gap-2">
                    <Stars level={p.c[i]} className="text-xl" />
                    <span aria-hidden="true" className="w-9 text-right font-display text-muted">
                      Lv{p.c[i]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 능력치 */}
          <section aria-labelledby="stats-title">
            <h2 id="stats-title" className="text-xl">
              <span aria-hidden="true">📋</span> 졸업할 때 능력치
            </h2>
            <ul className="mt-2 flex flex-col gap-3">
              {STATS.map((s) => (
                <li key={s} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                  <span className="font-display text-lg">
                    <span aria-hidden="true">{STAT_ICONS[s]}</span> {STAT_NAMES[s]}
                  </span>
                  <Bar value={statValues[s]} color={STAT_COLORS[s]} label={STAT_NAMES[s]} />
                  <span className="text-right font-display text-lg">{statValues[s]}</span>
                </li>
              ))}
              <li className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                <span className="font-display text-lg">
                  <span aria-hidden="true">😵</span> 스트레스
                </span>
                <Bar value={stress} color="var(--color-danger)" label="스트레스" />
                <span className="text-right font-display text-lg">{stress}</span>
              </li>
            </ul>
            <p className="mt-3 flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
              <span className="font-display text-lg">
                <span aria-hidden="true">💰</span> 남은 돈
              </span>
              <span className="font-display text-lg">{money.toLocaleString('ko-KR')}원</span>
            </p>
          </section>
        </div>
      </Card>

      <Link href="/" className={buttonClass('primary', 'lg', true)}>
        <span aria-hidden="true">🎲</span> 나도 해 보기
      </Link>
      <p className="text-center text-base text-muted">
        결과는 이 주소에만 담겨 있어요. 개인정보는 저장하지 않아요.
      </p>
    </main>
  );
}
