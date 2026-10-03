// 효과 적용: 성장 제한, 스트레스 규칙, 진로 경험치 배율, 버프 수명.
import { getBuffDef, getClub } from './content';
import {
  clamp,
  CLUB_EXP_MULT,
  careerLevel,
  MAX_BUFFS,
  PRACTICE_EXP_MULT,
  STAT_MAX,
  STAT_MIN,
  STAT_SOFT_CAP,
} from './rules';
import type {
  ActiveBuff,
  BuffRef,
  Career,
  Change,
  Effects,
  GameState,
  OptionKind,
  RecordKey,
  Stat,
} from './types';
import { CAREERS, STATS } from './types';

export interface ApplyOpts {
  kind?: OptionKind;
  /** 배율 없이 그대로 더한다 (동아리 첫 가입 등) */
  rawCareer?: boolean;
}

export function applyStat(d: GameState, stat: Stat, delta: number, log: Change[]): void {
  if (!delta) return;
  let v = delta;
  if (v > 0) {
    if (stat === 'study' && d.traitId === 'talent') v = Math.max(1, v - 5);
    if (d.stats[stat] > STAT_SOFT_CAP) v = Math.max(1, Math.floor(v / 2));
  }
  const before = d.stats[stat];
  const after = clamp(before + v, STAT_MIN, STAT_MAX);
  d.stats[stat] = after;
  if (after !== before) log.push({ kind: 'stat', key: stat, delta: after - before, value: after });
}

export function applyStress(d: GameState, delta: number, log: Change[], kind?: OptionKind): void {
  if (!delta) return;
  let v = delta;
  if (v > 0) {
    if (d.traitId === 'athlete') v = Math.max(0, v - 5);
    if (hasBuff(d, 'recharged')) v = 0;
  } else if (kind === 'rest' && d.stress >= 80) {
    v *= 2;
  }
  const before = d.stress;
  const after = clamp(before + v, 0, 100);
  d.stress = after;
  if (after !== before) log.push({ kind: 'stress', delta: after - before, value: after });
  if (after >= 100) d.burnoutPending = true;
}

export function setStress(d: GameState, value: number, log: Change[]): void {
  const before = d.stress;
  d.stress = clamp(value, 0, 100);
  if (d.stress !== before) log.push({ kind: 'stress', delta: d.stress - before, value: d.stress });
}

export function applyMoney(d: GameState, delta: number, log: Change[]): void {
  if (!delta) return;
  const before = d.money;
  d.money = Math.max(0, before + delta);
  if (d.money !== before) log.push({ kind: 'money', delta: d.money - before, value: d.money });
}

export function careerMultiplier(d: GameState, career: Career): number {
  let mult = 1;
  const club = getClub(d.clubId);
  if (club && club.career === career) mult *= CLUB_EXP_MULT;
  if (d.buffs.some((b) => b.id === 'practice' && b.field === career)) mult *= PRACTICE_EXP_MULT;
  return mult;
}

export function addCareerExp(d: GameState, career: Career, amount: number, log: Change[], raw = false): number {
  if (amount <= 0) return 0;
  const gained = raw ? amount : amount * careerMultiplier(d, career);
  const beforeLv = careerLevel(d.careerExp[career]);
  d.careerExp[career] = Math.round((d.careerExp[career] + gained) * 100) / 100;
  const level = careerLevel(d.careerExp[career]);
  log.push({
    kind: 'career',
    key: career,
    delta: gained,
    exp: d.careerExp[career],
    level,
    levelUp: level > beforeLv,
  });
  return gained;
}

export function resolveCareerKey(d: GameState, key: Career | 'club'): Career | null {
  if (key === 'club') return getClub(d.clubId)?.career ?? null;
  return key;
}

export function addRecord(d: GameState, key: RecordKey, delta: number, log: Change[]): void {
  if (!delta) return;
  d.records[key] = Math.max(0, d.records[key] + delta);
  log.push({ kind: 'record', key, delta });
}

export function addFlag(d: GameState, flag: string, log: Change[]): void {
  if (d.flags.includes(flag)) return;
  d.flags.push(flag);
  log.push({ kind: 'flag', id: flag });
}

