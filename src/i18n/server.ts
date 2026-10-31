// 서버 쪽 번역: 언어별 문장표를 그 언어가 필요할 때만 불러온다.
// 한국어(원문)는 엔진과 함께 늘 들어 있으니 따로 불러오지 않는다.
import { DEFAULT_LOCALE, type Locale } from './config';
import { createTranslator, flattenMessages, type LocaleTables, type Translator } from './translator';

type Json = { default: unknown };

const MESSAGES: Record<Exclude<Locale, typeof DEFAULT_LOCALE>, () => Promise<Json>> = {
  en: () => import('./messages/en.json'),
  ja: () => import('./messages/ja.json'),
  zh: () => import('./messages/zh.json'),
};

const CONTENT: Record<Exclude<Locale, typeof DEFAULT_LOCALE>, () => Promise<Json>> = {
  en: () => import('../../content/i18n/en.json'),
  ja: () => import('../../content/i18n/ja.json'),
  zh: () => import('../../content/i18n/zh.json'),
};

const cache = new Map<Locale, Promise<LocaleTables | undefined>>();

/** 그 언어의 문장표 (한국어면 undefined: 원문이 기본이다) */
export function loadTables(locale: Locale): Promise<LocaleTables | undefined> {
  if (locale === DEFAULT_LOCALE) return Promise.resolve(undefined);
  let p = cache.get(locale);
  if (!p) {
    p = Promise.all([MESSAGES[locale](), CONTENT[locale]()]).then(([m, c]) => ({
      messages: flattenMessages(m.default),
      content: c.default as Record<string, string>,
    }));
    cache.set(locale, p);
  }
  return p;
}

export async function getTranslator(locale: Locale): Promise<Translator> {
  return createTranslator(locale, await loadTables(locale));
}
