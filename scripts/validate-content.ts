// 콘텐츠 검사 (설계 문서 7장 "검사 규칙").
// 사용법: pnpm validate:content [content/drafts/초안.json ...]
//  - 인자 없이 실행하면 content/ 전체를 검사한다.
//  - 인자로 사건 배열 JSON(초안)을 주면 그 사건들도 같은 규칙으로 함께 검사한다.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { GameEvent } from '../src/engine/content';
import type { Text } from '../src/engine/text';
import type { Career, ChoiceOption, Effects } from '../src/engine/types';
import { DEFAULT_LOCALE, LOCALES } from '../src/i18n/config';
import { flattenMessages } from '../src/i18n/flatten';

type ContentModule = typeof import('../src/engine/content');

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'content');

const PLACE_TILES = ['commute', 'classroom', 'library', 'field'] as const;
type PlaceOnly = (typeof PLACE_TILES)[number];

/** 장소별 진로 분야 (설계 5.7) */
const ALLOWED_CAREERS: Record<PlaceOnly, Career[]> = {
  commute: ['sports', 'comm'],
  classroom: ['academic', 'comm', 'biz'],
  library: ['academic', 'arts'],
  field: ['sports', 'arts', 'biz'],
};
const TILE_NAMES: Record<string, string> = {
  commute: '등굣길',
  classroom: '교실',
  library: '도서관',
  field: '운동장',
  club: '동아리방',
};
const FLAGS = new Set(['casting', 'viral', 'contest']);
const BANNED = ['죽여', '죽어라', '자살', '살인', '폭행', '때려', '병신', '찐따', '섹시', '야동', '음주', '담배', '도박'];
const LIMIT = { text: 80, label: 20, result: 60 };
const MAX_STAT_DELTA = 20;
const MAX_MONEY_DELTA = 30000;
const YEARS = [1, 2, 3] as const;
const BASE_KINDS = ['growth', 'rest', 'adventure'] as const;

const errors: string[] = [];
const fail = (id: string, msg: string) => errors.push(`[${id}] ${msg}`);

type Bag = { name: 'effects' | 'onSuccess' | 'onFail' | 'after'; eff: Effects };

function bagsOf(o: ChoiceOption): Bag[] {
  const out: Bag[] = [];
  if (o.effects) out.push({ name: 'effects', eff: o.effects });
  if (o.onSuccess) out.push({ name: 'onSuccess', eff: o.onSuccess });
  if (o.onFail) out.push({ name: 'onFail', eff: o.onFail });
  if (o.after) out.push({ name: 'after', eff: o.after });
  return out;
}

function careerEntries(eff: Effects | undefined): [string, number][] {
  return Object.entries(eff?.career ?? {}) as [string, number][];
}

