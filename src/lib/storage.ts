// localStorage 안전 래퍼. 쓸 수 없는 환경(시크릿 창 등)에서는 메모리에만 둔다.
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    const probe = '__yd_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function readRaw(key: string): string | null {
  try {
    const s = ls();
    if (s) return s.getItem(key);
  } catch {
    // 무시하고 메모리로
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  try {
    ls()?.setItem(key, value);
  } catch {
    // 용량 초과 등: 메모리 값만 유지
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    ls()?.removeItem(key);
  } catch {
    // 무시
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value));
  } catch {
    // 직렬화 실패 무시
  }
}

export const KEYS = {
  save: 'yd:save',
  collection: 'yd:collection',
  settings: 'yd:settings',
  sent: 'yd:sent',
} as const;
