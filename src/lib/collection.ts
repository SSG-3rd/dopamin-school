// 'yd:collection' — 엔딩 도감. { [jobId]: { first: ISO 날짜, count: 본 횟수 } }
import { KEYS, readJSON, writeJSON } from './storage';

export interface CollectionEntry {
  first: string;
  count: number;
}

export type Collection = Record<string, CollectionEntry>;

function isEntry(v: unknown): v is CollectionEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<CollectionEntry>;
  return typeof e.first === 'string' && typeof e.count === 'number' && Number.isFinite(e.count);
}

/** 저장된 도감. 망가진 항목은 건너뛴다. */
export function loadCollection(): Collection {
  const raw = readJSON<unknown>(KEYS.collection, {});
  const out: Collection = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (id && isEntry(entry)) out[id] = { first: entry.first, count: Math.max(1, Math.floor(entry.count)) };
  }
  return out;
}

/** 엔딩을 도감에 기록한다. 처음 본 직업이면 isNew: true. */
export function recordEnding(jobId: string): { isNew: boolean } {
  if (!jobId) return { isNew: false };
  const col = loadCollection();
  const prev = col[jobId];
  col[jobId] = prev
    ? { first: prev.first, count: prev.count + 1 }
    : { first: new Date().toISOString(), count: 1 };
  writeJSON(KEYS.collection, col);
  return { isNew: !prev };
}
