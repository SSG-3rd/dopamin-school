// 화면용 조회 함수. 상태를 바꾸지 않는다.
import {
  CAREER_NAMES,
  STAT_NAMES,
  content,
  getBuffDef,
  getClub,
  getRoute,
  type BoardTile,
  type Item,
  type Route,
} from './content';
import { resolveCareerKey } from './effects';
import { planJudge } from './judge';
import { ABILITY_USES_PER_YEAR, careerLevel, formatMoney, isGrowthLocked, scaleStatGain } from './rules';
import type {
  Change,
  CheckBy,
  ChoiceOption,
  Effects,
  GameState,
  JudgeBonus,
  Requirement,
} from './types';
import { CAREERS, STATS } from './types';

export interface OptionView {
  option: ChoiceOption;
  key: number;
  disabled: boolean;
  reason?: string;
  preview: string[];
  failPreview?: string[];
  judge?: { byLabel: string; diff: number; bonus: number; probability: number; bonuses: JudgeBonus[] };
  unlocked: boolean;
}

const RECORD_NAMES = { examPass: '시험 기록', award: '수상 기록', praise: '칭찬 기록', late: '지각 기록' } as const;

function signed(n: number): string {
  const v = Math.round(n * 10) / 10;
  return v > 0 ? `+${v}` : `${v}`.replace('-', '−');
}

export function checkByLabel(by: CheckBy, state?: GameState): string {
  if (by === 'club') {
    const club = state ? getClub(state.clubId) : undefined;
    return club ? `동아리(${CAREER_NAMES[club.career]})` : '동아리';
  }
  if ((STATS as readonly string[]).includes(by)) return STAT_NAMES[by as keyof typeof STAT_NAMES];
  return CAREER_NAMES[by as keyof typeof CAREER_NAMES];
}

export function describeEffects(e: Effects | undefined, state?: GameState): string[] {
  if (!e) return [];
  const out: string[] = [];
  if (e.stats) for (const s of STATS) if (e.stats[s]) out.push(`${STAT_NAMES[s]} ${signed(scaleStatGain(e.stats[s]!))}`);
  if (e.stress) out.push(`스트레스 ${signed(e.stress)}`);
  if (e.money) out.push(`돈 ${e.money > 0 ? '+' : '−'}${formatMoney(Math.abs(e.money))}`);
  if (e.career) {
    for (const key of [...CAREERS, 'club'] as const) {
      const v = e.career[key];
      if (!v) continue;
      const c = state ? resolveCareerKey(state, key) : key === 'club' ? null : key;
      out.push(`${c ? CAREER_NAMES[c] : '동아리 분야'} ${signed(v)}`);
    }
  }
  if (e.records) {
    for (const k of ['examPass', 'award', 'praise', 'late'] as const) {
      if (e.records[k]) out.push(`${RECORD_NAMES[k]} ${signed(e.records[k]!)}`);
    }
  }
  if (e.buff) {
    const id = typeof e.buff === 'string' ? e.buff : e.buff.id;
    out.push(`버프: ${getBuffDef(id)?.name ?? id}`);
  }
  if (e.debuff) out.push(`디버프: ${getBuffDef(e.debuff)?.name ?? e.debuff}`);
  if (e.flag) out.push('✨ 특별한 기회?');
  return out;
}

function requirementReason(state: GameState, r: Requirement | undefined): string | undefined {
  if (!r) return undefined;
  if (r.stats) {
    for (const s of STATS) {
      const need = r.stats[s];
      if (need != null && state.stats[s] < need) return `조건: ${STAT_NAMES[s]} ${need}`;
    }
  }
  if (r.career) {
    for (const c of CAREERS) {
      const need = r.career[c];
      if (need != null && careerLevel(state.careerExp[c]) < need) return `조건: ${CAREER_NAMES[c]} Lv${need}`;
    }
  }
  if (r.money != null && state.money < r.money) return `조건: 돈 ${formatMoney(r.money)}`;
  return undefined;
}

export function optionAvailability(state: GameState, o: ChoiceOption): { disabled: boolean; reason?: string } {
  if (o.kind === 'growth' && isGrowthLocked(state.stress)) return { disabled: true, reason: '스트레스 위험: 성장형 잠김' };
  const cost = o.effects?.money;
  if (cost != null && cost < 0 && state.money < -cost) return { disabled: true, reason: '용돈 부족' };
  const req = requirementReason(state, o.require);
  if (req) return { disabled: true, reason: req };
  return { disabled: false };
}