async function main() {
  // ---------- 1. Zod 스키마 (content.ts가 불러올 때 검사) ----------
  let mod: ContentModule;
  try {
    mod = await import('../src/engine/content');
  } catch (e) {
    console.error('✖ 콘텐츠 스키마(Zod) 검사 실패\n');
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
  const { content, rawEventFiles, eventSchema, CONTENT_TEXT_KO } = mod;
  /** 문장 키 → 한국어 원문 (초안 사건은 키가 아니라 글이 그대로 들어 있다) */
  const src = (v: Text | undefined): string =>
    typeof v === 'string' ? (CONTENT_TEXT_KO[v] ?? v) : v == null ? '' : JSON.stringify(v);

  const buffIds = new Set(content.buffs.map((b) => b.id));
  const clubs = new Map(content.clubs.map((c) => [c.id, c]));
  const routeIds = new Set(content.routes.map((r) => r.id));

  // ---------- 초안 파일 (선택) ----------
  const draftFiles = process.argv.slice(2).map((p) => resolve(ROOT, p));
  const drafts: GameEvent[] = [];
  for (const file of draftFiles) {
    const label = relative(ROOT, file);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      fail(label, `JSON을 읽을 수 없습니다: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const r = z.array(eventSchema).safeParse(data);
    if (!r.success) {
      fail(label, `스키마 오류\n${z.prettifyError(r.error)}`);
      continue;
    }
    drafts.push(...r.data);
  }

  const events: GameEvent[] = [...content.events, ...drafts];

  // ---------- 파일과 tile 일치 ----------
  for (const [name, data] of Object.entries(rawEventFiles)) {
    for (const ev of data as { id: string; tile: string }[]) {
      if (ev.tile !== name) fail(ev.id, `events/${name}.json에 tile "${ev.tile}" 사건이 들어 있습니다`);
    }
  }

  // ---------- 공통 효과 검사 ----------
  function checkEffectRefs(id: string, where: string, eff: Effects, limitDeltas: boolean) {
    if (limitDeltas) {
      for (const [k, v] of Object.entries(eff.stats ?? {})) {
        if (Math.abs(v as number) > MAX_STAT_DELTA) fail(id, `${where}.stats.${k} = ${v} (|변화| ≤ ${MAX_STAT_DELTA})`);
      }
      if (eff.stress !== undefined && Math.abs(eff.stress) > MAX_STAT_DELTA)
        fail(id, `${where}.stress = ${eff.stress} (|변화| ≤ ${MAX_STAT_DELTA})`);
      if (eff.money !== undefined && Math.abs(eff.money) > MAX_MONEY_DELTA)
        fail(id, `${where}.money = ${eff.money} (|변화| ≤ ${MAX_MONEY_DELTA})`);
    }
    if (eff.buff !== undefined) {
      const bid = typeof eff.buff === 'string' ? eff.buff : eff.buff.id;
      if (!buffIds.has(bid)) fail(id, `${where}.buff "${bid}"가 buffs.json에 없습니다`);
    }
    if (eff.debuff !== undefined && !buffIds.has(eff.debuff))
      fail(id, `${where}.debuff "${eff.debuff}"가 buffs.json에 없습니다`);
    if (eff.flag !== undefined && !FLAGS.has(eff.flag))
      fail(id, `${where}.flag "${eff.flag}"는 허용되지 않습니다 (${[...FLAGS].join(', ')})`);
  }

  function checkOptionText(id: string, o: ChoiceOption) {
    const label = src(o.label);
    if (label.length > LIMIT.label) fail(id, `${o.id}.label ${label.length}자 > ${LIMIT.label}자: "${label}"`);
    for (const [k, t] of Object.entries(o.resultText ?? {})) {
      const v = src(t);
      if (v && v.length > LIMIT.result) fail(id, `${o.id}.resultText.${k} ${v.length}자 > ${LIMIT.result}자: "${v}"`);
    }
  }

  function checkText(id: string, where: string, t: Text) {
    const text = src(t);
    if (text.length > LIMIT.text) fail(id, `${where} ${text.length}자 > ${LIMIT.text}자: "${text}"`);
  }

  // ---------- 2. 장소·동아리 사건 ----------
  const seenIds = new Set<string>();
  const addId = (id: string) => {
    if (seenIds.has(id)) fail(id, 'id가 중복됩니다');
    seenIds.add(id);
  };

  for (const ev of events) {
    const id = ev.id;
    addId(id);
    checkText(id, 'text', ev.text);

    const req = ev.requires;
    if (req?.clubId && !clubs.has(req.clubId)) fail(id, `requires.clubId "${req.clubId}"가 clubs.json에 없습니다`);
    if (req?.routeId && !routeIds.has(req.routeId)) fail(id, `requires.routeId "${req.routeId}"가 routes.json에 없습니다`);

    let allowed: Set<string>;
    if (ev.tile === 'club') {
      if (!req?.clubId) fail(id, '동아리 사건은 requires.clubId가 필요합니다');
      const club = req?.clubId ? clubs.get(req.clubId) : undefined;
      allowed = new Set(club ? [club.career] : []);
    } else {
      allowed = new Set(ALLOWED_CAREERS[ev.tile]);
    }
    const allowedText = [...allowed].join(', ') || '(없음)';

    // 선택지 틀
    const base = ev.options.filter((o) => !o.unlock);
    const unlocks = ev.options.filter((o) => o.unlock);
    for (const kind of BASE_KINDS) {
      const n = base.filter((o) => o.kind === kind).length;
      if (n !== 1) fail(id, `기본 선택지에 ${kind}가 ${n}개 있습니다 (정확히 1개)`);
    }
    if (base.length !== 3) fail(id, `기본 선택지(unlock 없음)가 ${base.length}개입니다 (정확히 3개)`);
    if (unlocks.length > 1) fail(id, `해금 선택지가 ${unlocks.length}개입니다 (최대 1개)`);
    const optIds = ev.options.map((o) => o.id);
    const dupOpt = optIds.filter((x, i) => optIds.indexOf(x) !== i);
    if (dupOpt.length) fail(id, `선택지 id 중복: ${[...new Set(dupOpt)].join(', ')}`);

    for (const o of ev.options) {
      const oid = o.id;
      checkOptionText(id, o);
      for (const { name, eff } of bagsOf(o)) {
        checkEffectRefs(id, `${oid}.${name}`, eff, true);
        for (const [c] of careerEntries(eff)) {
          if (!allowed.has(c))
            fail(id, `${oid}.${name}.career "${c}"는 ${TILE_NAMES[ev.tile]} 허용 분야가 아닙니다 (${allowedText})`);
        }
      }

      // 해금 조건
      if (o.unlock) {
        if ('career' in o.unlock) {
          if (!allowed.has(o.unlock.career))
            fail(id, `${oid}.unlock.career "${o.unlock.career}"는 허용 분야가 아닙니다 (${allowedText})`);
        } else {
          if (!buffIds.has(o.unlock.buff)) fail(id, `${oid}.unlock.buff "${o.unlock.buff}"가 buffs.json에 없습니다`);
          if (ev.tile !== 'classroom') fail(id, `${oid}: 버프 해금 선택지는 교실 사건에만 둘 수 있습니다`);
        }
      }

      switch (o.kind) {
        case 'growth': {
          if (o.check) fail(id, `${oid}: growth에는 check가 없어야 합니다`);
          const c = careerEntries(o.effects);
          if (c.length !== 1 || c[0][1] !== 3) fail(id, `${oid}: growth의 effects.career는 한 분야 +3이어야 합니다`);
          const s = o.effects?.stress;
          if (s === undefined || s < 5 || s > 15) fail(id, `${oid}: growth의 effects.stress는 +5~+15여야 합니다 (현재 ${s})`);
          const ups = Object.values(o.effects?.stats ?? {}).filter((v) => (v as number) >= 5 && (v as number) <= 10);
          if (!ups.length) fail(id, `${oid}: growth는 기본 능력치 하나를 +5~+10 올려야 합니다`);
          break;
        }
        case 'adventure': {
          if (!o.check) fail(id, `${oid}: adventure에는 check가 필요합니다`);
          else if (o.check.diff !== 8) fail(id, `${oid}: adventure 난이도는 8이어야 합니다 (현재 ${o.check.diff})`);
          if (careerEntries(o.effects).length) fail(id, `${oid}: adventure의 진로 경험치는 onSuccess/onFail에만 둡니다`);
          const s = careerEntries(o.onSuccess);
          const f = careerEntries(o.onFail);
          if (s.length !== 1 || s[0][1] !== 5) fail(id, `${oid}: adventure의 onSuccess.career는 한 분야 +5여야 합니다`);
          if (f.length !== 1 || f[0][1] !== 1) fail(id, `${oid}: adventure의 onFail.career는 한 분야 +1이어야 합니다`);
          else if (s.length === 1 && f[0][0] !== s[0][0])
            fail(id, `${oid}: onFail.career(${f[0][0]})가 onSuccess.career(${s[0][0]})와 다릅니다`);
          if (o.onFail?.stress !== 10) fail(id, `${oid}: adventure의 onFail.stress는 +10이어야 합니다 (현재 ${o.onFail?.stress})`);
          if (!o.resultText?.success || !o.resultText?.fail)
            fail(id, `${oid}: adventure에는 resultText.success와 resultText.fail이 필요합니다`);
          break;
        }
        case 'rest': {
          for (const { name, eff } of bagsOf(o)) {
            if (careerEntries(eff).length) fail(id, `${oid}: rest에는 진로 경험치가 없어야 합니다 (${name})`);
          }
          const e = o.effects ?? {};
          const social = (e.stats?.social ?? 0) > 0;
          const relief = e.stress !== undefined && e.stress >= -20 && e.stress <= -10;
          if (!social && !relief) fail(id, `${oid}: rest는 stats.social > 0 이거나 stress −10~−20이어야 합니다`);
          break;
        }
        default:
          fail(id, `${oid}: 사건 선택지의 kind는 growth/rest/adventure만 허용됩니다 (현재 ${o.kind})`);
      }
    }
  }

  // ---------- 3. 분량(장소 × 학년, 동아리 × 학년) ----------
  const restricted = (ev: GameEvent) =>
    Boolean(ev.requires?.routeId || ev.requires?.clubId || Object.keys(ev.requires?.minStats ?? {}).length);

  const placeTable: { tile: string; counts: string[] }[] = [];
  for (const tile of PLACE_TILES) {
    const counts: string[] = [];
    for (const y of YEARS) {
      const all = events.filter((e) => e.tile === tile && e.years.includes(y));
      const open = all.filter((e) => !restricted(e));
      if (open.length < 2) fail(`${tile}:y${y}`, `조건 없는 사건이 ${open.length}개입니다 (2개 이상 필요)`);
      counts.push(`${all.length}/${open.length}`);
    }
    placeTable.push({ tile, counts });
  }
  const clubTable: { tile: string; counts: string[] }[] = [];
  for (const club of content.clubs) {
    const counts: string[] = [];
    for (const y of YEARS) {
      const n = events.filter((e) => e.tile === 'club' && e.requires?.clubId === club.id && e.years.includes(y)).length;
      if (n < 2) fail(`club:${club.id}:y${y}`, `동아리 사건이 ${n}개입니다 (2개 이상 필요)`);
      counts.push(String(n));
    }
    clubTable.push({ tile: club.id, counts });
  }

  const refuse = events.filter(
    (e) => (e.tile === 'commute' || e.tile === 'classroom') && e.options.some((o) => o.tags?.includes('refuseFavor')),
  );
  if (refuse.length < 3)
    fail('refuseFavor', `등굣길·교실에 refuseFavor 선택지가 있는 사건이 ${refuse.length}개입니다 (3개 이상 필요)`);

  // ---------- 4. 돌발 사건 ----------
  for (const s of content.surprises) {
    addId(s.id);
    checkText(s.id, 'text', s.text);
    const label = src(s.label);
    if (label.length > LIMIT.label) fail(s.id, `label ${label.length}자 > ${LIMIT.label}자: "${label}"`);
    for (const [k, t] of Object.entries(s.resultText)) {
      const v = src(t);
      if (v.length > LIMIT.result) fail(s.id, `resultText.${k} ${v.length}자 > ${LIMIT.result}자: "${v}"`);
    }
    checkEffectRefs(s.id, 'onSuccess', s.onSuccess, true);
    checkEffectRefs(s.id, 'onFail', s.onFail, true);
  }

  // ---------- 5. 일반 칸·상담실 문장 ----------
  const generalOption = (id: string, o: ChoiceOption) => {
    checkOptionText(id, o);
    for (const { name, eff } of bagsOf(o)) checkEffectRefs(id, `${o.id}.${name}`, eff, false);
    if (o.unlock && 'buff' in o.unlock && !buffIds.has(o.unlock.buff))
      fail(id, `${o.id}.unlock.buff "${o.unlock.buff}"가 buffs.json에 없습니다`);
  };
  const { cafeteria, nurse, staffroom, counsel } = content;
  for (const out of cafeteria.outcomes) {
    checkText('cafeteria', `outcomes.${out.id}.text`, out.text);
    checkEffectRefs('cafeteria', `outcomes.${out.id}`, out.effects, false);
  }
  checkText('cafeteria', 'treat.text', cafeteria.treat.text);
  for (const o of cafeteria.treat.options) generalOption('cafeteria', o);
  checkText('nurse', 'stressRelief.text', nurse.stressRelief.text);
  checkText('nurse', 'heal.text', nurse.heal.text);
  checkText('nurse', 'quiz.text', nurse.quiz.text);
  generalOption('nurse', nurse.quiz.option);
  checkText('staffroom', 'text', staffroom.text);
  for (const [k, rule] of Object.entries(staffroom.rules)) checkText('staffroom', `rules.${k}.text`, rule.text);
  counsel.texts.forEach((t, i) => checkText('counsel', `texts[${i}]`, t));
  for (const o of counsel.options) generalOption('counsel', o);

  // ---------- 6. 금지어 (content/ 전체 + 초안) ----------
  const jsonFiles = listJson(CONTENT_DIR).concat(draftFiles.filter((f) => existsSync(f)));
  for (const file of jsonFiles) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue; // 초안 JSON 오류는 위에서 이미 보고
    }
    const rel = relative(ROOT, file);
    walkStrings(data, rel, (ctx, str) => {
      for (const w of BANNED) if (str.includes(w)) fail(ctx, `금지어 "${w}" 포함 (${rel}): "${str}"`);
    });
  }

  // ---------- 7. 번역 (content/i18n, src/i18n/messages) ----------
  checkTranslations(CONTENT_TEXT_KO, content);

  // ---------- 결과 ----------
  if (errors.length) {
    console.error(`✖ 콘텐츠 검사 실패: ${errors.length}건\n`);
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log('✔ 콘텐츠 검사 통과\n');
  console.log('장소 사건 (해당 학년 전체/조건 없음)');
  // 한글은 터미널에서 두 칸을 차지하므로 머리글은 2칸 덜 채운다.
  console.log(`  ${pad('tile', 11)}${YEARS.map((y) => pad(`${y}학년`, 7)).join('')}`);
  for (const r of placeTable) console.log(`  ${pad(r.tile, 11)}${r.counts.map((c) => pad(c, 9)).join('')}`);
  console.log('\n동아리 사건 (동아리 × 학년)');
  for (const r of clubTable) console.log(`  ${pad(r.tile, 11)}${r.counts.map((c) => pad(c, 9)).join('')}`);
  const byTile = (t: string) => events.filter((e) => e.tile === t).length;
  console.log(
    `\n사건 ${events.length}개 (${[...PLACE_TILES, 'club'].map((t) => `${t} ${byTile(t)}`).join(', ')})` +
      `${drafts.length ? `, 그중 초안 ${drafts.length}개` : ''}`,
  );
  console.log(
    `돌발 ${content.surprises.length}개, 급식실 결과 ${cafeteria.outcomes.length}개, refuseFavor 사건 ${refuse.length}개`,
  );
}

/** 번역 검사에서 빠져도 되는 자리표시자 (한국어 조사처럼 그 언어에만 필요한 것) */
const OPTIONAL_PLACEHOLDERS = new Set(['ga']);
const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const HANGUL = /[가-힣]/;

function readJsonFile(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    fail(relative(ROOT, file), `JSON을 읽을 수 없습니다: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** 한 언어의 문장표를 원문(ko)과 견준다: 키가 같고, 비어 있지 않고, 자리표시자가 맞고, 한글이 남지 않았는지 */
function compareTable(name: string, ko: Record<string, string>, tr: Record<string, string>) {
  const missing = Object.keys(ko).filter((k) => !(k in tr));
  const extra = Object.keys(tr).filter((k) => !(k in ko));
  if (missing.length) fail(name, `번역이 빠진 키 ${missing.length}개: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
  if (extra.length) fail(name, `원문에 없는 키 ${extra.length}개: ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' …' : ''}`);
  for (const [k, v] of Object.entries(tr)) {
    if (!(k in ko)) continue;
    if (typeof v !== 'string' || !v.trim()) {
      fail(name, `${k}: 비어 있습니다`);
      continue;
    }
    if (HANGUL.test(v)) fail(name, `${k}: 한글이 남아 있습니다 "${v}"`);
    const want = placeholders(ko[k]);
    const got = placeholders(v);
    for (const p of got) if (!want.has(p)) fail(name, `${k}: 원문에 없는 자리표시자 {${p}}`);
    for (const p of want) if (!got.has(p) && !OPTIONAL_PLACEHOLDERS.has(p)) fail(name, `${k}: 자리표시자 {${p}}가 빠졌습니다`);
  }
}

function checkTranslations(contentKo: Record<string, string>, content: ContentModule['content']) {
  // 콘텐츠 원문표(content/i18n/ko.json)가 지금 콘텐츠와 같은지 (다르면 pnpm i18n:extract)
  const koFile = join(CONTENT_DIR, 'i18n', 'ko.json');
  const koSaved = existsSync(koFile) ? (readJsonFile(koFile) as Record<string, string> | null) : null;
  if (!koSaved) fail('content/i18n/ko.json', '없습니다. pnpm i18n:extract로 만드세요');
  else if (JSON.stringify(koSaved) !== JSON.stringify(contentKo))
    fail('content/i18n/ko.json', '콘텐츠 문장이 바뀌었습니다. pnpm i18n:extract를 돌리고 다른 언어 번역도 고치세요');

  const koMessages = flattenMessages(readJsonFile(join(ROOT, 'src/i18n/messages/ko.json')));
  // 같은 직업 id는 어느 표에 있든 같은 이름이어야 한다
  const jobKeys = new Map<string, string[]>();
  const addJob = (id: string, key: string) => jobKeys.set(id, [...(jobKeys.get(id) ?? []), key]);
  const E = content.endings;
  for (const table of [...Object.values(E.fields), ...Object.values(E.combos)]) {
    for (const g of ['top', 'mid', 'low'] as const) for (const j of table[g]) addJob(j.id, j.name);
  }

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const cFile = join(CONTENT_DIR, 'i18n', `${locale}.json`);
    const mFile = join(ROOT, 'src/i18n/messages', `${locale}.json`);
    if (!existsSync(cFile)) fail(relative(ROOT, cFile), '번역 파일이 없습니다');
    else {
      const tr = (readJsonFile(cFile) ?? {}) as Record<string, string>;
      compareTable(relative(ROOT, cFile), contentKo, tr);
      for (const [id, keys] of jobKeys) {
        const names = new Set(keys.map((k) => tr[k]));
        if (names.size > 1) fail(relative(ROOT, cFile), `직업 ${id}의 이름이 서로 다릅니다: ${[...names].join(' / ')}`);
      }
    }
    if (!existsSync(mFile)) fail(relative(ROOT, mFile), '번역 파일이 없습니다');
    else compareTable(relative(ROOT, mFile), koMessages, flattenMessages(readJsonFile(mFile)));
  }
}

function listJson(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'drafts') continue; // 초안은 인자로 넘길 때만 검사
      out.push(...listJson(p));
    } else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

/** 모든 문자열 값을 돌며, 가장 바깥쪽 id(사건 id 등)를 맥락으로 넘긴다. */
function walkStrings(node: unknown, ctx: string, visit: (ctx: string, s: string) => void, top = true): void {
  if (typeof node === 'string') return visit(ctx, node);
  if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, ctx, visit, top);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const next = top && typeof obj.id === 'string' ? obj.id : ctx;
    const childTop = top && next === ctx;
    for (const v of Object.values(obj)) walkStrings(v, next, visit, childTop);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
