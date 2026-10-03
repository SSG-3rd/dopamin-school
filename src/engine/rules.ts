// 규칙 상수와 계산식. 숫자는 여기 모아 두고 테스트 플레이 후 조정한다.
import type { Career, GameState, OptionKind } from './types';
import { CAREERS } from './types';

export const DIFF = { easy: 6, normal: 8, hard: 10 } as const;
export const MOVE_DIE = [1, 1, 1, 2, 2, 3] as const;
export const CORNERS = [0, 4, 8, 12] as const;
export const BOARD_SIZE = 16;

export const START_MONEY = 10000;
export const ALLOWANCE_PROMO = 30000;
export const ALLOWANCE_SUMMER = 20000;
export const PART_TIMER_MULT = 1.5;
export const ABILITY_USES_PER_YEAR = 2;
export const MAX_BUFFS = 3;

export const STAT_MIN = 0;
export const STAT_MAX = 100;
/** 이 값을 넘은 능력치는 오르는 양이 절반 */
export const STAT_SOFT_CAP = 80;

export const CAREER_THRESHOLDS = [6, 14, 24, 34, 46] as const;
export const CAREER_MAX_LEVEL = 5;
export const CLUB_EXP_MULT = 1.5;
export const PRACTICE_EXP_MULT = 2;

/** 대실패는 실패 효과에 스트레스를 더 얹는다 */
export const FUMBLE_EXTRA_STRESS = 5;
/** 대성공(일반 사건)은 성공 효과에 스트레스 감소를 얹는다 */
export const CRITICAL_STRESS_RELIEF = 5;

export const BURNOUT_STAMINA_LOSS = 10;
export const BURNOUT_STRESS_RESET = 50;

// 엔딩
export const RESCUE_MIN_SOCIAL = 70;
export const RESCUE_MAX_OTHER_LEVEL = 1;
export const MIRACLE_FLAGS = ['casting', 'viral', 'contest'] as const;
export const ROULETTE_MIN_LEVEL = 2;
export const COMBO_MIN_LEVEL = 3;
export const BIZ_MONEY_CANDIDATE = 150000;
export const REROLL_MIN_LUCK = 60;
export const GRADE_TOP = 13;
export const GRADE_MID = 9;
export const EPILOGUE_STRESS = 80;
export const EPILOGUE_MONEY = 100000;

/** 기본 능력치 → 판정 보정 */
export function statBonus(v: number): number {
  if (v < 20) return -1;
  if (v < 40) return 0;
  if (v < 60) return 1;
  if (v < 80) return 2;
  return 3;
}

/** 누적 경험치 → 진로 레벨 (소수점은 내림) */
export function careerLevel(exp: number): number {
  const e = Math.floor(exp);
  let lv = 0;
  for (const t of CAREER_THRESHOLDS) if (e >= t) lv++;
  return Math.min(lv, CAREER_MAX_LEVEL);
}

export function careerLevels(state: Pick<GameState, 'careerExp'>): Record<Career, number> {
  const out = {} as Record<Career, number>;
  for (const c of CAREERS) out[c] = careerLevel(state.careerExp[c]);
  return out;
}

/** 경험치 막대용: 현재 레벨 구간의 시작·끝 */
export function levelProgress(exp: number): { level: number; from: number; to: number | null; exp: number } {
  const level = careerLevel(exp);
  const from = level === 0 ? 0 : CAREER_THRESHOLDS[level - 1];
  const to = level >= CAREER_MAX_LEVEL ? null : CAREER_THRESHOLDS[level];
  return { level, from, to, exp: Math.floor(exp) };
}

/** 진로 레벨 → 판정 보정 */
export function careerBonus(level: number): number {
  if (level <= 0) return 0;
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  return 3;
}

export type StressTierId = 'relaxed' | 'normal' | 'tired' | 'danger' | 'burnout';
export interface StressTier {
  id: StressTierId;
  label: string;
  effect: string;
}

export function stressTier(stress: number): StressTier {
  if (stress >= 100) return { id: 'burnout', label: '번아웃', effect: '다음 턴 휴식, 체력 −10' };
  if (stress >= 80) return { id: 'danger', label: '위험', effect: '성장형 잠김 · 휴식 효과 2배 · 판정 −1' };
  if (stress >= 60) return { id: 'tired', label: '지침', effect: '모든 판정 −1' };
  if (stress >= 30) return { id: 'normal', label: '보통', effect: '효과 없음' };
  return { id: 'relaxed', label: '여유', effect: '모험형 판정 +1' };
}

/**
 * 스트레스 판정 보정. 60 이상은 −1 (위험 단계도 지침 효과를 그대로 받는다),
 * 30 미만이면 모험형 선택지 +1.
 */
export function stressJudgeMod(stress: number, kind: OptionKind | undefined): number {
  if (stress >= 60) return -1;
  if (stress < 30 && kind === 'adventure') return 1;
  return 0;
}

export function isGrowthLocked(stress: number): boolean {
  return stress >= 80;
}

/** 경영 분야 졸업 판정: 남은 돈 보정 */
export function moneyBonus(money: number): number {
  if (money >= 300000) return 3;
  if (money >= 200000) return 2;
  if (money >= 100000) return 1;
  return 0;
}

/** 2d6 + mod ≥ diff 성공 확률 (12는 항상 성공, 2는 항상 실패) */
export function successProbability(mod: number, diff: number): number {
  let ok = 0;
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const s = a + b;
      if (s === 12) ok++;
      else if (s === 2) continue;
      else if (s + mod >= diff) ok++;
    }
  }
  return ok / 36;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function formatMoney(won: number): string {
  return `${won.toLocaleString('ko-KR')}원`;
}

/** 5×5 테두리에서 칸 번호 → 격자 위치 (1부터) */
export function tileGridPos(index: number): { row: number; col: number } {
  // 아래 행 오른쪽→왼쪽 0~4, 왼쪽 열 아래→위 5~8, 위 행 왼쪽→오른쪽 9~12, 오른쪽 열 위→아래 13~15
  if (index <= 4) return { row: 5, col: 5 - index };
  if (index <= 8) return { row: 5 - (index - 4), col: 1 };
  if (index <= 12) return { row: 1, col: 1 + (index - 8) };
  return { row: 1 + (index - 12), col: 5 };
}