// ---------- 버프 ----------
export function hasBuff(d: GameState, id: string): boolean {
  return d.buffs.some((b) => b.id === id) || d.debuffs.some((b) => b.id === id);
}

function buffRefParts(ref: BuffRef): { id: string; field?: Career } {
  return typeof ref === 'string' ? { id: ref } : { id: ref.id, field: ref.field };
}

export function addBuff(d: GameState, ref: BuffRef, log: Change[]): void {
  const { id, field } = buffRefParts(ref);
  const def = getBuffDef(id);
  if (!def) return;
  const list = def.debuff ? d.debuffs : d.buffs;
  d.tick += 1;
  const existing = list.find((b) => b.id === id);
  if (existing) {
    existing.remaining = def.moves;
    if (field) existing.field = field;
    existing.gainedAt = d.tick;
    log.push({ kind: 'buff', id, gained: true, debuff: def.debuff });
    return;
  }
  if (!def.debuff && list.length >= MAX_BUFFS) {
    let oldest = 0;
    for (let i = 1; i < list.length; i++) if (list[i].gainedAt < list[oldest].gainedAt) oldest = i;
    const [removed] = list.splice(oldest, 1);
    log.push({ kind: 'buff', id: removed.id, gained: false });
  }
  const buff: ActiveBuff = { id, gainedAt: d.tick };
  if (def.moves) buff.remaining = def.moves;
  if (field) buff.field = field;
  list.push(buff);
  log.push({ kind: 'buff', id, gained: true, debuff: def.debuff });
}

export function removeBuff(d: GameState, id: string, log: Change[]): boolean {
  for (const list of [d.buffs, d.debuffs]) {
    const i = list.findIndex((b) => b.id === id);
    if (i >= 0) {
      list.splice(i, 1);
      log.push({ kind: 'buff', id, gained: false, debuff: getBuffDef(id)?.debuff });
      return true;
    }
  }
  return false;
}

/** 'endsOn' 조건이 맞는 버프를 모두 끝낸다 */
export function consumeBuffs(d: GameState, endsOn: string, log: Change[]): string[] {
  const ended: string[] = [];
  for (const b of [...d.buffs, ...d.debuffs]) {
    if (getBuffDef(b.id)?.endsOn === endsOn) {
      removeBuff(d, b.id, log);
      ended.push(b.id);
    }
  }
  return ended;
}

/** 한 칸 지날 때마다 'N칸 이동' 버프 수명을 줄인다 */
export function tickMoveBuffs(d: GameState, log: Change[]): void {
  for (const list of [d.buffs, d.debuffs]) {
    for (const b of [...list]) {
      if (b.remaining == null) continue;
      b.remaining -= 1;
      if (b.remaining <= 0) removeBuff(d, b.id, log);
    }
  }
}

// ---------- 효과 묶음 ----------
export function applyEffects(d: GameState, e: Effects | undefined, log: Change[], opts: ApplyOpts = {}): void {
  if (!e) return;
  if (e.stats) for (const s of STATS) if (e.stats[s]) applyStat(d, s, e.stats[s]!, log);
  if (e.stress) applyStress(d, e.stress, log, opts.kind);
  if (e.money) applyMoney(d, e.money, log);
  if (e.career) {
    for (const key of [...CAREERS, 'club'] as const) {
      const v = e.career[key];
      if (!v) continue;
      const c = resolveCareerKey(d, key);
      if (c) addCareerExp(d, c, v, log, opts.rawCareer);
    }
  }
  if (e.records) {
    for (const k of ['examPass', 'award', 'praise', 'late'] as const) if (e.records[k]) addRecord(d, k, e.records[k]!, log);
  }
  if (e.buff) addBuff(d, e.buff, log);
  if (e.debuff) addBuff(d, e.debuff, log);
  if (e.flag) addFlag(d, e.flag, log);
}

/** 효과가 주는 진로 경험치 합(배율 전) — 댄스부 보너스 판단용 */
export function baseCareerGain(d: GameState, e: Effects | undefined, career: Career): number {
  if (!e?.career) return 0;
  let sum = 0;
  for (const key of [...CAREERS, 'club'] as const) {
    const v = e.career[key];
    if (v && resolveCareerKey(d, key) === career) sum += v;
  }
  return sum;
}
