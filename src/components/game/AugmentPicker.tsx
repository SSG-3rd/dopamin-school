'use client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { getAbilityView, getOptionViews, type OptionView } from '@/engine/view';
import type { GameState } from '@/engine/types';
import { Button, Chip } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { digitKey, isEnter, useAct, useHotkeys, useMediaQuery, useTiming } from './hooks';
import { KIND_META, pct, previewTone, signed } from './meta';
import { StatsDrawer, StatsToggle } from './StatsDrawer';

/*
 * 증강 선택처럼 고르는 선택지 창.
 * 어둡게 깐 배경 위에 상황 말풍선 → 키 큰 카드들이 한 장씩 뒤집히며 깔린다 → 하나를 고른다.
 * 넓은 화면(마우스): 올리면 들리고, 누르면 바로 고른다.
 * 좁은 화면·터치: 한 번 누르면 들어 올려 아래에 자세히, 한 번 더(또는 "이걸로 고르기") 누르면 고른다.
 * 숫자 키 1~9는 어디서든 바로 고른다.
 */

// ───────── 키보드로 둘러보는 중인지 (창이 열릴 때 첫 카드에 포커스를 줄지) ─────────
let keyboardNav = false;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab') keyboardNav = true;
    },
    true,
  );
  window.addEventListener(
    'pointerdown',
    () => {
      keyboardNav = false;
    },
    true,
  );
}

/** 같은 선택 창인지 가르는 key. 다른 선택으로 넘어가면 카드를 새로 깐다. */
export function pickerKey(game: GameState): string {
  const p = game.pending;
  return `pick-${game.turn}-${p?.source ?? ''}-${p?.eventId ?? p?.title ?? ''}-${p?.pickFor ?? ''}`;
}

// ───────── 등급(색) ─────────
type Tier = 'silver' | 'gold' | 'prism' | 'mint';

interface TierLook {
  /** 카드 테두리(액자) */
  frame: string;
  /** 메달 */
  medal: string;
  /** 빛 번짐 색 */
  glow: string;
  /** 빛 번짐 두 번째 색 */
  glow2?: string;
}

