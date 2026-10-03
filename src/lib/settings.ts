'use client';
// 'yd:settings' — 빠른 진행, 소리, 부스 모드
import { create } from 'zustand';
import { KEYS, readJSON, writeJSON } from './storage';

export interface Settings {
  fast: boolean;
  sound: boolean;
  booth: boolean;
}

function defaults(): Settings {
  let reduced = false;
  try {
    reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reduced = false;
  }
  return { fast: reduced, sound: true, booth: false };
}

export function loadSettings(): Settings {
  const d = defaults();
  const saved = readJSON<Partial<Settings>>(KEYS.settings, {});
  return {
    fast: typeof saved.fast === 'boolean' ? saved.fast : d.fast,
    sound: typeof saved.sound === 'boolean' ? saved.sound : d.sound,
    booth: typeof saved.booth === 'boolean' ? saved.booth : d.booth,
  };
}

interface SettingsStore extends Settings {
  loaded: boolean;
  load(): void;
  set(patch: Partial<Settings>): void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  fast: false,
  sound: true,
  booth: false,
  loaded: false,
  load() {
    if (get().loaded) return;
    set({ ...loadSettings(), loaded: true });
  },
  set(patch) {
    const next = { fast: get().fast, sound: get().sound, booth: get().booth, ...patch };
    writeJSON(KEYS.settings, next);
    set(next);
  },
}));
