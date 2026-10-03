// 결과 공유 (§9): DB 없이 주소에 결과를 담는다. /result?d=<base64url(JSON)>
// 브라우저와 Node·Edge 모두에서 동작하도록 TextEncoder + btoa/atob만 쓴다.
import { z } from 'zod';
import { CAREERS } from '@/engine/types';
import type { GameState } from '@/engine/types';
import { careerLevel } from '@/engine/rules';
import { allJobs, content, findTrait } from '@/engine/content';

export const ENDING_KINDS = ['normal', 'combo', 'miracle', 'rescue', 'explore'] as const;
export type EndingKind = (typeof ENDING_KINDS)[number];

export interface SharePayload {
  v: 1;
  /** 성향 id */
  t: string;
  /** 직업 id */
  j: string;
  /** 엔딩 종류 */
  k: EndingKind;
  /** 등급 */
  g?: 'top' | 'mid' | 'low';
  /** 분야 묶음 (예: 'academic', 'arts_music', 'combo:sports+arts') */
  tr?: string;
  /** 진로 레벨 [학문, 운동, 예술, 소통, 경영] */
  c: [number, number, number, number, number];
  /** [학업, 체력, 인맥, 운, 스트레스, 돈] */
  s: [number, number, number, number, number, number];
}

const MAX_D_LENGTH = 1024;
const MAX_MONEY = 99_999_999;

let jobIdCache: Set<string> | null = null;
let trackCache: Set<string> | null = null;
function jobIds(): Set<string> {
  if (!jobIdCache) jobIdCache = new Set(allJobs().map((j) => j.id));
  return jobIdCache;
}
function knownTracks(): Set<string> {
  if (!trackCache) {
    trackCache = new Set([...allJobs().map((j) => j.track), ...Object.keys(content.endings.fieldNames)]);
    for (const c of Object.keys(content.endings.combos)) trackCache.add(`combo:${c}`);
  }
  return trackCache;
}

const lv = z.number().int().min(0).max(5);
const pct = z.number().int().min(0).max(100);

const payloadSchema = z.object({
  v: z.literal(1),
  t: z
    .string()
    .max(64)
    .refine((id) => findTrait(id) !== undefined, '알 수 없는 성향'),
  j: z
    .string()
    .max(64)
    .refine((id) => jobIds().has(id), '알 수 없는 직업'),
  k: z.enum(ENDING_KINDS),
  g: z.enum(['top', 'mid', 'low']).optional(),
  // 모르는 분야 이름은 실패 대신 버린다
  tr: z
    .string()
    .max(64)
    .optional()
    .transform((t) => (t && knownTracks().has(t) ? t : undefined)),
  c: z.tuple([lv, lv, lv, lv, lv]),
  s: z.tuple([pct, pct, pct, pct, pct, z.number().int().min(0).max(MAX_MONEY)]),
});

// ---------- base64url (UTF-8 안전) ----------
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(d: string): string {
  const b64 = d.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

const clampInt = (n: number, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.min(Math.max(Math.round(n), lo), hi) : lo;

/** 끝난 게임의 공유 데이터. 아직 엔딩이 없으면 null. */
export function buildSharePayload(state: GameState): SharePayload | null {
  const e = state.ending;
  if (!e) return null;
  const c = CAREERS.map((k) => clampInt(careerLevel(state.careerExp[k] ?? 0), 0, 5)) as SharePayload['c'];
  const p: SharePayload = {
    v: 1,
    t: state.traitId,
    j: e.jobId,
    k: e.kind,
    c,
    s: [
      clampInt(state.stats.study, 0, 100),
      clampInt(state.stats.stamina, 0, 100),
      clampInt(state.stats.social, 0, 100),
      clampInt(state.stats.luck, 0, 100),
      clampInt(state.stress, 0, 100),
      clampInt(state.money, 0, MAX_MONEY),
    ],
  };
  if (e.grade) p.g = e.grade;
  if (e.track) p.tr = e.track;
  return p;
}

export function encodeShare(payload: SharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/** 검사를 통과하지 못하면 null (모르는 성향·직업, 범위 밖 값, 깨진 문자열). */
export function decodeShare(d: string | null | undefined): SharePayload | null {
  if (!d || typeof d !== 'string' || d.length > MAX_D_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(d)) return null;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(fromBase64Url(d)));
    if (!parsed.success) return null;
    const { tr, g, ...rest } = parsed.data;
    const out: SharePayload = { ...rest };
    if (g) out.g = g;
    if (tr) out.tr = tr;
    return out;
  } catch {
    return null;
  }
}

/** '/result?d=...' (엔딩 전이면 '/') */
export function sharePath(state: GameState): string {
  const p = buildSharePayload(state);
  return p ? `/result?d=${encodeShare(p)}` : '/';
}

// ---------- 화면·OG 이미지 공용 문구 ----------
export const ENDING_KIND_LABELS: Record<EndingKind, string> = {
  normal: '분야 직업',
  combo: '조합 직업',
  miracle: '기적 엔딩',
  rescue: '친구 구원 엔딩',
  explore: '탐색 엔딩',
};

export const GRADE_ICONS: Record<'top' | 'mid' | 'low', string> = { top: '🥇', mid: '🥈', low: '🥉' };

export function gradeName(g: 'top' | 'mid' | 'low'): string {
  return content.endings.gradeNames[g] ?? g;
}

/** 받침에 따라 '이'/'가' 같은 조사를 고른다. */
export function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return without;
  return (code - 0xac00) % 28 !== 0 ? withBatchim : without;
}
