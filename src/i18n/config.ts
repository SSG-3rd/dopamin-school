// 지원 언어. 주소 맨 앞(/ko, /en, /ja, /zh)이 언어를 정한다.
// 언어를 더하려면: 여기 한 줄 + messages/<언어>.json + content/i18n/<언어>.json + fonts.ts 한 줄.

export const LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

/** 원문 언어. 번역이 빠진 문장은 이 언어로 보인다 */
export const DEFAULT_LOCALE = 'ko' satisfies Locale;

/** 마지막으로 고른 언어를 기억하는 쿠키 (주소에 언어가 없을 때 쓴다) */
export const LOCALE_COOKIE = 'tp-lang';

export interface LocaleInfo {
  /** 언어 고르기 목록에 보이는 이름 (그 언어로) */
  label: string;
  /** <html lang> · hreflang */
  htmlLang: string;
  /** Open Graph og:locale */
  ogLocale: string;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  ko: { label: '한국어', htmlLang: 'ko', ogLocale: 'ko_KR' },
  en: { label: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  ja: { label: '日本語', htmlLang: 'ja', ogLocale: 'ja_JP' },
  zh: { label: '简体中文', htmlLang: 'zh-Hans', ogLocale: 'zh_CN' },
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** 'en-US', 'zh-Hant-TW' 같은 언어 태그 목록(선호 순)에서 지원하는 언어를 고른다 */
export function matchLocale(tags: readonly string[]): Locale | undefined {
  for (const tag of tags) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return undefined;
}

/** Accept-Language 헤더 → 선호 순 언어 태그 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { tag, q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}

/** 언어가 붙은 주소. localePath('en', '/play') → '/en/play', localePath('en', '/') → '/en' */
export function localePath(locale: Locale, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p === '/' ? `/${locale}` : `/${locale}${p}`;
}

/** '/en/play?x=1' → { locale: 'en', rest: '/play?x=1' }. 언어가 없으면 locale은 undefined */
export function splitLocale(pathname: string): { locale: Locale | undefined; rest: string } {
  const m = /^\/([^/?#]+)(.*)$/.exec(pathname);
  if (m && isLocale(m[1])) return { locale: m[1], rest: m[2] || '/' };
  return { locale: undefined, rest: pathname || '/' };
}