const W = '#ffffff';
const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, ${W})`;
const alpha = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

const TIERS: Record<Tier, TierLook> = {
  // 휴식: 은빛 하늘
  silver: {
    frame: `linear-gradient(150deg, ${W} 0%, ${tint('var(--color-sky)', 30)} 28%, ${W} 46%, ${tint('var(--color-sky)', 75)} 72%, ${tint('var(--color-sky)', 20)} 100%)`,
    medal: `radial-gradient(circle at 35% 28%, ${W} 0 28%, ${tint('var(--color-sky)', 45)} 66%, var(--color-sky) 100%)`,
    glow: 'var(--color-sky)',
  },
  // 성장: 버터 금빛
  gold: {
    frame: `linear-gradient(150deg, ${tint('var(--color-sun)', 35)} 0%, var(--color-sun) 30%, ${tint('var(--color-sun)', 25)} 48%, var(--color-biz) 74%, ${tint('var(--color-sun)', 60)} 100%)`,
    medal: `radial-gradient(circle at 35% 28%, ${W} 0 26%, ${tint('var(--color-sun)', 70)} 64%, var(--color-biz) 100%)`,
    glow: 'var(--color-biz)',
  },
  // 모험·해금: 파스텔 무지개
  prism: {
    frame:
      'conic-gradient(from 210deg at 50% 50%, var(--color-accent), var(--color-sun), var(--color-mint), var(--color-sky), var(--color-grape), var(--color-accent))',
    medal: `conic-gradient(from 30deg, ${tint('var(--color-accent)', 60)}, ${tint('var(--color-sun)', 70)}, ${tint('var(--color-mint)', 60)}, ${tint('var(--color-sky)', 60)}, ${tint('var(--color-grape)', 60)}, ${tint('var(--color-accent)', 60)})`,
    glow: 'var(--color-grape)',
    glow2: 'var(--color-accent)',
  },
  // 특별: 박하
  mint: {
    frame: `linear-gradient(150deg, ${tint('var(--color-mint)', 18)} 0%, ${tint('var(--color-mint)', 60)} 30%, ${tint('var(--color-mint)', 12)} 48%, var(--color-mint) 74%, ${tint('var(--color-mint)', 35)} 100%)`,
    medal: `radial-gradient(circle at 35% 28%, ${W} 0 26%, ${tint('var(--color-mint)', 50)} 64%, var(--color-mint) 100%)`,
    glow: 'var(--color-mint)',
  },
};

const DISABLED_FRAME = 'linear-gradient(150deg, #f3eee4 0%, #ddd3c2 60%, #eae3d6 100%)';
const DISABLED_MEDAL = 'radial-gradient(circle at 35% 28%, #ffffff 0 26%, #e9e2d5 64%, #cfc4b2 100%)';
const DROP = '0 4px 0 0 rgb(107 79 58 / 0.25)';

function tierOf(v: OptionView): Tier {
  if (v.unlocked) return 'prism';
  switch (v.option.kind) {
    case 'rest':
      return 'silver';
    case 'growth':
      return 'gold';
    case 'adventure':
      return 'prism';
    default:
      return 'mint';
  }
}

function cardShadow(t: TierLook, hot: boolean, armed: boolean, disabled: boolean): string {
  if (disabled) return '0 3px 0 0 rgb(107 79 58 / 0.18)';
  const parts: string[] = [];
  if (armed) parts.push('0 0 0 3px var(--color-paper)', '0 0 0 6px var(--color-grape)');
  parts.push(DROP);
  const ring = armed ? 10 : 4;
  if (hot) {
    parts.push(`0 0 0 ${ring}px ${alpha(t.glow, 45)}`, `0 16px 38px 6px ${alpha(t.glow2 ?? t.glow, 60)}`, `0 0 30px 4px ${alpha(t.glow, 55)}`);
  } else {
    parts.push(`0 0 20px 2px ${alpha(t.glow, 38)}`);
  }
  return parts.join(', ');
}

// ───────── 글자 정리 ─────────
const LEAD_EMOJI =
  /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:️|⃣|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)\s*/u;

/** "🎸 밴드부" → 메달 🎸 + 이름 "밴드부". 이모지가 없으면 종류 아이콘. */
function splitLabel(v: OptionView): { icon: string; name: string } {
  const label = v.option.label;
  const m = label.match(LEAD_EMOJI);
  if (m && m[1] && label.length > m[0].length) return { icon: m[1], name: label.slice(m[0].length).trim() };
  return { icon: KIND_META[v.option.kind].icon, name: label };
}

function kindLine(v: OptionView): string {
  const k = KIND_META[v.option.kind];
  if (v.judge) return `${k.word} · ${v.judge.byLabel} 판정`;
  if (v.option.kind === 'growth' || v.option.kind === 'adventure') return `${k.word} · 확정`;
  return k.word;
}

const NUMERIC = /[+−-]\s?\d/;

/**
 * 효과 칩과 설명 글을 나눈다.
 * - 효과가 없어 설명만 있는 경우: "인맥 +10 · 스트레스 −5"처럼 숫자 있는 조각은 칩, 나머지는 글.
 * - 설명이 칩을 그대로 되풀이하면(시험 전략) 설명은 숨긴다.
 */
function splitDetails(v: OptionView): { chips: string[]; text: string | null } {
  const desc = v.option.desc?.trim();
  if (!desc) return { chips: v.preview, text: null };
  const parts = desc.split(/\s*·\s*|,\s+/).filter(Boolean);
  const fromDesc = v.preview.length === 1 && v.preview[0] === v.option.desc;
  if (fromDesc) {
    const chips = parts.filter((p) => NUMERIC.test(p));
    const rest = parts.filter((p) => !NUMERIC.test(p));
    return { chips, text: rest.length ? rest.join(' · ') : null };
  }
  const covered = parts.every((p) => v.preview.some((c) => c.includes(p) || p.includes(c)));
  return { chips: v.preview, text: covered ? null : desc };
}

function probTone(p: number): string {
  if (p >= 0.7) return 'text-good';
  if (p < 0.4) return 'text-bad';
  return 'text-ink';
}

function ariaLabel(v: OptionView): string {
  const { name } = splitLabel(v);
  const bits = [`${v.key}번`, name, kindLine(v)];
  if (v.judge) bits.push(`성공 확률 ${pct(v.judge.probability)}`);
  if (v.unlocked) bits.push('해금 선택지');
  if (v.disabled) bits.push(`고를 수 없음${v.reason ? `: ${v.reason}` : ''}`);
  return bits.join(', ');
}

// ───────── 작은 조각 ─────────
function Medallion({ icon, look, size, disabled }: { icon: string; look: TierLook; size: number; disabled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center rounded-full border-[3px] border-outline"
      style={{
        width: size,
        height: size,
        background: disabled ? DISABLED_MEDAL : look.medal,
        boxShadow: 'inset 0 -3px 0 0 rgb(107 79 58 / 0.18), 0 2px 0 0 rgb(107 79 58 / 0.25)',
      }}
    >
      <span className="absolute inset-[5px] rounded-full border-2 border-white/70" />
      <span className="relative leading-none" style={{ fontSize: Math.round(size * 0.46) }}>
        {disabled ? '🔒' : icon}
      </span>
    </span>
  );
}

function ChipRow({ items, label, align }: { items: string[]; label?: string; align: 'center' | 'start' }) {
  if (items.length === 0) return null;
  return (
    <span className={`flex flex-col gap-1 ${align === 'center' ? 'items-center' : 'items-start'}`}>
      {label && <span className="font-display text-base leading-none text-muted">{label}</span>}
      <span className={`flex flex-wrap gap-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {items.map((t, i) => (
          <Chip key={`${t}-${i}`} tone={previewTone(t)} className="max-w-full whitespace-normal text-center">
            {t}
          </Chip>
        ))}
      </span>
    </span>
  );
}

