// 화면용 조회 함수. 상태를 바꾸지 않는다.
import {
  CAREER_TEXT,
  STAT_TEXT,
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
import { ABILITY_USES_PER_YEAR, careerLevel, isGrowthLocked, scaleStatGain } from './rules';
import { lit, money, signed, tx, type Text } from './text';
import type {
  Change,
  CheckBy,
  ChoiceOption,
  Effects,
  GameState,
  JudgeBonus,
  RecordKey,
  Requirement,
} from './types';
import { CAREERS, STATS } from './types';

export type Tone = 'good' | 'bad' | 'info';

/** 효과 미리보기 한 줄 ("학업 +7", "스트레스 +15")과 그 좋고 나쁨 */
export interface EffectLine {
  text: Text;
  tone: Tone;
}

export interface OptionView {
  option: ChoiceOption;
  key: number;
  disabled: boolean;
  reason?: Text;
  preview: EffectLine[];
  failPreview?: EffectLine[];
  judge?: { byLabel: Text; diff: number; bonus: number; probability: number; bonuses: JudgeBonus[] };
  unlocked: boolean;
}

export const RECORD_TEXT = {
  examPass: 'record.examPass',
  award: 'record.award',
  praise: 'record.praise',
  late: 'record.late',
} as const satisfies Record<RecordKey, string>;

const up = (n: number): Tone => (n > 0 ? 'good' : 'bad');
const down = (n: number): Tone => (n > 0 ? 'bad' : 'good');

function moneyLine(delta: number): Text {
  return tx('fx.money', { sign: lit(delta > 0 ? '+' : '−'), money: money(Math.abs(delta)) });
}

export function checkByLabel(by: CheckBy, state?: GameState): Text {
  if (by === 'club') {
    const club = state ? getClub(state.clubId) : undefined;
    return club ? tx('view.clubBy', { career: CAREER_TEXT[club.career] }) : tx('view.club');
  }
  if ((STATS as readonly string[]).includes(by)) return STAT_TEXT[by as keyof typeof STAT_TEXT];
  return CAREER_TEXT[by as keyof typeof CAREER_TEXT];
}

export function describeEffects(e: Effects | undefined, state?: GameState): EffectLine[] {
  if (!e) return [];
  const out: EffectLine[] = [];
  if (e.stats) {
    for (const s of STATS) {
      const v = e.stats[s];
      if (v) out.push({ text: tx('fx.stat', { stat: STAT_TEXT[s], delta: signed(scaleStatGain(v)) }), tone: up(v) });
    }
  }
  if (e.stress) out.push({ text: tx('fx.stress', { delta: signed(e.stress) }), tone: down(e.stress) });
  if (e.money) out.push({ text: moneyLine(e.money), tone: up(e.money) });
  if (e.career) {
    for (const key of [...CAREERS, 'club'] as const) {
      const v = e.career[key];
      if (!v) continue;
      const c = state ? resolveCareerKey(state, key) : key === 'club' ? null : key;
      out.push({ text: tx('fx.career', { career: c ? CAREER_TEXT[c] : 'fx.clubField', delta: signed(v) }), tone: up(v) });
    }
  }
  if (e.records) {
    for (const k of ['examPass', 'award', 'praise', 'late'] as const) {
      const v = e.records[k];
      if (v) out.push({ text: tx('fx.record', { record: RECORD_TEXT[k], delta: signed(v) }), tone: k === 'late' ? down(v) : up(v) });
    }
  }
  if (e.buff) {
    const id = typeof e.buff === 'string' ? e.buff : e.buff.id;
    out.push({ text: tx('fx.buff', { name: getBuffDef(id)?.name ?? lit(id) }), tone: 'good' });
  }
  if (e.debuff) out.push({ text: tx('fx.debuff', { name: getBuffDef(e.debuff)?.name ?? lit(e.debuff) }), tone: 'bad' });
  if (e.flag) out.push({ text: tx('fx.flag'), tone: 'good' });
  return out;
}

function requirementReason(state: GameState, r: Requirement | undefined): Text | undefined {
  if (!r) return undefined;
  if (r.stats) {
    for (const s of STATS) {
      const need = r.stats[s];
      if (need != null && state.stats[s] < need) return tx('view.req.stat', { stat: STAT_TEXT[s], need });
    }
  }
  if (r.career) {
    for (const c of CAREERS) {
      const need = r.career[c];
      if (need != null && careerLevel(state.careerExp[c]) < need) return tx('view.req.career', { career: CAREER_TEXT[c], need });
    }
  }
  if (r.money != null && state.money < r.money) return tx('view.req.money', { money: money(r.money) });
  return undefined;
}

export function optionAvailability(state: GameState, o: ChoiceOption): { disabled: boolean; reason?: Text } {
  if (o.kind === 'growth' && isGrowthLocked(state.stress)) return { disabled: true, reason: tx('view.locked.growth') };
  const cost = o.effects?.money;
  if (cost != null && cost < 0 && state.money < -cost) return { disabled: true, reason: tx('view.locked.money') };
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
    let preview: EffectLine[];
    let failPreview: EffectLine[] | undefined;
    if (exam) {
      preview = [];
      if (o.judgeMod) preview.push({ text: tx('view.judgeMod', { delta: signed(o.judgeMod) }), tone: up(o.judgeMod) });
      preview.push(...describeEffects(o.after, state));
    } else if (o.check) {
      preview = describeEffects(o.onSuccess, state);
      failPreview = describeEffects(o.onFail, state);
    } else {
      preview = describeEffects(o.effects, state);
    }
    if (preview.length === 0 && o.desc) preview = [{ text: o.desc, tone: 'info' }];
    let judge: OptionView['judge'];
    if (o.check) {
      const armed = !!p.abilityArmed && state.traitId === 'insider';
      const plan = planJudge(state, { check: o.check, kind: o.kind, judgeMod: o.judgeMod, exam, armed });
      judge = {
        byLabel: armed ? tx('view.byInsider') : checkByLabel(o.check.by, state),
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
  label: Text;
  desc: Text;
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
      label: tx('ability.insider.label'),
      desc: tx('ability.insider.desc'),
      usesLeft,
      available: hasCheck && (usesLeft > 0 || armed),
      armed,
    };
  }
  if (state.traitId === 'lucky') {
    return {
      label: tx('ability.lucky.label'),
      desc: tx('ability.lucky.desc'),
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

export function getRouteViews(state: GameState): { route: Route; disabled: boolean; reason?: Text; preview: EffectLine[] }[] {
  return content.routes.map((route) => {
    const reason = requirementReason(state, route.require);
    return { route, disabled: !!reason, reason, preview: describeEffects(route.effects, state) };
  });
}

export function describeChange(c: Change): EffectLine {
  switch (c.kind) {
    case 'stat':
      return { text: tx('fx.stat', { stat: STAT_TEXT[c.key], delta: signed(c.delta) }), tone: up(c.delta) };
    case 'stress':
      return { text: tx('fx.stress', { delta: signed(c.delta) }), tone: down(c.delta) };
    case 'money':
      return { text: moneyLine(c.delta), tone: up(c.delta) };
    case 'career':
      if (c.levelUp) return { text: tx('change.levelUp', { career: CAREER_TEXT[c.key], level: c.level }), tone: 'good' };
      return { text: tx('change.careerExp', { career: CAREER_TEXT[c.key], delta: signed(c.delta) }), tone: 'good' };
    case 'record':
      return { text: tx('fx.record', { record: RECORD_TEXT[c.key], delta: signed(c.delta) }), tone: c.key === 'late' ? 'bad' : 'info' };
    case 'buff': {
      const def = getBuffDef(c.id);
      const name = def ? tx('fmt.iconName', { icon: lit(def.emoji), name: def.name }) : lit(c.id);
      if (c.debuff) return { text: tx(c.gained ? 'change.debuffGained' : 'change.debuffEnded', { name }), tone: c.gained ? 'bad' : 'good' };
      return { text: tx(c.gained ? 'change.buffGained' : 'change.buffEnded', { name }), tone: c.gained ? 'good' : 'info' };
    }
    case 'flag':
      return { text: tx('change.flag'), tone: 'good' };
    case 'club': {
      const club = getClub(c.id);
      return { text: tx('change.club', { emoji: lit(club?.emoji ?? ''), name: club?.name ?? lit(c.id) }), tone: 'info' };
    }
    case 'route': {
      const r = getRoute(c.id);
      return { text: tx('change.route', { emoji: lit(r?.emoji ?? ''), name: r?.name ?? lit(c.id) }), tone: 'info' };
    }
    case 'note':
      return { text: c.text, tone: 'info' };
  }
}

export function activeBuffViews(
  state: GameState,
): { id: string; name: Text; emoji: string; desc: Text; remaining?: number; debuff: boolean }[] {
  return [...state.buffs, ...state.debuffs].map((b) => {
    const def = getBuffDef(b.id);
    let desc: Text = def?.desc ?? '';
    if (b.id === 'practice' && b.field) desc = tx('view.practiceDesc', { career: CAREER_TEXT[b.field] });
    return {
      id: b.id,
      name: def?.name ?? lit(b.id),
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
