// 콘텐츠 JSON의 번역 대상 문장(스키마에서 text()로 표시한 칸)을 문장 키로 바꾸고, 원문(한국어)은 따로 모은다.
// 키 모양: '<묶음>:<경로>'. 배열 안의 객체는 id로, 나머지는 순서 번호로 경로를 잇는다.
//   예) 'traits:effort.name', 'events:cls_quiz.options.ask.label', 'counsel:texts.0'
// 다른 언어 번역(content/i18n/<언어>.json)도 같은 키를 쓴다.
import { z } from 'zod';

const textFields = z.registry();

/** 번역 대상 문장 칸 */
export function text(): z.ZodString {
  return z.string().register(textFields, {});
}
/** 번역 대상 문장 칸 (비면 안 됨) */
export function textRequired(): z.ZodString {
  return z.string().min(1).register(textFields, {});
}

interface Def {
  type: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  valueType?: z.ZodType;
  innerType?: z.ZodType;
}

function defOf(s: z.ZodType): Def {
  return (s as unknown as { _zod: { def: Def } })._zod.def;
}

function segment(item: unknown, i: number): string {
  if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') return (item as { id: string }).id;
  return String(i);
}

/**
 * data(스키마로 이미 검증한 값)의 문장 칸을 키로 바꾼 사본을 돌려주고, 원문은 out[키]에 넣는다.
 * 같은 키가 두 번 나오면 콘텐츠 id가 겹친 것이라 바로 실패한다.
 */
export function keyTexts<T>(schema: z.ZodType<T>, data: T, ns: string, out: Record<string, string>): T {
  return walk(schema, data, [], ns, out) as T;
}

function walk(s: z.ZodType, v: unknown, path: string[], ns: string, out: Record<string, string>): unknown {
  if (v == null) return v;
  if (textFields.has(s)) {
    if (typeof v !== 'string') return v;
    const key = `${ns}:${path.join('.')}`;
    if (key in out) throw new Error(`[content] 문장 키가 겹친다: ${key}`);
    out[key] = v;
    return key;
  }
  const d = defOf(s);
  switch (d.type) {
    case 'optional':
    case 'nullable':
      return walk(d.innerType!, v, path, ns, out);
    case 'object': {
      const o = { ...(v as Record<string, unknown>) };
      for (const [k, sub] of Object.entries(d.shape!)) {
        if (k in o) o[k] = walk(sub, o[k], [...path, k], ns, out);
      }
      return o;
    }
    case 'array':
      return (v as unknown[]).map((item, i) => walk(d.element!, item, [...path, segment(item, i)], ns, out));
    case 'record': {
      const o = { ...(v as Record<string, unknown>) };
      for (const k of Object.keys(o)) o[k] = walk(d.valueType!, o[k], [...path, k], ns, out);
      return o;
    }
    default:
      return v;
  }
}
