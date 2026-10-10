import { describe, expect, it } from 'vitest';
import { playToEnd } from '@/engine/autoplay';
import { addBuff, applyStat, applyStress, addCareerExp } from '@/engine/effects';
import { buildCandidates, graduationBonuses } from '@/engine/ending';
import { reduce } from '@/engine/reducer';
import { createRng } from '@/engine/rng';
import {
  GRADE_MID,
  GRADE_TOP,
  careerBonus,
  careerLevel,
  statBonus,
  scaleStatGain,
  stressJudgeMod,
  successProbability,
  tileGridPos,
} from '@/engine/rules';
import { newGame } from '@/engine/state';
import type { Action, GameState } from '@/engine/types';
import { getOptionViews } from '@/engine/view';
import { content } from '@/engine/content';

function started(traitId = 'effort', seed = 42): GameState {
  let s = newGame(seed, 0);
  s = reduce(s, { type: 'SELECT_TRAIT', traitId }).state;
  return s;
}

function run(s: GameState, actions: Action[]): GameState {
  for (const a of actions) {
    const r = reduce(s, a);
    if (r.error) throw new Error(`${a.type}: ${r.error}`);
    s = r.state;
  }
  return s;
}

describe('rng', () => {
  it('같은 시드는 같은 수열', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });
  it('d6는 1~6', () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 600; i++) seen.add(r.d6());
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('보정표', () => {
  it('기본 능력치 보정', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map(statBonus)).toEqual([-1, -1, 0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('진로 레벨', () => {
    expect([0, 5.9, 6, 13, 14, 24, 34, 46, 99].map(careerLevel)).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 5]);
    expect([0, 1, 2, 3, 4, 5].map(careerBonus)).toEqual([0, 1, 1, 2, 2, 3]);
  });
  it('판정 확률: 보정 0, 난이도 8 → 15/36', () => {
    expect(successProbability(0, 8)).toBeCloseTo(15 / 36);
    // 12는 항상 성공, 2는 항상 실패
    expect(successProbability(-20, 8)).toBeCloseTo(1 / 36);
    expect(successProbability(20, 8)).toBeCloseTo(35 / 36);
  });
  it('스트레스 보정', () => {
    expect(stressJudgeMod(10, 'adventure')).toBe(1);
    expect(stressJudgeMod(10, 'growth')).toBe(0);
    expect(stressJudgeMod(45, 'adventure')).toBe(0);
    expect(stressJudgeMod(65, 'rest')).toBe(-1);
  });
  it('보드 격자: 코너 위치', () => {
    expect(tileGridPos(0)).toEqual({ row: 5, col: 5 });
    expect(tileGridPos(4)).toEqual({ row: 5, col: 1 });
    expect(tileGridPos(8)).toEqual({ row: 1, col: 1 });
    expect(tileGridPos(12)).toEqual({ row: 1, col: 5 });
    expect(tileGridPos(15)).toEqual({ row: 4, col: 5 });
  });
});

describe('성장 제한', () => {
  it('상승량은 0.7배(반올림, 최소 1)', () => {
    expect([10, 8, 5, 3, 1, 15].map(scaleStatGain)).toEqual([7, 6, 4, 2, 1, 11]);
    expect(scaleStatGain(-10)).toBe(-10);
    const s = started('effort');
    s.stats.stamina = 40;
    applyStat(s, 'stamina', 10, []);
    expect(s.stats.stamina).toBe(47);
    applyStat(s, 'stamina', -10, []);
    expect(s.stats.stamina).toBe(37);
  });
  it('80 초과에서는 상승량 절반(최소 1), 0~100으로 자름', () => {
    const s = started('effort');
    s.stats.stamina = 85;
    applyStat(s, 'stamina', 10, []);
    expect(s.stats.stamina).toBe(89);
    s.stats.stamina = 99;
    applyStat(s, 'stamina', 10, []);
    expect(s.stats.stamina).toBe(100);
    applyStat(s, 'luck', -200, []);
    expect(s.stats.luck).toBe(0);
  });
  it('재능형 학업 상승량 −5 (최소 1)', () => {
    const s = started('talent');
    const before = s.stats.study;
    applyStat(s, 'study', 10, []);
    expect(s.stats.study).toBe(before + 4);
    applyStat(s, 'study', 3, []);
    expect(s.stats.study).toBe(before + 5);
  });
  it('운동형 스트레스 증가 −5, 충전 완료면 오르지 않음', () => {
    const s = started('athlete');
    s.stress = 20;
    applyStress(s, 15, []);
    expect(s.stress).toBe(30);
    addBuff(s, 'recharged', []);
    applyStress(s, 15, []);
    expect(s.stress).toBe(30);
  });
  it('위험 단계 휴식형 스트레스 감소 2배, 100이면 번아웃 대기', () => {
    const s = started('effort');
    s.stress = 85;
    applyStress(s, -10, [], 'rest');
    expect(s.stress).toBe(65);
    applyStress(s, 50, []);
    expect(s.stress).toBe(100);
    expect(s.burnoutPending).toBe(true);
  });
  it('진로 경험치 배율: 동아리 ×1.5, 연습벌레 ×2', () => {
    const s = started('effort');
    s.clubId = 'band';
    addCareerExp(s, 'arts', 4, []);
    expect(s.careerExp.arts).toBe(6);
    addBuff(s, { id: 'practice', field: 'arts' }, []);
    addCareerExp(s, 'arts', 4, []);
    expect(s.careerExp.arts).toBe(18);
  });
});

describe('버프', () => {
  it('최대 3개, 가장 오래된 것부터 밀려남, 같은 버프는 갱신', () => {
    const s = started();
    addBuff(s, 'part_timer', []);
    addBuff(s, 'prestudy', []);
    addBuff(s, 'travel', []);
    addBuff(s, 'part_timer', []); // 갱신: 가장 최근이 됨
    addBuff(s, 'energy_drink', []); // prestudy가 밀려남
    expect(s.buffs.map((b) => b.id).sort()).toEqual(['energy_drink', 'part_timer', 'travel']);
    addBuff(s, 'allnighter', []);
    expect(s.debuffs.map((b) => b.id)).toEqual(['allnighter']);
    expect(s.buffs.length).toBe(3);
  });
});

describe('진행', () => {
  it('성향 선택 → 입학 주사위 → 이동 대기', () => {
    let s = started('lucky', 3);
    expect(s.phase).toBe('enroll_roll');
    expect(s.money).toBe(10000);
    s = run(s, [{ type: 'ROLL_ENROLL' }]);
    if (s.phase === 'enroll_roll') s = run(s, [{ type: 'ENROLL_PICK_STAT', stat: 'luck' }]);
    expect(s.phase).toBe('result');
    s = run(s, [{ type: 'CONTINUE' }]);
    expect(s.phase).toBe('await_roll');
  });

  it('이동은 코너에서 남은 눈과 관계없이 멈춘다', () => {
    let s = started('effort', 9);
    s = { ...s, phase: 'await_roll', pending: undefined, position: 3 };
    // 3에서 출발하면 어떤 눈이든 4(코너)에서 멈춘다
    s = run(s, [{ type: 'ROLL_MOVE' }, { type: 'STEP_DONE' }]);
    expect(s.position).toBe(4);
    expect(s.phase).toBe('choice');
    expect(s.pending?.source).toBe('exam');
  });

  it('잘못된 액션은 상태를 바꾸지 않는다', () => {
    const s = started();
    const r = reduce(s, { type: 'ROLL_MOVE' });
    expect(r.error).toBeTruthy();
    expect(r.state).toBe(s);
  });

  it('같은 시드와 같은 액션이면 같은 결과', () => {
    const a = playToEnd(777);
    const b = playToEnd(777);
    expect(a.state.ending).toEqual(b.state.ending);
    expect(a.state.stats).toEqual(b.state.stats);
  });

  it('스트레스 80 이상이면 성장형 선택지가 잠긴다', () => {
    let s = started('effort', 5);
    s = { ...s, phase: 'await_roll', pending: undefined, position: 2, stress: 85 };
    // 칸 3(교실)에 멈출 때까지 진행
    for (let i = 0; i < 20 && !(s.phase === 'choice' && s.pending?.source === 'event'); i++) {
      s = { ...s, phase: 'await_roll', pending: undefined, position: 2, move: undefined };
      s = run(s, [{ type: 'ROLL_MOVE' }, { type: 'STEP_DONE' }]);
    }
    expect(s.pending?.source).toBe('event');
    const growth = getOptionViews(s).find((v) => v.option.kind === 'growth');
    expect(growth?.disabled).toBe(true);
    expect(reduce(s, { type: 'CHOOSE', optionId: growth!.option.id }).error).toBeTruthy();
  });
});

describe('엔딩', () => {
  it('진로 Lv2 이상은 Lv² 가중치, 두 분야 Lv3 이상은 조합', () => {
    const s = started();
    s.careerExp = { academic: 24, sports: 34, arts: 0, comm: 14, biz: 0 };
    const c = buildCandidates(s);
    const ids = c.map((x) => x.id);
    expect(ids).toContain('field:academic');
    expect(ids).toContain('field:sports');
    expect(ids).toContain('field:comm');
    expect(ids).toContain('combo:academic+sports');
    expect(c.find((x) => x.id === 'combo:academic+sports')!.weight).toBeCloseTo(12.25);
    expect(c.reduce((a, b) => a + b.probability, 0)).toBeCloseTo(1);
  });

  it('돈 15만 원 이상이면 경영 후보 추가', () => {
    const s = started();
    s.money = 160000;
    const c = buildCandidates(s);
    expect(c.map((x) => x.id)).toEqual(['field:biz']);
  });

  it('설계 예시: 운동 Lv4·체력 60·운 30·진로 시험 성공 → 보정 +5', () => {
    const s = started('effort');
    s.stats.stamina = 60;
    s.stats.luck = 30;
    s.stress = 40;
    s.finalExamBonus = true;
    const b = graduationBonuses(s, 'sports', 4).reduce((a, x) => a + x.value, 0);
    expect(b).toBe(5);
    // 상위(합 13 이상) 확률 ≈ 42%
    let top = 0;
    for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) if (a + c + b >= 13) top++;
    expect(top / 36).toBeCloseTo(15 / 36);
  });

  function toGraduation(s: GameState): GameState {
    return { ...s, phase: 'graduation', pending: { source: 'graduation', title: '졸업식', text: '' } };
  }

  it('후보가 없으면 탐색 엔딩', () => {
    const s = toGraduation(started('effort'));
    s.stats.social = 40;
    const e = reduce(s, { type: 'CONTINUE' }).state.ending!;
    expect(e.kind).toBe('explore');
    expect(e.sequence).toEqual(['roulette', 'fail_scene', 'reveal']);
  });

  it('인맥 70 이상이고 소통 외 진로가 모두 Lv1 이하면 친구 구원', () => {
    const s = toGraduation(started('insider'));
    s.stats.social = 75;
    s.careerExp.comm = 30;
    const e = reduce(s, { type: 'CONTINUE' }).state.ending!;
    expect(e.kind).toBe('rescue');
    expect(e.sequence).toContain('phone_call');
    expect(content.endings.rescue.map((r) => r.id)).toContain(e.jobId);
  });

  it('운 60 이상이면 룰렛 재도전을 묻는다', () => {
    const s = toGraduation(started('lucky'));
    s.stats.luck = 70;
    s.stats.social = 30;
    s.careerExp.academic = 30;
    let st = reduce(s, { type: 'CONTINUE' }).state;
    expect(st.ending?.awaitingReroll).toBe(true);
    st = reduce(st, { type: 'ROULETTE_REROLL', accept: true }).state;
    expect(st.ending?.awaitingReroll).toBe(false);
    expect(st.ending?.rerolled).toBe(true);
    expect(st.ending?.grade).toBeDefined();
    expect(st.ending?.graduationRoll?.dice).toHaveLength(2);
  });

  it('졸업 판정은 주사위 2개만으로 (보정 없음)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = toGraduation(started('effort', seed));
      s.stats.social = 30;
      s.stats.study = 95;
      s.careerExp.academic = 40;
      s.finalExamBonus = true;
      const e = reduce(s, { type: 'CONTINUE' }).state.ending!;
      const r = e.graduationRoll!;
      expect(r.bonus).toBe(0);
      expect(r.bonuses).toEqual([]);
      const sum = r.dice[0] + r.dice[1];
      expect(r.total).toBe(sum);
      expect(e.grade).toBe(sum >= GRADE_TOP ? 'top' : sum >= GRADE_MID ? 'mid' : 'low');
    }
  });
});

describe('시뮬레이션', () => {
  it('모든 성향 × 60판이 오류 없이 끝까지 간다', () => {
    for (const t of content.traits) {
      for (let i = 0; i < 60; i++) {
        const { state } = playToEnd(1000 + i, { traitId: t.id, policy: i % 2 ? 'greedy' : 'random' });
        expect(state.phase).toBe('ending');
        expect(state.year).toBe(3);
        expect(state.ending?.jobId).toBeTruthy();
        expect(state.turn).toBeGreaterThan(15);
        expect(state.turn).toBeLessThan(60);
        for (const v of Object.values(state.stats)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
        expect(state.money).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
