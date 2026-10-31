// 페이지·레이아웃(서버)에서 쓰는 언어 도우미
import { notFound } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, isLocale, localePath, type Locale } from './config';

/** 주소의 언어. 모르는 언어면 404 */
export async function localeOf(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

/** 같은 페이지의 언어별 주소 (검색엔진용 hreflang) */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[LOCALE_INFO[l].htmlLang] = localePath(l, path);
  out['x-default'] = localePath(DEFAULT_LOCALE, path);
  return out;
}
