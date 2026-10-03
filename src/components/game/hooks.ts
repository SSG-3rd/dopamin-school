'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { Action, GameState } from '@/engine/types';
import { useSettings } from '@/lib/settings';
import { useGame } from '@/store/game';

/**
 * 이 화면이 그린 상태(game)가 아직 최신일 때만 액션을 보낸다.
 * 사라지는 중인 카드(AnimatePresence exit)에서 두 번 누른 클릭·키가 다음 화면을 건너뛰지 않게 막는다.
 */
export function useAct(game: GameState | null | undefined): (a: Action) => string | undefined {
  const dispatch = useGame((s) => s.dispatch);
  return useCallback(
    (a: Action) => {
      if (!game || useGame.getState().game !== game) return 'stale';
      return dispatch(a);
    },
    [game, dispatch],
  );
}

/**
 * 창 전체 키보드 단축키. handler가 true를 돌려주면 기본 동작을 막는다.
 * 입력창에 있을 때, 조합키를 누를 때, 키보드로 버튼·링크에 포커스를 옮겼을 때의 Enter/Space(브라우저 기본 클릭)는 건드리지 않는다.
 */
export function useHotkeys(handler: (e: KeyboardEvent) => boolean | void, enabled = true): void {
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      const control = tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY';
      if (control && (e.key === 'Enter' || e.key === ' ')) {
        // 키보드로 옮겨 온 포커스면 브라우저 기본 동작(그 버튼 누르기)에 맡긴다.
        // 마우스로 누른 뒤 남은 포커스면 단축키가 이긴다.
        let keyboardFocus = false;
        try {
          keyboardFocus = t!.matches(':focus-visible');
        } catch {
          keyboardFocus = true;
        }
        if (keyboardFocus) return;
      }
      if (ref.current(e) === true) {
        e.preventDefault();
        if (control) t!.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** '1'~'9' → 숫자, 그 밖은 null */
export function digitKey(e: KeyboardEvent): number | null {
  return /^[1-9]$/.test(e.key) ? Number(e.key) : null;
}

export function isSpace(e: KeyboardEvent): boolean {
  return e.key === ' ' || e.code === 'Space';
}

export function isEnter(e: KeyboardEvent): boolean {
  return e.key === 'Enter' || e.code === 'NumpadEnter';
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      try {
        const m = window.matchMedia(query);
        m.addEventListener('change', cb);
        return () => m.removeEventListener('change', cb);
      } catch {
        return () => undefined;
      }
    },
    () => {
      try {
        return window.matchMedia(query).matches;
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export interface Timing {
  fast: boolean;
  /** 말이 한 칸 가는 시간 */
  step: number;
  /** 주사위가 구르는 시간 */
  dieRoll: number;
  /** 주사위가 멈춘 뒤 이동 시작까지 */
  dieHold: number;
  /** 판정 주사위 */
  judgeDie: number;
  /** 판정 보정 한 줄씩 */
  judgeReveal: number;
  /** 룰렛 한 바퀴 연출 */
  roulette: number;
  /** 룰렛이 멈춘 뒤 다음 장면까지 */
  rouletteHold: number;
  /** 실패 장면 한 줄 */
  sceneLine: number;
  /** 빠른 진행에서 결과 창 자동 닫힘 (null이면 끔) */
  autoClose: number | null;
}

const NORMAL: Timing = {
  fast: false,
  step: 280,
  dieRoll: 800,
  dieHold: 350,
  judgeDie: 950,
  judgeReveal: 260,
  roulette: 3200,
  rouletteHold: 1100,
  sceneLine: 1500,
  autoClose: null,
};

const FAST: Timing = {
  fast: true,
  step: 90,
  dieRoll: 260,
  dieHold: 120,
  judgeDie: 320,
  judgeReveal: 70,
  roulette: 1200,
  rouletteHold: 400,
  sceneLine: 600,
  autoClose: 1800,
};

export function useTiming(): Timing {
  const fast = useSettings((s) => s.fast);
  return fast ? FAST : NORMAL;
}
