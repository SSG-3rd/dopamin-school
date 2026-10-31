// 콘텐츠 JSON 로드 + Zod 검증. 규칙(코드)과 내용(데이터)을 나눈다.
import { z } from 'zod';
import type { MessageKey } from '@/i18n/keys';
import { keyTexts, text, textRequired } from './content-text';
import { lit, tx, type Text } from './text';
import { CAREERS, STATS } from './types';
import type { Career, ChoiceOption, Effects, Stat } from './types';

import traitsJson from '../../content/traits.json';
import boardJson from '../../content/board.json';
import vacationsJson from '../../content/vacations.json';
import examsJson from '../../content/exams.json';
import clubsJson from '../../content/clubs.json';
import routesJson from '../../content/routes.json';
import buffsJson from '../../content/buffs.json';
import itemsJson from '../../content/items.json';
import endingsJson from '../../content/endings.json';
import commuteJson from '../../content/events/commute.json';
import classroomJson from '../../content/events/classroom.json';
import libraryJson from '../../content/events/library.json';
import fieldJson from '../../content/events/field.json';
import clubEventsJson from '../../content/events/club.json';
import counselJson from '../../content/events/counsel.json';
import surpriseJson from '../../content/events/surprise.json';
import cafeteriaJson from '../../content/events/cafeteria.json';
import nurseJson from '../../content/events/nurse.json';
import staffroomJson from '../../content/events/staffroom.json';

// ---------- 공통 스키마 ----------
export const statSchema = z.enum(STATS);
export const careerSchema = z.enum(CAREERS);
export const checkBySchema = z.union([statSchema, careerSchema, z.literal('club')]);
export const optionKindSchema = z.enum(['growth', 'rest', 'adventure', 'special']);

const int = z.number().int();

export const effectsSchema = z.strictObject({
  stats: z.partialRecord(statSchema, int).optional(),
  stress: int.optional(),
  money: int.optional(),
  career: z.partialRecord(z.union([careerSchema, z.literal('club')]), z.number()).optional(),
  records: z
    .partialRecord(z.enum(['examPass', 'award', 'praise', 'late']), int)
    .optional(),
  buff: z.union([z.string(), z.strictObject({ id: z.string(), field: careerSchema })]).optional(),
  debuff: z.string().optional(),
  flag: z.string().optional(),
});

export const checkSchema = z.strictObject({ by: checkBySchema, diff: int.min(2).max(13) });

export const unlockSchema = z.union([
  z.strictObject({ career: careerSchema, level: int.min(1).max(5) }),
  z.strictObject({ buff: z.string() }),
]);

export const requirementSchema = z.strictObject({
  stats: z.partialRecord(statSchema, int).optional(),
  career: z.partialRecord(careerSchema, int).optional(),
  money: int.optional(),
});

export const optionSchema = z.strictObject({
  id: z.string().min(1),
  label: textRequired(),
  kind: optionKindSchema,
  tags: z.array(z.string()).optional(),
  unlock: unlockSchema.optional(),
  require: requirementSchema.optional(),
  effects: effectsSchema.optional(),
  check: checkSchema.optional(),
  onSuccess: effectsSchema.optional(),
  onFail: effectsSchema.optional(),
  resultText: z
    .strictObject({ success: text().optional(), fail: text().optional(), done: text().optional() })
    .optional(),
  action: z.string().optional(),
  judgeMod: int.optional(),
  after: effectsSchema.optional(),
  desc: text().optional(),
});

export const placeTiles = ['commute', 'classroom', 'library', 'field', 'club'] as const;
export type PlaceTile = (typeof placeTiles)[number];

export const eventSchema = z.strictObject({
  id: z.string().min(1),
  tile: z.enum(placeTiles),
  years: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])).min(1),
  requires: z
    .strictObject({
      routeId: z.string().nullable().optional(),
      clubId: z.string().nullable().optional(),
      minStats: z.partialRecord(statSchema, int).optional(),
    })
    .optional(),
  title: textRequired(),
  text: textRequired(),
  options: z.array(optionSchema).min(3).max(4),
});
export type GameEvent = z.infer<typeof eventSchema>;

