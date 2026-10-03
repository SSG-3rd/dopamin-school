'use client';
// 게임 스토어: 엔진 호출 + 저장(yd:save) + 변화 알림(토스트).
// 규칙 계산은 하지 않는다. 모든 변화는 엔진의 reduce를 거친다.
import { create } from 'zustand';
import { describeChange, newGame as createGame, randomSeed, reduce } from '@/engine';
import type { Action, Change, GameState } from '@/engine/types';
import { recordEnding } from '@/lib/collection';
import { useSettings } from '@/lib/settings';
import { playSound } from '@/lib/sound';
import { KEYS, readJSON, writeJSON } from '@/lib/storage';
import { sendResult } from '@/lib/supabase';

export type ToastTone = 'good' | 'bad' | 'info';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

interface GameStore {
  game: GameState | null;
  hydrated: boolean;
  toasts: Toast[];
  /** 이번 접속에서 막 확정된 엔딩인지. 저장본에서 불러온 끝난 게임은 연출을 건너뛴다. */
  freshEnding: boolean;
  hydrate(): void;
  newGame(): void;
  dispatch(a: Action): string | undefined;
  dismissToast(id: number): void;
}

const TOAST_MS = 2500;
const TOAST_MAX = 4;

let toastSeq = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

function clearToastTimers(): void {
  for (const t of toastTimers.values()) clearTimeout(t);
  toastTimers.clear();
}

function isFinished(g: GameState | null | undefined): boolean {
  return !!g && g.phase === 'ending' && !!g.ending && !g.ending.awaitingReroll;
}

function isValidSave(x: unknown): x is GameState {
  if (!x || typeof x !== 'object') return false;
  const g = x as Partial<GameState>;
  return (
    g.version === 1 &&
    typeof g.phase === 'string' &&
    typeof g.position === 'number' &&
    !!g.stats &&
    typeof g.stats === 'object' &&
    !!g.careerExp &&
    typeof g.careerExp === 'object'
  );
}

function save(game: GameState): void {
  try {
    writeJSON(KEYS.save, game);
  } catch {
    // 저장 실패는 무시 (메모리에서는 계속 진행)
  }
}

export const useGame = create<GameStore>((set, get) => {
  function pushToasts(items: { text: string; tone: ToastTone }[]): void {
    if (items.length === 0) return;
    const added: Toast[] = items.map((t) => ({ id: ++toastSeq, text: t.text, tone: t.tone }));
    const all = [...get().toasts, ...added];
    const kept = all.slice(-TOAST_MAX);
    for (const t of all) {
      if (!kept.includes(t)) {
        const timer = toastTimers.get(t.id);
        if (timer) clearTimeout(timer);
        toastTimers.delete(t.id);
      }
    }
    for (const t of added) {
      if (!kept.includes(t)) continue;
      toastTimers.set(
        t.id,
        setTimeout(() => get().dismissToast(t.id), TOAST_MS),
      );
    }
    set({ toasts: kept });
  }

  function toastsFromLog(log: Change[]): void {
    const items: { text: string; tone: ToastTone }[] = [];
    for (const c of log) {
      try {
        items.push(describeChange(c));
      } catch {
        // 알 수 없는 변화는 건너뛴다
      }
    }
    pushToasts(items);
    if (log.some((c) => c.kind === 'career' && c.levelUp)) playSound('levelup');
  }

  function onFinished(game: GameState): void {
    const ending = game.ending;
    if (!ending) return;
    try {
      const { isNew } = recordEnding(ending.jobId);
      if (isNew) pushToasts([{ text: '📖 엔딩 도감에 새 직업 등록!', tone: 'good' }]);
    } catch {
      // 도감 기록 실패는 무시
    }
    try {
      const booth = useSettings.getState().booth;
      void sendResult(game, booth).catch(() => undefined);
    } catch {
      // 통계 전송은 기다리지 않고 실패도 무시
    }
  }

  return {
    game: null,
    hydrated: false,
    toasts: [],
    freshEnding: false,

    hydrate() {
      let game: GameState | null = null;
      try {
        const raw = readJSON<unknown>(KEYS.save, null);
        if (isValidSave(raw)) game = raw;
      } catch {
        game = null;
      }
      // 이미 메모리에 같은 판이 있으면 그대로 둔다 (페이지 사이를 오갈 때)
      const cur = get().game;
      if (cur && game && cur.seed === game.seed && cur.startedAt === game.startedAt) {
        set({ hydrated: true, freshEnding: false });
        return;
      }
      set({ game, hydrated: true, freshEnding: false });
    },

    newGame() {
      clearToastTimers();
      const game = createGame(randomSeed(), Date.now());
      save(game);
      set({ game, hydrated: true, toasts: [], freshEnding: false });
    },

    dispatch(a) {
      const prev = get().game;
      if (!prev) return 'no game';
      let res: ReturnType<typeof reduce>;
      try {
        res = reduce(prev, a);
      } catch (e) {
        console.error('[game] reduce failed', a, e);
        return e instanceof Error ? e.message : 'error';
      }
      if (res.error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[game] action rejected', a.type, res.error);
        return res.error;
      }
      const game = res.state;
      save(game);
      const finishedNow = !isFinished(prev) && isFinished(game);
      set(finishedNow ? { game, freshEnding: true } : { game });
      toastsFromLog(res.log);
      if (finishedNow) onFinished(game);
      return undefined;
    },

    dismissToast(id) {
      const timer = toastTimers.get(id);
      if (timer) clearTimeout(timer);
      toastTimers.delete(id);
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },
  };
});
