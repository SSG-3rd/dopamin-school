// 화면용 표시 정보 (아이콘·낱말·색). 색만으로 구분하지 않도록 아이콘과 낱말을 늘 함께 쓴다.
import type { Career, OptionKind, Outcome, Stat } from '@/engine/types';
import type { StressTierId } from '@/engine/rules';

export const STAT_COLORS: Record<Stat, string> = {
  study: 'var(--color-sky)',
  stamina: 'var(--color-accent)',
  social: 'var(--color-mint)',
  luck: 'var(--color-sun)',
};

export const CAREER_COLORS: Record<Career, string> = {
  academic: 'var(--color-academic)',
  sports: 'var(--color-sports)',
  arts: 'var(--color-arts)',
  comm: 'var(--color-comm)',
  biz: 'var(--color-biz)',
};

export const KIND_META: Record<OptionKind, { icon: string; word: string; color: string }> = {
  growth: { icon: '📈', word: '성장', color: 'var(--color-sky)' },
  rest: { icon: '☕', word: '휴식', color: 'var(--color-mint)' },
  adventure: { icon: '🎲', word: '모험', color: 'var(--color-accent)' },
  special: { icon: '⭐', word: '특별', color: 'var(--color-grape)' },
};

export const OUTCOME_META: Record<Outcome, { icon: string; word: string; color: string; tone: 'good' | 'bad' }> = {
  critical: { icon: '🌟', word: '대성공', color: 'var(--color-sun)', tone: 'good' },
  success: { icon: '⭕', word: '성공', color: 'var(--color-mint)', tone: 'good' },
  fail: { icon: '❌', word: '실패', color: 'var(--color-sky)', tone: 'bad' },
  fumble: { icon: '💥', word: '대실패', color: 'var(--color-danger)', tone: 'bad' },
};

export const STRESS_META: Record<StressTierId, { icon: string; color: string }> = {
  relaxed: { icon: '😌', color: 'var(--color-mint)' },
  normal: { icon: '🙂', color: 'var(--color-sky)' },
  tired: { icon: '😮‍💨', color: 'var(--color-sun)' },
  danger: { icon: '😵', color: 'var(--color-accent)' },
  burnout: { icon: '🔥', color: 'var(--color-danger)' },
};

export const TONE_ICON: Record<'good' | 'bad' | 'info', string> = {
  good: '▲',
  bad: '▼',
  info: '•',
};

/** 미리보기 문구("학업 +10", "스트레스 +15", "돈 −20,000원")의 좋고 나쁨 */
export function previewTone(text: string): 'good' | 'bad' | 'info' {
  if (text.startsWith('디버프')) return 'bad';
  if (text.startsWith('버프') || text.startsWith('✨')) return 'good';
  const inverse = text.includes('스트레스') || text.includes('지각');
  if (/\+\s?\d/.test(text)) return inverse ? 'bad' : 'good';
  if (/[−-]\s?\d/.test(text)) return inverse ? 'good' : 'bad';
  return 'info';
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '±0';
}
