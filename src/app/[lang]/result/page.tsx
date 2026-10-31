// 공유용 결과 카드 (§8·§9). 결과는 주소의 d 쿼리에 담겨 있고, 잘못된 값이면 타이틀로 보낸다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DiceBuddy } from '@/components/DiceBuddy';
import { Bar, Card, Chip, Stars, buttonClass } from '@/components/ui';
import { CAREERS, STATS } from '@/engine/types';
import { CAREER_ICONS, CAREER_TEXT, STAT_ICONS, STAT_TEXT, findTrait, jobName, trackName } from '@/engine/content';
import { lit, money as moneyText } from '@/engine/text';
import { LOCALE_INFO, localePath } from '@/i18n/config';
import { localeOf } from '@/i18n/route';
import { getTranslator } from '@/i18n/server';
import type { Translator } from '@/i18n/translator';
import { ENDING_KIND_LABELS, GRADE_ICONS, decodeShare, encodeShare, gradeName, josa } from '@/lib/share';
import type { SharePayload } from '@/lib/share';

type SearchParams = Record<string, string | string[] | undefined>;

function readPayload(sp: SearchParams): SharePayload | null {
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

function describe(p: SharePayload, tr: Translator) {
  const { t, text } = tr;
  const trait = findTrait(p.t);
  const job = text(jobName(p.j));
  const traitName = trait ? text(trait.name) : t('ui.result.student');
  return {
    trait,
    job,
    title: t('ui.result.title', { trait: lit(traitName), job: lit(job) }),
    description: t('ui.result.description', {
      name: t('brand.name'),
      job: lit(job),
      // 한국어 조사(이/가). 다른 언어 문장에는 이 자리가 없다.
      ga: lit(josa(job, '이', '가')),
      grade: p.g ? lit(t('ui.result.descriptionGrade', { grade: gradeName(p.g) })) : lit(''),
    }),
  };
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/result'>): Promise<Metadata> {
  const locale = await localeOf(params);
  const tr = await getTranslator(locale);
  const p = readPayload(await searchParams);
  if (!p) return { title: tr.t('ui.result.pageTitle'), robots: { index: false } };
  const { title, description, job } = describe(p, tr);
  const name = tr.t('brand.name');
  const image = {
    url: `/api/og?l=${locale}&d=${encodeShare(p)}`,
    width: 1200,
    height: 630,
    alt: tr.t('ui.result.ogAlt', { name: lit(name), job: lit(job) }),
  };
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { type: 'website', siteName: name, locale: LOCALE_INFO[locale].ogLocale, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default async function ResultPage({ params, searchParams }: PageProps<'/[lang]/result'>) {
  const locale = await localeOf(params);
  const tr = await getTranslator(locale);
  const { t, text } = tr;
  const p = readPayload(await searchParams);
  if (!p) redirect(localePath(locale));

  const { trait, job } = describe(p, tr);
  const [study, stamina, social, luck, stress, money] = p.s;
  const statValues: Record<(typeof STATS)[number], number> = { study, stamina, social, luck };
  const home = localePath(locale);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-6 pb-12 sm:pt-10">
      <p className="yd-panel self-center px-4 py-1 text-center font-display text-lg text-muted">
        <Link href={home} className="underline-offset-4 hover:underline">
          <span className="text-accent-deep">{t('brand.namePart1')}</span> <span className="text-ink">{t('brand.namePart2')}</span>
        </Link>{' '}
        · {t('ui.result.badge')}
      </p>

      <Card className="overflow-hidden">
        {/* 하늘 머리 */}
        <div className="relative border-b-[2.5px] border-outline bg-[linear-gradient(#9dd5f1,#d6effa)] px-5 py-7 text-center text-ink sm:px-8">
          <DiceBuddy size={44} mood="wow" color="#ffe08a" className="absolute top-3 right-4 rotate-12" />
          <p className="text-base text-ink/85">
            {trait ? (
              <>
                <span aria-hidden="true">{trait.emoji}</span> {t('ui.result.lead', { trait: trait.name })}
              </>
            ) : (
              t('ui.result.leadNoTrait')
            )}
          </p>
          <h1 className="yd-logo mt-2 font-display text-5xl leading-tight text-sun sm:text-6xl">{job}</h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Chip tone="warn" className="bg-sun! text-ink!">
              {t(ENDING_KIND_LABELS[p.k])}
            </Chip>
            {p.g && (
              <Chip tone="info" className="bg-paper! text-ink!">
                <span aria-hidden="true">{GRADE_ICONS[p.g]}</span> {t('ending.gradeOf', { grade: gradeName(p.g) })}
              </Chip>
            )}
            {p.tr && <Chip className="bg-paper! text-ink!">{text(trackName(p.tr))}</Chip>}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-6">
          {/* 진로 레벨 */}
          <section aria-labelledby="careers-title">
            <h2 id="careers-title" className="text-xl">
              <span aria-hidden="true">🧭</span> {t('ui.result.careers')}
            </h2>
            <ul className="mt-2 divide-y-2 divide-dashed divide-line">
              {CAREERS.map((c, i) => (
                <li key={c} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-display text-lg">
                    <span aria-hidden="true">{CAREER_ICONS[c]}</span> {text(CAREER_TEXT[c])}
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
              <span aria-hidden="true">📋</span> {t('ui.result.stats')}
            </h2>
            <ul className="mt-2 flex flex-col gap-3">
              {STATS.map((s) => (
                <li key={s} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                  <span className="font-display text-lg">
                    <span aria-hidden="true">{STAT_ICONS[s]}</span> {text(STAT_TEXT[s])}
                  </span>
                  <Bar value={statValues[s]} color={STAT_COLORS[s]} label={text(STAT_TEXT[s])} />
                  <span className="text-right font-display text-lg">{statValues[s]}</span>
                </li>
              ))}
              <li className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                <span className="font-display text-lg">
                  <span aria-hidden="true">😵</span> {t('stress.name')}
                </span>
                <Bar value={stress} color="var(--color-danger)" label={t('stress.name')} />
                <span className="text-right font-display text-lg">{stress}</span>
              </li>
            </ul>
            <p className="mt-3 flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
              <span className="font-display text-lg">
                <span aria-hidden="true">💰</span> {t('ui.result.moneyLeft')}
              </span>
              <span className="font-display text-lg">{text(moneyText(money))}</span>
            </p>
          </section>
        </div>
      </Card>

      <Link href={home} className={buttonClass('primary', 'lg', true)}>
        <span aria-hidden="true">🎲</span> {t('ui.result.tryIt')}
      </Link>
      <p className="text-center text-base text-muted">{t('ui.result.privacy')}</p>
    </main>
  );
}
