// 메시지 키 타입. 한국어 사전(ko.json)이 기준이고, 다른 언어 사전도 같은 키를 모두 가져야 한다.
import type ko from './messages/ko.json';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Messages = typeof ko;
export type MessageKey = Leaves<Messages>;