export const traitSchema = z.strictObject({
  id: z.string(),
  name: text(),
  emoji: z.string(),
  desc: text(),
  stats: z.record(statSchema, int),
  stress: int,
  ability: text(),
  weakness: text(),
  activeAbility: z.boolean(),
});
export type Trait = z.infer<typeof traitSchema>;

export const tileTypes = [
  'promotion',
  'commute',
  'cafeteria',
  'classroom',
  'exam',
  'surprise',
  'library',
  'nurse',
  'summer',
  'club',
  'field',
  'counsel',
  'staffroom',
] as const;
export type TileType = (typeof tileTypes)[number];

export const boardSchema = z
  .array(
    z.strictObject({
      index: int.min(0).max(15),
      name: text(),
      kind: z.enum(['corner', 'place', 'general']),
      type: z.enum(tileTypes),
      icon: z.string(),
    }),
  )
  .length(16);
export type BoardTile = z.infer<typeof boardSchema>[number];

const choiceScreenSchema = z.strictObject({
  title: text(),
  text: text(),
  options: z.array(optionSchema).min(1),
});

export const vacationsSchema = z.strictObject({
  summer: choiceScreenSchema,
  winter: choiceScreenSchema,
});

const examOutcomeSchema = z.strictObject({ text: text(), effects: effectsSchema });

export const examsSchema = z.strictObject({
  strategies: z.array(optionSchema).length(3),
  regular: z.strictObject({
    title: z.record(z.enum(['first', 'second', 'mock']), text()),
    text: text(),
    success: examOutcomeSchema,
    critical: examOutcomeSchema,
    fail: examOutcomeSchema,
  }),
  final: z.strictObject({
    title: text(),
    text: text(),
    types: z.record(careerSchema, z.strictObject({ name: text(), text: text() })),
    success: examOutcomeSchema,
    fail: examOutcomeSchema,
  }),
});

export const clubSchema = z.strictObject({
  id: z.string(),
  name: text(),
  career: careerSchema,
  artsKind: z.enum(['music', 'art', 'acting', 'dance']).optional(),
  bonusCareer: z.partialRecord(careerSchema, z.number()).optional(),
  emoji: z.string(),
  desc: text(),
});
export type Club = z.infer<typeof clubSchema>;

export const routeSchema = z.strictObject({
  id: z.string(),
  name: text(),
  emoji: z.string(),
  desc: text(),
  require: requirementSchema.optional(),
  effects: effectsSchema,
});
export type Route = z.infer<typeof routeSchema>;

export const buffSchema = z.strictObject({
  id: z.string(),
  name: text(),
  emoji: z.string(),
  desc: text(),
  debuff: z.boolean().optional(),
  moves: int.optional(),
  endsOn: z
    .enum(['allowance', 'exam', 'promotion', 'social_judge', 'judge'])
    .optional(),
});
export type BuffDef = z.infer<typeof buffSchema>;

export const itemSchema = z.strictObject({
  id: z.string(),
  name: text(),
  emoji: z.string(),
  price: int.positive(),
  desc: text(),
  effects: effectsSchema,
});
export type Item = z.infer<typeof itemSchema>;

const jobSchema = z.strictObject({ id: z.string(), name: text() });
const gradeTableSchema = z.strictObject({
  top: z.array(jobSchema).min(1),
  mid: z.array(jobSchema).min(1),
  low: z.array(jobSchema).min(1),
});

export const endingsSchema = z.strictObject({
  fieldNames: z.record(z.string(), text()),
  fields: z.record(z.string(), gradeTableSchema),
  combos: z.record(z.string(), gradeTableSchema),
  miracles: z.record(
    z.enum(['casting', 'viral', 'contest']),
    z.strictObject({ id: z.string(), name: text(), text: text() }),
  ),
  rescue: z
    .array(
      z.strictObject({
        friend: text(),
        id: z.string(),
        name: text(),
        call: text(),
      }),
    )
    .min(1),
  explore: z.strictObject({ id: z.string(), name: text(), text: text() }),
  failScene: z.array(text()),
  gradeNames: z.record(z.enum(['top', 'mid', 'low']), text()),
  epilogue: z.strictObject({ burnout: text(), money: text() }),
});