function JudgeBox({ judge, armed, dense }: { judge: NonNullable<OptionView['judge']>; armed: boolean; dense: boolean }) {
  if (dense) {
    return (
      <span className="text-base">
        <span aria-hidden="true">🎲</span> 성공{' '}
        <strong className={`font-display text-xl font-normal ${probTone(judge.probability)}`}>{pct(judge.probability)}</strong>
        <span className="text-muted">
          {' '}
          · 보정 {signed(judge.bonus)} · 난이도 {judge.diff}
        </span>
      </span>
    );
  }
  return (
    <span
      className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-2 py-1.5 ${
        armed ? 'border-grape bg-grape/12' : 'border-outline/35 bg-white/70'
      }`}
    >
      <span className="text-base leading-tight text-muted">
        <span aria-hidden="true">{armed ? '🎉' : '🎲'}</span> 성공 확률
      </span>
      <span className={`font-display text-[36px] leading-none ${probTone(judge.probability)}`}>{pct(judge.probability)}</span>
      <span className="text-base leading-tight text-muted">
        보정 {signed(judge.bonus)} · 난이도 {judge.diff}
      </span>
    </span>
  );
}

/** 카드 본문·자세히 창이 함께 쓰는 효과 설명 */
function OptionDetails({
  view,
  align,
  armed,
  dense = false,
}: {
  view: OptionView;
  align: 'center' | 'start';
  armed: boolean;
  dense?: boolean;
}) {
  const { chips, text } = splitDetails(view);
  const j = view.judge;
  const fail = view.failPreview ?? [];
  return (
    <>
      {text && (
        <span className={`block text-base leading-snug text-muted ${align === 'center' ? 'text-center' : 'text-left'}`}>{text}</span>
      )}
      <ChipRow items={chips} label={j && fail.length > 0 ? '성공 시' : undefined} align={align} />
      {j && <JudgeBox judge={j} armed={armed} dense={dense} />}
      <ChipRow items={fail} label="실패 시" align={align} />
      {!text && chips.length === 0 && !j && <span className="text-base text-muted">특별한 변화 없음</span>}
      {view.disabled && view.reason && (
        <span className="font-display text-base leading-snug text-bad">
          <span aria-hidden="true">🔒</span> {view.reason}
        </span>
      )}
    </>
  );
}

function HotkeyBadge({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border-2 border-outline bg-white px-1.5 font-display text-lg leading-none text-ink shadow-[0_2px_0_0_rgb(107_79_58/0.35)] ${className}`}
    >
      {n}
    </span>
  );
}

