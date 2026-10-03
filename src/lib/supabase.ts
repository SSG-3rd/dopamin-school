// 익명 플레이 통계 전송 (§9). supabase-js 없이 PostgREST에 fetch만 쓴다.
// 환경 변수가 없으면 아무 일도 하지 않고, 실패해도 절대 예외를 던지지 않는다.
import { z } from 'zod';
import { CAREERS } from '@/engine/types';
import type { Career, GameState } from '@/engine/types';
import { careerLevel } from '@/engine/rules';
import { KEYS, readJSON, writeJSON } from './storage';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const MAX_QUEUE = 20;

export function statsEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
  };
  // 예전 anon 키(JWT)만 Authorization으로도 보낸다. sb_publishable_ 키는 apikey 헤더만.
  if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
}

// ---------- 결과 한 줄 ----------
export interface PlayResultRow {
  id: string;
  client_version: string;
  trait_id: string;
  ending_kind: 'normal' | 'combo' | 'miracle' | 'rescue' | 'explore';
  job_id: string;
  grade: 'top' | 'mid' | 'low' | null;
  career_levels: Record<Career, number>;
  final_stats: { study: number; stamina: number; social: number; luck: number; stress: number; money: number };
  club_id: string | null;
  route_id: string | null;
  turns: number;
  duration_sec: number;
  booth_mode: boolean;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}

/** 보안 컨텍스트가 아니면(부스 LAN의 http 주소 등) randomUUID가 없으므로 직접 만든다. */
function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // 아래로
  }
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const short = (s: string | null | undefined): string | null => (s ? s.slice(0, 64) : null);

/** 끝난 판의 익명 요약. 엔딩이 없으면 null. */
export function buildResultRow(state: GameState, booth: boolean): PlayResultRow | null {
  const ending = state.ending;
  if (!ending) return null;
  const levels = {} as Record<Career, number>;
  for (const c of CAREERS) levels[c] = clamp(careerLevel(state.careerExp[c] ?? 0), 0, 5);
  const ended = state.endedAt ?? Date.now();
  return {
    id: uuid(),
    client_version: '1',
    trait_id: state.traitId.slice(0, 64),
    ending_kind: ending.kind,
    job_id: ending.jobId.slice(0, 64),
    grade: ending.grade ?? null,
    career_levels: levels,
    final_stats: {
      study: Math.round(state.stats.study),
      stamina: Math.round(state.stats.stamina),
      social: Math.round(state.stats.social),
      luck: Math.round(state.stats.luck),
      stress: Math.round(state.stress),
      money: Math.round(state.money),
    },
    club_id: short(state.clubId),
    route_id: short(state.routeId),
    turns: Math.round(clamp(state.turn, 1, 200)),
    duration_sec: Math.round(clamp(Math.round((ended - state.startedAt) / 1000), 0, 7200)),
    booth_mode: booth,
  };
}

// ---------- 전송 ----------
type PostResult = 'ok' | 'retry' | 'drop';

async function postRow(row: PlayResultRow): Promise<PostResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/play_results`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      keepalive: true,
      cache: 'no-store',
    });
    if (res.ok || res.status === 409) return 'ok';
    let code: unknown;
    try {
      code = ((await res.json()) as { code?: unknown } | null)?.code;
    } catch {
      code = undefined;
    }
    if (code === '23505') return 'ok'; // 같은 id가 이미 있음 = 이미 전송됨
    // 408·429·5xx는 나중에 다시, 그 밖의 4xx(검사 위반 등)는 다시 보내도 실패하므로 버린다
    if (res.status === 408 || res.status === 429 || res.status >= 500) return 'retry';
    return 'drop';
  } catch {
    return 'retry'; // 네트워크 오류
  }
}

const rowSchema = z.object({ id: z.string().min(1) }).passthrough();

function readQueue(): PlayResultRow[] {
  const raw = readJSON<unknown>(KEYS.sent, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => rowSchema.safeParse(r).success) as PlayResultRow[];
}

function writeQueue(rows: PlayResultRow[]): void {
  writeJSON(KEYS.sent, rows.slice(-MAX_QUEUE));
}

function enqueue(row: PlayResultRow): void {
  const q = readQueue().filter((r) => r.id !== row.id);
  q.push(row);
  writeQueue(q); // 최대 20개, 오래된 것부터 버림
}

// 같은 판을 한 세션에서 두 번 보내지 않게 (재렌더·중복 호출 방지)
const sentGames = new Set<string>();

/** 엔딩이 확정되면 한 번 호출. 기다릴 필요 없고, 절대 throw하지 않는다. */
export async function sendResult(state: GameState, booth: boolean): Promise<void> {
  try {
    if (!statsEnabled()) return;
    const key = `${state.seed}:${state.startedAt}`;
    if (sentGames.has(key)) return;
    const row = buildResultRow(state, booth);
    if (!row) return;
    sentGames.add(key);
    const r = await postRow(row);
    if (r === 'retry') enqueue(row);
  } catch {
    // 통계는 게임에 영향을 주지 않는다
  }
}

let flushing = false;

/** 실패해서 쌓아 둔 결과를 다시 보낸다 (앱 시작 시 1회). */
export async function flushPending(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    if (!statsEnabled()) return;
    const queue = readQueue();
    if (queue.length === 0) return;
    const keep: PlayResultRow[] = [];
    for (const row of queue) {
      const r = await postRow(row);
      if (r === 'retry') keep.push(row);
    }
    // 보내는 동안 새로 쌓인 것도 살린다
    const added = readQueue().filter((r) => !queue.some((q) => q.id === r.id));
    writeQueue([...keep, ...added]);
  } catch {
    // 무시
  } finally {
    flushing = false;
  }
}

// ---------- 서버용 집계 ----------
export interface StatsSummary {
  plays: number;
  traits: Record<string, number> | null;
  jobs: Record<string, number> | null;
}

const countMap = z.record(z.string(), z.coerce.number()).nullable();
const statsSchema = z.object({
  plays: z.coerce.number(),
  traits: countMap.optional().default(null),
  jobs: countMap.optional().default(null),
});

/** /stats 페이지용. get_stats(since) 호출, 30초 캐시. 실패하면 null. */
export async function fetchStats(sinceISO?: string): Promise<StatsSummary | null> {
  if (!statsEnabled()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_stats`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(sinceISO ? { since: sinceISO } : {}),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const parsed = statsSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