export const surpriseSchema = z.strictObject({
  id: z.string(),
  title: text(),
  text: text(),
  label: text(),
  check: checkSchema,
  onSuccess: effectsSchema,
  onFail: effectsSchema,
  resultText: z.strictObject({ success: text(), fail: text() }),
});
export type SurpriseEvent = z.infer<typeof surpriseSchema>;

export const cafeteriaSchema = z.strictObject({
  title: text(),
  outcomes: z
    .array(z.strictObject({ id: z.string(), title: text(), text: text(), effects: effectsSchema }))
    .min(1),
  treat: z.strictObject({
    minMoney: int,
    title: text(),
    text: text(),
    options: z.array(optionSchema).length(2),
  }),
});

export const counselSchema = z.strictObject({
  title: text(),
  texts: z.array(text()).min(1),
  options: z.array(optionSchema).min(3).max(4),
});

export const nurseSchema = z.strictObject({
  title: text(),
  stressRelief: z.strictObject({ text: text(), minStress: int, effects: effectsSchema }),
  heal: z.strictObject({ text: text(), maxStamina: int, effects: effectsSchema }),
  quiz: z.strictObject({ text: text(), option: optionSchema }),
});

export const staffroomSchema = z.strictObject({
  title: text(),
  text: text(),
  rules: z.strictObject({
    scholarship: z.strictObject({ text: text(), minStudy: int, effects: effectsSchema }),
    award: z.strictObject({ text: text(), effects: effectsSchema }),
    praise: z.strictObject({ text: text(), effects: effectsSchema }),
    late: z.strictObject({ text: text(), minLate: int, effects: effectsSchema }),
    none: z.strictObject({ text: text(), effects: effectsSchema }),
  }),
});

// ---------- 로드 ----------
function parse<T>(schema: z.ZodType<T>, data: unknown, name: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error(`[content] ${name}: ${z.prettifyError(r.error)}`);
  }
  return r.data;
}

/**
 * 한국어 원문: 문장 키 → 글. 엔진이 쓰는 content의 문장 칸에는 글 대신 이 키가 들어 있다.
 * 다른 언어는 content/i18n/<언어>.json에 같은 키로 있다.
 */
export const CONTENT_TEXT_KO: Record<string, string> = {};

/** 검증하고, 문장 칸을 키로 바꾼다 (ns: 키 앞에 붙는 묶음 이름) */
function load<T>(schema: z.ZodType<T>, data: unknown, name: string, ns: string): T {
  return keyTexts(schema, parse(schema, data, name), ns, CONTENT_TEXT_KO);
}

export const rawEventFiles = {
  commute: commuteJson,
  classroom: classroomJson,
  library: libraryJson,
  field: fieldJson,
  club: clubEventsJson,
} as const;

function loadContent() {
  const events: GameEvent[] = [];
  for (const [name, data] of Object.entries(rawEventFiles)) {
    // 장소 사건은 파일이 달라도 한 묶음('events')이다. id가 겹치면 키가 겹쳐 실패한다.
    events.push(...load(z.array(eventSchema), data, `events/${name}.json`, 'events'));
  }
  return {
    traits: load(z.array(traitSchema).length(5), traitsJson, 'traits.json', 'traits'),
    board: load(boardSchema, boardJson, 'board.json', 'board'),
    vacations: load(vacationsSchema, vacationsJson, 'vacations.json', 'vacations'),
    exams: load(examsSchema, examsJson, 'exams.json', 'exams'),
    clubs: load(z.array(clubSchema).min(1), clubsJson, 'clubs.json', 'clubs'),
    routes: load(z.array(routeSchema).min(1), routesJson, 'routes.json', 'routes'),
    buffs: load(z.array(buffSchema).min(1), buffsJson, 'buffs.json', 'buffs'),
    items: load(z.array(itemSchema).min(1), itemsJson, 'items.json', 'items'),
    endings: load(endingsSchema, endingsJson, 'endings.json', 'endings'),
    events,
    surprises: load(z.array(surpriseSchema).min(1), surpriseJson, 'events/surprise.json', 'surprise'),
    cafeteria: load(cafeteriaSchema, cafeteriaJson, 'events/cafeteria.json', 'cafeteria'),
    counsel: load(counselSchema, counselJson, 'events/counsel.json', 'counsel'),
    nurse: load(nurseSchema, nurseJson, 'events/nurse.json', 'nurse'),
    staffroom: load(staffroomSchema, staffroomJson, 'events/staffroom.json', 'staffroom'),
  };
}

