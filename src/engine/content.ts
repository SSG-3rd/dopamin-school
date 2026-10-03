// 콘텐츠 JSON 로드 + Zod 검증. 규칙(코드)과 내용(데이터)을 나눈다.
import { z } from 'zod';
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
  label: z.string().min(1),
  kind: optionKindSchema,
  tags: z.array(z.string()).optional(),
  unlock: unlockSchema.optional(),
  require: requirementSchema.optional(),
  effects: effectsSchema.optional(),
  check: checkSchema.optional(),
  onSuccess: effectsSchema.optional(),
  onFail: effectsSchema.optional(),
  resultText: z
    .strictObject({ success: z.string().optional(), fail: z.string().optional(), done: z.string().optional() })
    .optional(),
  action: z.string().optional(),
  judgeMod: int.optional(),
  after: effectsSchema.optional(),
  desc: z.string().optional(),
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
  title: z.string().min(1),
  text: z.string().min(1),
  options: z.array(optionSchema).min(3).max(4),
});
export type GameEvent = z.infer<typeof eventSchema>;

export const traitSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  desc: z.string(),
  stats: z.record(statSchema, int),
  stress: int,
  ability: z.string(),
  weakness: z.string(),
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
      name: z.string(),
      kind: z.enum(['corner', 'place', 'general']),
      type: z.enum(tileTypes),
      icon: z.string(),
    }),
  )
  .length(16);
export type BoardTile = z.infer<typeof boardSchema>[number];

const choiceScreenSchema = z.strictObject({
  title: z.string(),
  text: z.string(),
  options: z.array(optionSchema).min(1),
});

export const vacationsSchema = z.strictObject({
  summer: choiceScreenSchema,
  winter: choiceScreenSchema,
});

const examOutcomeSchema = z.strictObject({ text: z.string(), effects: effectsSchema });

export const examsSchema = z.strictObject({
  strategies: z.array(optionSchema).length(3),
  regular: z.strictObject({
    title: z.record(z.enum(['first', 'second', 'mock']), z.string()),
    text: z.string(),
    success: examOutcomeSchema,
    critical: examOutcomeSchema,
    fail: examOutcomeSchema,
  }),
  final: z.strictObject({
    title: z.string(),
    text: z.string(),
    types: z.record(careerSchema, z.strictObject({ name: z.string(), text: z.string() })),
    success: examOutcomeSchema,
    fail: examOutcomeSchema,
  }),
});

export const clubSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  career: careerSchema,
  artsKind: z.enum(['music', 'art', 'acting', 'dance']).optional(),
  bonusCareer: z.partialRecord(careerSchema, z.number()).optional(),
  emoji: z.string(),
  desc: z.string(),
});
export type Club = z.infer<typeof clubSchema>;

export const routeSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  desc: z.string(),
  require: requirementSchema.optional(),
  effects: effectsSchema,
});
export type Route = z.infer<typeof routeSchema>;

export const buffSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  desc: z.string(),
  debuff: z.boolean().optional(),
  moves: int.optional(),
  endsOn: z
    .enum(['allowance', 'exam', 'promotion', 'social_judge', 'judge'])
    .optional(),
});
export type BuffDef = z.infer<typeof buffSchema>;

export const itemSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  price: int.positive(),
  desc: z.string(),
  effects: effectsSchema,
});
export type Item = z.infer<typeof itemSchema>;

const jobSchema = z.strictObject({ id: z.string(), name: z.string() });
const gradeTableSchema = z.strictObject({
  top: z.array(jobSchema).min(1),
  mid: z.array(jobSchema).min(1),
  low: z.array(jobSchema).min(1),
});

export const endingsSchema = z.strictObject({
  fieldNames: z.record(z.string(), z.string()),
  fields: z.record(z.string(), gradeTableSchema),
  combos: z.record(z.string(), gradeTableSchema),
  miracles: z.record(
    z.enum(['casting', 'viral', 'contest']),
    z.strictObject({ id: z.string(), name: z.string(), text: z.string() }),
  ),
  rescue: z
    .array(
      z.strictObject({
        friend: z.string(),
        id: z.string(),
        name: z.string(),
        call: z.string(),
      }),
    )
    .min(1),
  explore: z.strictObject({ id: z.string(), name: z.string(), text: z.string() }),
  failScene: z.array(z.string()),
  gradeNames: z.record(z.enum(['top', 'mid', 'low']), z.string()),
  epilogue: z.strictObject({ burnout: z.string(), money: z.string() }),
});

