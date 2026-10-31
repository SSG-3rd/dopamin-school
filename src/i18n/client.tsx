'use client';
// 브라우저 쪽 번역. 레이아웃(서버)이 지금 언어의 문장표를 넘겨주고, 화면은 useI18n()으로 쓴다.
//   const { t, text, locale } = useI18n();
//   t('ui.title.start')      — 메시지 키 (오타는 타입 검사가 잡는다)
//   text(game.pending.title) — 엔진이 남긴 문장(Text)
import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, localePath, type Locale } from './config';
import { createTranslator, type LocaleTables, type Translator } from './translator';

const I18nContext = createContext<Translator>(createTranslator(DEFAULT_LOCALE));

export function I18nProvider({
  locale,
  tables,
  children,
}: {
  locale: Locale;
  tables?: LocaleTables;
  children: ReactNode;
}) {
  const value = useMemo(() => createTranslator(locale, tables), [locale, tables]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): Translator {
  return use(I18nContext);
}

/** 지금 언어가 붙은 주소를 만든다: href('/play') → '/en/play' */
export function useLocalePath(): (path: string) => string {
  const { locale } = useI18n();
  return useCallback((path: string) => localePath(locale, path), [locale]);
}
