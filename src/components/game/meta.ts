// 화면용 표시 정보 (아이콘·낱말·색). 색만으로 구분하지 않도록 아이콘과 낱말을 늘 함께 쓴다.
import type { Text } from '@/engine/text';
import type { Career, OptionKind, Outcome, Stat } from '@/engine/types';
import type { StressTierId } from '@/engine/rules';
import type { Tone } from '@/engine/view';
import type { MessageKey } from '@/i18n/keys';

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

export const KIND_META: Record<OptionKind, { icon: string; word: MessageKey; color: string }> = {
  growth: { icon: '📈', word: 'ui.kind.growth', color: 'var(--color-sky)' },
  rest: { icon: '☕', word: 'ui.kind.rest', color: 'var(--color-mint)' },
  adventure: { icon: '🎲', word: 'ui.kind.adventure', color: 'var(--color-accent)' },
  special: { icon: '⭐', word: 'ui.kind.special', color: 'var(--color-grape)' },
};

export const OUTCOME_META: Record<Outcome, { icon: string; word: MessageKey; color: string; tone: 'good' | 'bad' }> = {
  critical: { icon: '🌟', word: 'ui.outcome.critical', color: 'var(--color-sun)', tone: 'good' },
  success: { icon: '⭕', word: 'ui.outcome.success', color: 'var(--color-mint)', tone: 'good' },
  fail: { icon: '❌', word: 'ui.outcome.fail', color: 'var(--color-sky)', tone: 'bad' },
  fumble: { icon: '💥', word: 'ui.outcome.fumble', color: 'var(--color-danger)', tone: 'bad' },
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

/**
 * 설명 글 조각("인맥 +7", "스트레스 −10")의 좋고 나쁨. 효과 미리보기는 엔진이 tone을 주지만,
 * 콘텐츠의 설명 글은 글뿐이라 숫자 부호로 가린다. inverse: 오르면 나쁜 낱말(지금 언어의 '스트레스' 등)
 */
export function fragmentTone(text: string, inverse: readonly string[]): Tone {
  const inv = inverse.some((w) => w && text.includes(w));
  if (/\+\s?\d/.test(text)) return inv ? 'bad' : 'good';
  if (/[−-]\s?\d/.test(text)) return inv ? 'good' : 'bad';
  return 'info';
}

/** 애니메이션·화면 key용: 문장(Text)을 언어와 상관없는 글자로 */
export function textKey(v: Text | undefined): string {
  return v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '±0';
}