export const surpriseSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  label: z.string(),
  check: checkSchema,
  onSuccess: effectsSchema,
  onFail: effectsSchema,
  resultText: z.strictObject({ success: z.string(), fail: z.string() }),
});
export type SurpriseEvent = z.infer<typeof surpriseSchema>;

export const cafeteriaSchema = z.strictObject({
  title: z.string(),
  outcomes: z
    .array(z.strictObject({ id: z.string(), title: z.string(), text: z.string(), effects: effectsSchema }))
    .min(1),
  treat: z.strictObject({
    minMoney: int,
    title: z.string(),
    text: z.string(),
    options: z.array(optionSchema).length(2),
  }),
});

export const counselSchema = z.strictObject({
  title: z.string(),
  texts: z.array(z.string()).min(1),
  options: z.array(optionSchema).min(3).max(4),
});

export const nurseSchema = z.strictObject({
  title: z.string(),
  stressRelief: z.strictObject({ text: z.string(), minStress: int, effects: effectsSchema }),
  heal: z.strictObject({ text: z.string(), maxStamina: int, effects: effectsSchema }),
  quiz: z.strictObject({ text: z.string(), option: optionSchema }),
});

export const staffroomSchema = z.strictObject({
  title: z.string(),
  text: z.string(),
  rules: z.strictObject({
    scholarship: z.strictObject({ text: z.string(), minStudy: int, effects: effectsSchema }),
    award: z.strictObject({ text: z.string(), effects: effectsSchema }),
    praise: z.strictObject({ text: z.string(), effects: effectsSchema }),
    late: z.strictObject({ text: z.string(), minLate: int, effects: effectsSchema }),
    none: z.strictObject({ text: z.string(), effects: effectsSchema }),
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
    events.push(...parse(z.array(eventSchema), data, `events/${name}.json`));
  }
  return {
    traits: parse(z.array(traitSchema).length(5), traitsJson, 'traits.json'),
    board: parse(boardSchema, boardJson, 'board.json'),
    vacations: parse(vacationsSchema, vacationsJson, 'vacations.json'),
    exams: parse(examsSchema, examsJson, 'exams.json'),
    clubs: parse(z.array(clubSchema).min(1), clubsJson, 'clubs.json'),
    routes: parse(z.array(routeSchema).min(1), routesJson, 'routes.json'),
    buffs: parse(z.array(buffSchema).min(1), buffsJson, 'buffs.json'),
    items: parse(z.array(itemSchema).min(1), itemsJson, 'items.json'),
    endings: parse(endingsSchema, endingsJson, 'endings.json'),
    events,
    surprises: parse(z.array(surpriseSchema).min(1), surpriseJson, 'events/surprise.json'),
    cafeteria: parse(cafeteriaSchema, cafeteriaJson, 'events/cafeteria.json'),
    counsel: parse(counselSchema, counselJson, 'events/counsel.json'),
    nurse: parse(nurseSchema, nurseJson, 'events/nurse.json'),
    staffroom: parse(staffroomSchema, staffroomJson, 'events/staffroom.json'),
  };
}

export type Content = ReturnType<typeof loadContent>;
export const content: Content = loadContent();

// ---------- 조회 도우미 ----------
export const STAT_NAMES: Record<Stat, string> = {
  study: '학업',
  stamina: '체력',
  social: '인맥',
  luck: '운',
};
export const STAT_ICONS: Record<Stat, string> = {
  study: '📚',
  stamina: '💪',
  social: '🤝',
  luck: '🍀',
};
export const CAREER_NAMES: Record<Career, string> = {
  academic: '학문',
  sports: '운동',
  arts: '예술',
  comm: '소통',
  biz: '경영',
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

export function jobName(id: string): string {
  return allJobs().find((j) => j.id === id)?.name ?? id;
}

export function trackName(track: string): string {
  if (track.startsWith('combo:')) {
    const [a, b] = track.slice(6).split('+') as Career[];
    return `${CAREER_NAMES[a]} + ${CAREER_NAMES[b]}`;
  }
  return content.endings.fieldNames[track] ?? track;
}

export type { ChoiceOption, Effects };
