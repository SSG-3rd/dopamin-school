// 공용 UI 조각. 훅을 쓰지 않으므로 서버·클라이언트 컴포넌트 어디서든 쓸 수 있다.
// 기본 모양은 globals.css의 components 레이어(.yd-*)에 있고, className으로 넘긴 Tailwind 유틸리티가 덮어쓴다.
import type { ComponentPropsWithRef, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** 버튼 모양 클래스. Next <Link>를 버튼처럼 꾸밀 때도 쓴다. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', block = false): string {
  return cx('yd-btn', `yd-btn--${variant}`, `yd-btn--${size}`, block && 'yd-btn--block');
}

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block = false, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

export type CardProps = ComponentPropsWithRef<'div'>;

/** 흰 바탕 둥근 카드 (아래 2~3px 눌림 그림자). 바탕색은 className(bg-paper-2 등)으로 바꿀 수 있다. */
export function Card({ className, ...rest }: CardProps) {
  return <div className={cx('yd-card', className)} {...rest} />;
}

export type ChipTone = 'neutral' | 'good' | 'bad' | 'warn' | 'info';

export function Chip({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx('yd-chip', tone !== 'neutral' && `yd-chip--${tone}`, className)}>{children}</span>;
}

/** 접근 가능한 막대 게이지. color는 아무 CSS 색이나 'var(--color-mint)' 같은 토큰. */
export function Bar({
  value,
  max = 100,
  color,
  label,
  className,
}: {
  value: number;
  max?: number;
  color: string;
  label?: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const v = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const pct = (v / safeMax) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.round(v)}
      className={cx('yd-bar-track', className)}
    >
      <div className="yd-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** ★★☆☆☆ 형태의 레벨 표시. 화면 읽기 프로그램에는 "Lv3"으로 읽힌다. */
export function Stars({ level, max = 5, className }: { level: number; max?: number; className?: string }) {
  const n = Math.max(0, Math.min(Math.floor(Number.isFinite(level) ? level : 0), max));
  return (
    <span role="img" aria-label={`Lv${n}`} className={cx('inline-flex tracking-tight leading-none', className)}>
      <span aria-hidden="true" className="text-biz">
        {'★'.repeat(n)}
      </span>
      <span aria-hidden="true" className="text-ink/25">
        {'☆'.repeat(max - n)}
      </span>
    </span>
  );
}