export type Content = ReturnType<typeof loadContent>;
/** 게임 데이터. 문장 칸에는 글 대신 문장 키가 들어 있다 (화면에서 text()로 바꿔 그린다). */
export const content: Content = loadContent();

// ---------- 조회 도우미 ----------
/** 능력치 이름 (메시지 키) */
export const STAT_TEXT: Record<Stat, MessageKey> = {
  study: 'stat.study',
  stamina: 'stat.stamina',
  social: 'stat.social',
  luck: 'stat.luck',
};
export const STAT_ICONS: Record<Stat, string> = {
  study: '📚',
  stamina: '💪',
  social: '🤝',
  luck: '🍀',
};
/** 진로 분야 이름 (메시지 키) */
export const CAREER_TEXT: Record<Career, MessageKey> = {
  academic: 'career.academic',
  sports: 'career.sports',
  arts: 'career.arts',
  comm: 'career.comm',
  biz: 'career.biz',
};
export const CAREER_ICONS: Record<Career, string> = {
  academic: '🔬',
  sports: '⚽',
  arts: '🎨',
  comm: '🎤',
  biz: '💼',
};

export function getTrait(id: string): Trait {
  const t = content.traits.find((x) => x.id === id);
  if (!t) throw new Error(`unknown trait ${id}`);
  return t;
}
export function findTrait(id: string): Trait | undefined {
  return content.traits.find((x) => x.id === id);
}
export function getClub(id: string | null | undefined): Club | undefined {
  return id ? content.clubs.find((c) => c.id === id) : undefined;
}
export function getRoute(id: string | null | undefined): Route | undefined {
  return id ? content.routes.find((r) => r.id === id) : undefined;
}
export function getBuffDef(id: string): BuffDef | undefined {
  return content.buffs.find((b) => b.id === id);
}
export function getItem(id: string): Item | undefined {
  return content.items.find((i) => i.id === id);
}
export function getEvent(id: string): GameEvent | undefined {
  return content.events.find((e) => e.id === id);
}

export interface JobInfo {
  id: string;
  /** 문장 키 */
  name: string;
  track: string;
  grade?: 'top' | 'mid' | 'low';
  special?: 'miracle' | 'rescue' | 'explore';
}

/** 도감·통계용 전체 직업 목록 (id 중복 제거) */
export function allJobs(): JobInfo[] {
  const seen = new Map<string, JobInfo>();
  const e = content.endings;
  const add = (j: JobInfo) => {
    if (!seen.has(j.id)) seen.set(j.id, j);
  };
  for (const [track, table] of Object.entries(e.fields)) {
    for (const g of ['top', 'mid', 'low'] as const) for (const j of table[g]) add({ ...j, track, grade: g });
  }
  for (const [track, table] of Object.entries(e.combos)) {
    for (const g of ['top', 'mid', 'low'] as const)
      for (const j of table[g]) add({ ...j, track: `combo:${track}`, grade: g });
  }
  for (const m of Object.values(e.miracles)) add({ id: m.id, name: m.name, track: 'miracle', special: 'miracle' });
  for (const r of e.rescue) add({ id: r.id, name: r.name, track: 'rescue', special: 'rescue' });
  add({ id: e.explore.id, name: e.explore.name, track: 'explore', special: 'explore' });
  return [...seen.values()];
}

export function jobName(id: string): Text {
  return allJobs().find((j) => j.id === id)?.name ?? lit(id);
}

export function trackName(track: string): Text {
  if (track.startsWith('combo:')) {
    const [a, b] = track.slice(6).split('+') as Career[];
    return tx('career.combo', { a: CAREER_TEXT[a], b: CAREER_TEXT[b] });
  }
  return content.endings.fieldNames[track] ?? lit(track);
}

export type { ChoiceOption, Effects };