function UnlockRibbon({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 rotate-[8deg] rounded-full border-2 border-outline bg-sun font-display leading-none text-ink shadow-[0_2px_0_0_rgb(107_79_58/0.3)] ${
        small ? '-right-1.5 -top-2 px-1.5 py-1 text-[13px]' : '-right-2.5 -top-3 px-2.5 py-1.5 text-base'
      }`}
    >
      🔓 해금
    </span>
  );
}

// ───────── 카드 ─────────
type Variant = 'tall' | 'row' | 'compact';
type Status = 'idle' | 'chosen' | 'dropped';

interface CardProps {
  view: OptionView;
  index: number;
  variant: Variant;
  width?: number;
  hot: boolean;
  status: Status;
  armed: boolean;
  showKey: boolean;
  fast: boolean;
  selectMs: number;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  onHover: (on: boolean) => void;
  onFocusChange: (keyboard: boolean | null) => void;
}

function AugmentCard({
  view,
  index,
  variant,
  width,
  hot,
  status,
  armed,
  showKey,
  fast,
  selectMs,
  buttonRef,
  onClick,
  onHover,
  onFocusChange,
}: CardProps) {
  const descId = useId();
  const look = TIERS[tierOf(view)];
  const { icon, name } = splitLabel(view);
  const disabled = view.disabled;
  const stagger = fast ? 0.03 : 0.08;
  const sel = selectMs / 1000;
  const delay = index * stagger;

  const animate =
    status === 'idle'
      ? {
          opacity: 1,
          rotateY: 0,
          y: 0,
          scale: 1,
          transition: {
            opacity: { duration: fast ? 0.12 : 0.22, delay },
            rotateY: { type: 'spring' as const, stiffness: fast ? 320 : 170, damping: fast ? 26 : 17, delay },
            y: { type: 'spring' as const, stiffness: fast ? 320 : 200, damping: fast ? 28 : 20, delay },
            scale: { duration: 0.15 },
          },
        }
      : status === 'chosen'
        ? { opacity: 1, rotateY: 0, y: -8, scale: 1.06, transition: { duration: sel, ease: 'easeOut' as const } }
        : { opacity: 0, rotateY: 0, y: 36, scale: 0.94, transition: { duration: sel, ease: 'easeIn' as const } };

  const lift = hot && status === 'idle' ? (variant === 'tall' ? -10 : -6) : 0;

  const onFocus = (e: ReactFocusEvent<HTMLButtonElement>) => {
    let kb = false;
    try {
      kb = e.currentTarget.matches(':focus-visible');
    } catch {
      kb = false;
    }
    onFocusChange(kb);
  };

  const frameStyle: CSSProperties = {
    background: disabled ? DISABLED_FRAME : look.frame,
    boxShadow: cardShadow(look, hot, armed, disabled),
    filter: disabled ? 'grayscale(0.85)' : undefined,
    opacity: disabled ? 0.78 : undefined,
  };
  const innerStyle: CSSProperties = {
    background: disabled
      ? 'var(--color-paper-2)'
      : `linear-gradient(180deg, color-mix(in srgb, ${look.glow} 22%, var(--color-paper)) 0%, var(--color-paper) 45%)`,
  };

  const shine = hot && status === 'idle' && !disabled && (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-[-25%] left-0 z-0 w-1/2"
      style={{ skewX: -16, background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.8), transparent)' }}
      initial={{ x: '-160%' }}
      animate={{ x: '320%' }}
      transition={{ duration: fast ? 0.4 : 0.7, ease: 'easeOut' }}
    />
  );
  const flash = status === 'chosen' && (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.85, 0] }}
      transition={{ duration: sel * 1.3, times: [0, 0.35, 1] }}
    />
  );

  const common = {
    type: 'button' as const,
    ref: buttonRef,
    'aria-label': ariaLabel(view),
    'aria-describedby': descId,
    'aria-disabled': disabled || undefined,
    'aria-keyshortcuts': String(view.key),
    'data-aug-card': '',
    onClick,
    onPointerEnter: (e: ReactPointerEvent) => e.pointerType === 'mouse' && onHover(true),
    onPointerLeave: (e: ReactPointerEvent) => e.pointerType === 'mouse' && onHover(false),
    onFocus,
    onBlur: () => onFocusChange(null),
    animate: { y: lift },
    transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
    style: frameStyle,
  };

  const focusRing =
    'outline-none transition-[box-shadow,filter] duration-200 focus-visible:outline-[3px] focus-visible:outline-offset-[5px] focus-visible:outline-sky-deep';

  let body;
  if (variant === 'tall') {
    body = (
      <motion.button
        {...common}
        className={`relative flex w-full flex-col rounded-[22px] border-[3px] border-outline p-[6px] text-left ${focusRing} ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {view.unlocked && <UnlockRibbon />}
        <span
          className="relative flex flex-1 flex-col items-center gap-2 overflow-hidden rounded-[16px] border-2 border-outline/60 px-3 pb-3 pt-4"
          style={innerStyle}
        >
          {shine}
          {flash}
          <span className="relative z-10 flex flex-col items-center gap-1.5">
            <Medallion icon={icon} look={look} size={74} disabled={disabled} />
            <span className="mt-1 text-center font-display text-[21px] leading-tight text-ink">{name}</span>
            <span className="text-center text-base leading-tight text-muted">{kindLine(view)}</span>
          </span>
          <span aria-hidden="true" className="relative z-10 my-0.5 w-full border-t-[2.5px] border-dashed border-outline/35" />
          <span id={descId} className="relative z-10 flex w-full flex-col items-center gap-2">
            <OptionDetails view={view} align="center" armed={armed} />
          </span>
          {showKey && <HotkeyBadge n={view.key} className="relative z-10 mt-auto" />}
        </span>
      </motion.button>
    );
  } else if (variant === 'row') {
    body = (
      <motion.button
        {...common}
        className={`relative flex w-full rounded-[20px] border-[3px] border-outline p-[5px] text-left ${focusRing} ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {view.unlocked && <UnlockRibbon />}
        <span
          className="relative flex flex-1 items-center gap-3 overflow-hidden rounded-[15px] border-2 border-outline/60 px-3 py-2.5"
          style={innerStyle}
        >
          {shine}
          {flash}
          <span className="relative z-10">
            <Medallion icon={icon} look={look} size={58} disabled={disabled} />
          </span>
          <span className="relative z-10 flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="font-display text-[20px] leading-tight text-ink">{name}</span>
            <span className="text-base leading-tight text-muted">{kindLine(view)}</span>
            <span id={descId} className="flex w-full flex-col items-start gap-1.5">
              <OptionDetails view={view} align="start" armed={armed} dense />
            </span>
          </span>
          {showKey && <HotkeyBadge n={view.key} className="relative z-10 self-start" />}
        </span>
      </motion.button>
    );
  } else {
    // compact (좁은 화면): 메달·이름·종류·확률만. 자세한 건 아래 창에.
    body = (
      <motion.button
        {...common}
        className={`relative flex w-full flex-col rounded-[18px] border-[2.5px] border-outline p-[4px] text-left ${focusRing} ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {view.unlocked && <UnlockRibbon small />}
        <span
          className="relative flex flex-1 flex-col items-center gap-1 overflow-hidden rounded-[13px] border-2 border-outline/55 px-1.5 pb-2 pt-2.5"
          style={innerStyle}
        >
          {shine}
          {flash}
          {showKey && (
            <span
              aria-hidden="true"
              className="absolute left-1 top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-md border-[1.5px] border-outline/70 bg-white px-1 font-display text-[13px] leading-none text-ink"
            >
              {view.key}
            </span>
          )}
          <span className="relative z-10 flex flex-col items-center gap-1">
            <Medallion icon={icon} look={look} size={48} disabled={disabled} />
            <span className="text-center font-display text-base leading-tight text-ink">{name}</span>
            <span className="text-center text-sm leading-tight text-muted">{kindLine(view)}</span>
          </span>
          <span id={descId} className="relative z-10 mt-auto flex flex-col items-center pt-0.5">
            {disabled ? (
              <span className="text-center font-display text-sm leading-tight text-bad">
                <span aria-hidden="true">🔒</span> {view.reason ?? '잠김'}
              </span>
            ) : view.judge ? (
              <span className={`font-display text-[24px] leading-none ${probTone(view.judge.probability)}`}>
                {pct(view.judge.probability)}
              </span>
            ) : null}
          </span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className={`relative flex ${variant === 'tall' ? 'min-h-[330px]' : ''}`}
      style={{ width, transformPerspective: 1000 }}
      initial={{ opacity: 0, rotateY: 90, y: 40 }}
      animate={animate}
    >
      {body}
    </motion.div>
  );
}

// ───────── 좁은 화면 자세히 창 ─────────
function DetailPanel({
  view,
  armed,
  full,
  onPick,
  panelRef,
}: {
  view: OptionView | null;
  armed: boolean;
  full: boolean;
  onPick: (id: string) => void;
  panelRef: Ref<HTMLElement>;
}) {
  if (!full) {
    // 넓은 화면 + 터치: 카드에 내용이 다 있으니 고르기 버튼만
    return (
      <section ref={panelRef} aria-live="polite" className="flex min-h-14 w-full justify-center">
        {view ? (
          <Button size="lg" disabled={view.disabled} onClick={() => onPick(view.option.id)}>
            ‘{splitLabel(view).name}’ 이걸로 고르기
          </Button>
        ) : (
          <p className="rounded-full border-2 border-outline bg-paper px-4 py-1.5 text-base text-muted">
            카드를 누르면 들어 올려요. 한 번 더 누르면 골라요.
          </p>
        )}
      </section>
    );
  }
  const look = view ? TIERS[tierOf(view)] : null;
  return (
    <section
      ref={panelRef}
      aria-live="polite"
      aria-label="고른 카드 자세히"
      className="w-full max-w-[520px] scroll-mb-4 rounded-[22px] border-[3px] border-outline bg-paper p-4 shadow-[0_4px_0_0_rgb(107_79_58/0.25)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {view && look ? (
          <motion.div
            key={view.option.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <Medallion icon={splitLabel(view).icon} look={look} size={52} disabled={view.disabled} />
              <div className="min-w-0">
                <h3 className="text-[22px] leading-tight text-ink">{splitLabel(view).name}</h3>
                <p className="text-base leading-tight text-muted">
                  {kindLine(view)}
                  {view.unlocked && ' · 🔓 해금'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2">
              <OptionDetails view={view} align="start" armed={armed && !!view.judge} />
            </div>
            <Button size="lg" block disabled={view.disabled} onClick={() => onPick(view.option.id)}>
              {view.disabled ? '🔒 고를 수 없어요' : '이걸로 고르기'}
            </Button>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-base text-muted"
          >
            카드를 누르면 자세히 보여요. 한 번 더 누르면 골라요.
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

// ───────── 배치 ─────────
function narrowGrid(n: number): string {
  if (n <= 1) return 'grid-cols-1 max-w-[240px]';
  if (n === 2 || n === 4) return 'grid-cols-2 max-w-[420px]';
  return 'grid-cols-3 max-w-[560px]';
}

function tallWidth(n: number): number {
  if (n <= 3) return 230;
  if (n === 4) return 218;
  return 204;
}

// ───────── 본체 ─────────
export function AugmentPicker({ game }: { game: GameState }) {
  const p = game.pending;
  const dispatch = useAct(game);
  const timing = useTiming();
  const fast = timing.fast;
  const wide = useMediaQuery('(min-width: 960px) and (min-height: 600px)');
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
  const twoStep = !wide || !fine;
  const views = getOptionViews(game);
  const ability = getAbilityView(game);
  const canToggle = !!ability && ability.available && game.traitId === 'insider';
  const armed = !!p?.abilityArmed && game.traitId === 'insider';
  const n = views.length;
  const variant: Variant = !wide ? 'compact' : n >= 6 ? 'row' : 'tall';
  const selectMs = fast ? 120 : 250;

  const titleId = useId();
  const textId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [picked, setPicked] = useState<string | null>(null);
  const pickedRef = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [kbId, setKbId] = useState<string | null>(null);
  // 터치·좁은 화면에서 한 번 눌러 들어 올린 카드 (선택 하나뿐이면 처음부터 들어 둔다)
  const [selected, setSelectedState] = useState<string | null>(() =>
    twoStep && n === 1 && !views[0]?.disabled ? views[0].option.id : null,
  );
  const selectedRef = useRef<string | null>(selected);
  const setSelected = (id: string | null) => {
    selectedRef.current = id;
    setSelectedState(id);
  };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 내 능력치·돈 패널
  const [statsOpen, setStatsOpen] = useState(false);
  const statsToggleRef = useRef<HTMLButtonElement>(null);
  const closeStats = () => {
    setStatsOpen(false);
    requestAnimationFrame(() => statsToggleRef.current?.focus({ preventScroll: true }));
  };
  const toggleStats = () => (statsOpen ? closeStats() : setStatsOpen(true));

  useEffect(() => () => clearTimeout(timer.current), []);

  // 열릴 때: 키보드로 둘러보던 중이면 첫 카드에, 아니면 창 자체에 포커스 (화면 읽기 프로그램이 창을 읽도록)
  useEffect(() => {
    const first = views.findIndex((v) => !v.disabled);
    const el = keyboardNav && first >= 0 ? cardRefs.current[first] : rootRef.current;
    el?.focus({ preventScroll: true });
    // 창이 열릴 때 한 번만
  }, []);

  const pick = (id: string) => {
    if (pickedRef.current) return;
    const v = views.find((x) => x.option.id === id);
    if (!v || v.disabled) return;
    pickedRef.current = id;
    setPicked(id);
    playSound('click');
    timer.current = setTimeout(() => {
      const err = dispatch({ type: 'CHOOSE', optionId: id });
      if (err) {
        pickedRef.current = null;
        setPicked(null);
      }
    }, selectMs);
  };

  const toggleAbility = () => {
    if (pickedRef.current) return;
    dispatch({ type: 'USE_ABILITY' });
  };

  const select = (id: string) => {
    setSelected(id);
    if (!wide) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  };

  const onCardClick = (v: OptionView) => {
    if (pickedRef.current) return;
    if (twoStep) {
      if (selectedRef.current === v.option.id) {
        pick(v.option.id);
        return;
      }
      // 고를 수 없는 카드도 들어 올려 이유는 볼 수 있게 (좁은 화면)
      if (v.disabled && wide) return;
      select(v.option.id);
      return;
    }
    pick(v.option.id);
  };

  useHotkeys((e) => {
    if (pickedRef.current) return digitKey(e) != null || isEnter(e);
    if (e.key === 's' || e.key === 'S' || e.key === 'ㄴ') {
      toggleStats();
      return true;
    }
    if (e.key === 'Escape' && statsOpen) {
      closeStats();
      return true;
    }
    const d = digitKey(e);
    if (d != null) {
      const v = views.find((x) => x.key === d);
      if (v && !v.disabled) {
        pick(v.option.id);
        return true;
      }
      return false;
    }
    if (isEnter(e) && selectedRef.current) {
      pick(selectedRef.current);
      return true;
    }
    if (canToggle && (e.key === 'a' || e.key === 'A' || e.key === 'ㅁ')) {
      toggleAbility();
      return true;
    }
  });

  // 창 안에서만 Tab이 돌고, 화살표로 카드 사이를 옮긴다
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const target = e.target as HTMLElement;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') && target.hasAttribute('data-aug-card')) {
      const cards = cardRefs.current.filter((c): c is HTMLButtonElement => !!c);
      const i = cards.indexOf(target as HTMLButtonElement);
      if (i < 0) return;
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      cards[(i + step + cards.length) % cards.length]?.focus();
      e.preventDefault();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!p) return null;
  const selectedView = selected ? (views.find((v) => v.option.id === selected) ?? null) : null;

  const cards = views.map((v, i) => {
    const id = v.option.id;
    const status: Status = picked == null ? 'idle' : picked === id ? 'chosen' : 'dropped';
    const hot = picked == null && (hoverId === id || kbId === id || selected === id);
    return (
      <AugmentCard
        key={id}
        view={v}
        index={i}
        variant={variant}
        width={variant === 'tall' ? tallWidth(n) : undefined}
        hot={hot}
        status={status}
        armed={armed && !!v.judge}
        showKey={fine}
        fast={fast}
        selectMs={selectMs}
        buttonRef={(el) => {
          cardRefs.current[i] = el;
        }}
        onClick={() => onCardClick(v)}
        onHover={(on) => setHoverId((cur) => (on ? id : cur === id ? null : cur))}
        onFocusChange={(kb) => {
          if (kb === true) {
            setKbId(id);
            if (twoStep) setSelected(id);
          } else if (kb === null) {
            setKbId((cur) => (cur === id ? null : cur));
          }
        }}
      />
    );
  });

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={p.text ? textId : undefined}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-40 overflow-y-auto overscroll-contain outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: fast ? 0.1 : 0.2 } }}
      exit={{ opacity: 0, transition: { duration: fast ? 0.08 : 0.16 } }}
    >
      {/* 어둡게 덮는 배경 (창 자체에 blur를 걸면 안쪽 fixed 패널이 스크롤에 끌려가므로 따로 둔다) */}
      <div aria-hidden="true" className="fixed inset-0 bg-outline/45 backdrop-blur-[2px]" />
      <div
        className={`relative mx-auto flex min-h-full w-full max-w-[1240px] flex-col items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] transition-[padding] duration-300 ${
          wide ? 'gap-5' : 'gap-3.5'
        }`}
        style={wide && statsOpen ? { paddingRight: 404 } : undefined}
      >
        {/* 상황 말풍선 */}
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className={`relative w-full rounded-[22px] border-[3px] border-outline bg-paper shadow-[0_4px_0_0_rgb(107_79_58/0.25)] ${
            wide ? 'max-w-[680px] px-5 py-4' : 'max-w-[560px] px-4 py-3'
          }`}
        >
          <div className="flex items-start gap-3">
            {p.icon && (
              <span
                aria-hidden="true"
                className={`flex shrink-0 items-center justify-center rounded-full border-[3px] border-outline bg-sun/70 leading-none ${
                  wide ? 'h-16 w-16 text-[36px]' : 'h-12 w-12 text-[26px]'
                }`}
              >
                {p.icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className={`${wide ? 'text-[26px]' : 'text-[22px]'} leading-tight text-ink`}>
                {p.title}
              </h2>
              {p.text && (
                <p id={textId} className={`mt-1 leading-relaxed text-ink/90 ${wide ? 'text-lg' : 'text-base'}`}>
                  {p.text}
                </p>
              )}
            </div>
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-outline bg-paper"
          />
        </motion.div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <p className="rounded-full border-2 border-outline bg-paper/95 px-4 py-1 font-display text-lg leading-tight text-ink shadow-[0_2px_0_0_rgb(107_79_58/0.25)]">
            <span aria-hidden="true">✨</span> 하나를 골라요
            {fine && n > 1 && <span className="text-base text-muted"> · 숫자 키 1~{n}</span>}
          </p>
          <StatsToggle game={game} open={statsOpen} onToggle={toggleStats} showKey={fine} buttonRef={statsToggleRef} />
        </div>

        {/* 카드 */}
        {variant === 'tall' ? (
          <div className="flex w-full flex-wrap items-stretch justify-center gap-4 pt-2">{cards}</div>
        ) : variant === 'row' ? (
          <div className="grid w-full max-w-[1000px] grid-cols-3 gap-3.5 pt-1">{cards}</div>
        ) : (
          <div className={`grid w-full gap-2.5 pt-1 ${narrowGrid(n)}`}>{cards}</div>
        )}

        {/* 인싸형 능력 */}
        {canToggle && ability && (
          <button
            type="button"
            aria-pressed={armed}
            onClick={toggleAbility}
            className={`inline-flex min-h-11 flex-wrap items-center justify-center gap-x-2 rounded-full border-[2.5px] border-outline px-4 py-1.5 font-display text-base leading-tight text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.25)] transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-sky-deep ${
              armed ? 'bg-grape' : 'bg-paper hover:bg-paper-2'
            }`}
          >
            <span>
              <span aria-hidden="true">🎉</span> {armed ? `${ability.label} 발동 중 (취소)` : `${ability.label} 쓰기`}
            </span>
            <span className={armed ? 'text-ink/80' : 'text-muted'}>
              {armed ? '판정 기준: 인맥' : '판정 기준을 인맥으로'} · 남은 {ability.usesLeft}회{fine ? ' · A키' : ''}
            </span>
          </button>
        )}

        {/* 터치·좁은 화면: 자세히 + 고르기 */}
        {twoStep && (
          <DetailPanel view={selectedView} armed={armed} full={!wide} onPick={pick} panelRef={panelRef} />
        )}
      </div>

      <AnimatePresence>
        {statsOpen && <StatsDrawer key="stats" game={game} wide={wide} fast={fast} onClose={closeStats} />}
      </AnimatePresence>
    </motion.div>
  );
}
