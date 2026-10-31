// 문장 키 → 글. 서버(메타데이터·공유 이미지)와 브라우저가 같은 번역기를 쓴다.
// 찾는 순서: 지금 언어 → 한국어(원문) → 키 그대로. 키 그대로가 보이면 번역이 빠진 것이다.
import type { Text, TextVar } from '@/engine/text';
import { CONTENT_TEXT_KO } from '@/engine/content';
import koMessages from './messages/ko.json';
import type { MessageKey } from './keys';
import { DEFAULT_LOCALE, LOCALE_INFO, type Locale } from './config';
import { flattenMessages } from './flatten';

export { flattenMessages };

/** 평평하게 편 문장표: 'engine.promo.title' → '🎉 {year}학년 진급!' */
export type TextTable = Readonly<Record<string, string>>;

export interface LocaleTables {
  /** messages/<언어>.json을 편 것 */
  messages: TextTable;
  /** content/i18n/<언어>.json */
  content: TextTable;
}

export interface Translator {
  locale: Locale;
  /** 메시지 키로 글을 만든다 */
  t(key: MessageKey, vars?: Record<string, TextVar>): string;
  /** 엔진이 남긴 문장(Text)을 글로 */
  text(v: Text | null | undefined): string;
  /** 자릿수를 끊은 숫자 */
  num(n: number): string;
  /** 돈 (원) */
  money(won: number): string;
}

const KO: LocaleTables = { messages: flattenMessages(koMessages), content: CONTENT_TEXT_KO };

/** 한국어(원문) 문장표 */
export function koTables(): LocaleTables {
  return KO;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** Array.isArray는 readonly 배열을 좁히지 못해서 따로 둔다 */
function isLines(v: Text): v is readonly Text[] {
  return Array.isArray(v);
}
const warned = new Set<string>();

export function createTranslator(locale: Locale, tables?: LocaleTables): Translator {
  const chain = locale === DEFAULT_LOCALE || !tables ? [KO] : [tables, KO];
  const nf = new Intl.NumberFormat(LOCALE_INFO[locale].htmlLang);

  function lookup(key: string): string {
    const isContent = key.includes(':');
    for (const tb of chain) {
      const v = isContent ? tb.content[key] : tb.messages[key];
      if (v != null) return v;
    }
    // 예전 저장 데이터에는 한국어 글이 그대로 들어 있다 → 그대로 보여 준다
    if (process.env.NODE_ENV !== 'production' && !warned.has(key) && /^[\w.:+-]+$/.test(key)) {
      warned.add(key);
      console.warn(`[i18n] 없는 문장 키: ${key}`);
    }
    return key;
  }

  function fill(template: string, vars: Record<string, TextVar> | undefined): string {
    if (!vars) return template;
    return template.replace(PLACEHOLDER, (m, name: string) => {
      const v = vars[name];
      if (v == null) return m;
      return typeof v === 'number' ? nf.format(v) : render(v);
    });
  }

  function render(v: Text | null | undefined): string {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return lookup(v);
    if (isLines(v)) return v.map(render).join('\n');
    if ('lit' in v) return v.lit;
    return fill(lookup(v.key), v.vars);
  }

  return {
    locale,
    t: (key, vars) => fill(lookup(key), vars),
    text: render,
    num: (n) => nf.format(n),
    money: (won) => fill(lookup('fmt.money'), { n: won }),
  };
}
