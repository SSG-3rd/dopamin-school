// 중첩된 메시지 JSON → 평평한 문장표 ('engine.promo.title' → '🎉 {year}학년 진급!')
export function flattenMessages(obj: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[key] = v;
      else flattenMessages(v, key, out);
    }
  }
  return out;
}
