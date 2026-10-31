// 화면에 보일 문장. 엔진은 언어를 모른다: 문장 대신 키(와 값)를 상태에 남기고, 화면이 지금 언어로 바꿔 그린다.
// 그래서 게임 도중 언어를 바꿔도 이미 나온 사건 카드까지 새 언어로 다시 그려진다.
//
// - 문자열: 문장 키. 메시지는 'stat.study', 콘텐츠 JSON의 문장은 'traits:effort.name'처럼 ':'가 들어간다.
// - { key, vars }: 값이 들어가는 문장. 값의 문자열도 키다. 번역하지 않고 그대로 넣을 글자는 lit()으로 감싼다.
// - { lit }: 번역하지 않는 글자 (이모지, 부호 붙은 숫자 등)
// - 배열: 여러 줄
import type { MessageKey } from '@/i18n/keys';

export interface TextRef {
  key: string;
  vars?: Record<string, TextVar>;
}
export interface TextLit {
  lit: string;
}
export type Text = string | TextRef | TextLit | readonly Text[];
/** 숫자는 언어에 맞게 자릿수를 끊어 넣는다 */
export type TextVar = Text | number;

/** 메시지 키로 문장을 만든다 */
export function tx(key: MessageKey, vars?: Record<string, TextVar>): Text {
  return vars ? { key, vars } : key;
}

/** 번역하지 않는 글자 */
export function lit(s: string): TextLit {
  return { lit: s };
}

/** 돈 (원). 언어마다 단위 표기가 다르다 */
export function money(won: number): Text {
  return { key: 'fmt.money', vars: { n: won } };
}

/** +3 / −3 처럼 부호를 붙인 숫자 (소수 첫째 자리까지) */
export function signed(n: number): TextLit {
  const v = Math.round(n * 10) / 10;
  return lit(v > 0 ? `+${v}` : `${v}`.replace('-', '−'));
}

export function isText(v: unknown): v is Text {
  if (typeof v === 'string') return true;
  if (Array.isArray(v)) return v.every(isText);
  return !!v && typeof v === 'object' && ('key' in v || 'lit' in v);
}