export function getOptionViews(state: GameState): OptionView[] {
  const p = state.pending;
  if (!p?.options) return [];
  const exam = p.source === 'exam';
  return p.options.map((o, i) => {
    const av = optionAvailability(state, o);
    let preview: string[];
    let failPreview: string[] | undefined;
    if (exam) {
      preview = [];
      if (o.judgeMod) preview.push(`판정 ${signed(o.judgeMod)}`);
      preview.push(...describeEffects(o.after, state));
    } else if (o.check) {
      preview = describeEffects(o.onSuccess, state);
      failPreview = describeEffects(o.onFail, state);
    } else {
      preview = describeEffects(o.effects, state);
    }
    if (preview.length === 0 && o.desc) preview = [o.desc];
    let judge: OptionView['judge'];
    if (o.check) {
      const armed = !!p.abilityArmed && state.traitId === 'insider';
      const plan = planJudge(state, { check: o.check, kind: o.kind, judgeMod: o.judgeMod, exam, armed });
      judge = {
        byLabel: armed ? '인맥(인싸력)' : checkByLabel(o.check.by, state),
        diff: plan.diff,
        bonus: plan.bonus,
        probability: plan.probability,
        bonuses: plan.bonuses,
      };
    }
    return { option: o, key: i + 1, ...av, preview, failPreview, judge, unlocked: !!o.unlock };
  });
}

export interface AbilityView {
  label: string;
  desc: string;
  usesLeft: number;
  available: boolean;
  armed?: boolean;
}

export function getAbilityView(state: GameState): AbilityView | null {
  const usesLeft = Math.max(0, ABILITY_USES_PER_YEAR - state.abilityUses);
  const p = state.pending;
  if (state.traitId === 'insider') {
    const armed = !!p?.abilityArmed;
    const hasCheck = state.phase === 'choice' && !!p?.options?.some((o) => o.check);
    return {
      label: '인싸력',
      desc: '이번 판정 기준을 인맥으로 바꾼다',
      usesLeft,
      available: hasCheck && (usesLeft > 0 || armed),
      armed,
    };
  }
  if (state.traitId === 'lucky') {
    return {
      label: '행운',
      desc: '대실패를 일반 실패로 바꾼다',
      usesLeft,
      available: state.phase === 'judge' && p?.judge?.outcome === 'fumble' && usesLeft > 0,
    };
  }
  return null;
}

export function getShopView(state: GameState): { item: Item; affordable: boolean; bought: number }[] {
  const p = state.pending;
  const ids = p?.shopItems ?? [];
  return content.items
    .filter((i) => ids.includes(i.id))
    .map((item) => ({
      item,
      affordable: state.money >= item.price,
      bought: (p?.bought ?? []).filter((b) => b === item.id).length,
    }));
}

export function getRouteViews(state: GameState): { route: Route; disabled: boolean; reason?: string; preview: string[] }[] {
  return content.routes.map((route) => {
    const reason = requirementReason(state, route.require);
    return { route, disabled: !!reason, reason, preview: describeEffects(route.effects, state) };
  });
}

export function describeChange(c: Change): { text: string; tone: 'good' | 'bad' | 'info' } {
  switch (c.kind) {
    case 'stat':
      return { text: `${STAT_NAMES[c.key]} ${signed(c.delta)}`, tone: c.delta > 0 ? 'good' : 'bad' };
    case 'stress':
      return { text: `스트레스 ${signed(c.delta)}`, tone: c.delta > 0 ? 'bad' : 'good' };
    case 'money':
      return { text: `돈 ${c.delta > 0 ? '+' : '−'}${formatMoney(Math.abs(c.delta))}`, tone: c.delta > 0 ? 'good' : 'bad' };
    case 'career':
      if (c.levelUp) return { text: `${CAREER_NAMES[c.key]} Lv${c.level} 달성!`, tone: 'good' };
      return { text: `${CAREER_NAMES[c.key]} 경험치 ${signed(c.delta)}`, tone: 'good' };
    case 'record':
      return { text: `${RECORD_NAMES[c.key]} ${signed(c.delta)}`, tone: c.key === 'late' ? 'bad' : 'info' };
    case 'buff': {
      const def = getBuffDef(c.id);
      const name = def ? `${def.emoji} ${def.name}` : c.id;
      if (c.debuff) return { text: c.gained ? `디버프: ${name}` : `${name} 해제`, tone: c.gained ? 'bad' : 'good' };
      return { text: c.gained ? `버프 획득: ${name}` : `${name} 종료`, tone: c.gained ? 'good' : 'info' };
    }
    case 'flag':
      return { text: '✨ 무언가 특별한 일이 생길 것 같다…', tone: 'good' };
    case 'club': {
      const club = getClub(c.id);
      return { text: `${club?.emoji ?? ''} ${club?.name ?? c.id} 부원이 됐다`, tone: 'info' };
    }
    case 'route': {
      const r = getRoute(c.id);
      return { text: `${r?.emoji ?? ''} ${r?.name ?? c.id} 배정`, tone: 'info' };
    }
    case 'note':
      return { text: c.text, tone: 'info' };
  }
}

export function activeBuffViews(
  state: GameState,
): { id: string; name: string; emoji: string; desc: string; remaining?: number; debuff: boolean }[] {
  return [...state.buffs, ...state.debuffs].map((b) => {
    const def = getBuffDef(b.id);
    let desc = def?.desc ?? '';
    if (b.id === 'practice' && b.field) desc = `${CAREER_NAMES[b.field]} 경험치 2배`;
    return {
      id: b.id,
      name: def?.name ?? b.id,
      emoji: def?.emoji ?? '✨',
      desc,
      remaining: b.remaining,
      debuff: !!def?.debuff,
    };
  });
}

export function tileInfo(index: number): BoardTile {
  return content.board[index];
}
