'use client';
// 아주 작은 WebAudio 효과음. 소리 설정(useSettings().sound)이 꺼져 있거나
// AudioContext를 쓸 수 없는 환경이면 조용히 아무것도 하지 않는다.
import { useSettings } from './settings';

export type SoundName = 'roll' | 'step' | 'click' | 'success' | 'critical' | 'fail' | 'fumble' | 'levelup' | 'coin' | 'reveal';

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let unavailable = false;

function audio(): AudioContext | null {
  if (unavailable) return null;
  if (ctx) return ctx;
  try {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const C = w.AudioContext ?? w.webkitAudioContext;
    if (!C) {
      unavailable = true;
      return null;
    }
    ctx = new C();
    return ctx;
  } catch {
    unavailable = true;
    return null;
  }
}

/** [주파수, 시작(초), 길이(초), 파형, 끝 주파수] */
type Note = [number, number, number, OscillatorType?, number?];

const PATTERNS: Record<SoundName, { notes: Note[]; gain: number }> = {
  roll: {
    gain: 0.05,
    notes: [
      [320, 0, 0.04, 'square'],
      [260, 0.06, 0.04, 'square'],
      [360, 0.12, 0.04, 'square'],
      [280, 0.18, 0.04, 'square'],
      [420, 0.24, 0.05, 'square'],
    ],
  },
  step: { gain: 0.04, notes: [[660, 0, 0.05, 'triangle', 880]] },
  click: { gain: 0.05, notes: [[520, 0, 0.05, 'triangle']] },
  success: {
    gain: 0.07,
    notes: [
      [523, 0, 0.1, 'triangle'],
      [784, 0.1, 0.16, 'triangle'],
    ],
  },
  critical: {
    gain: 0.07,
    notes: [
      [523, 0, 0.08, 'triangle'],
      [659, 0.08, 0.08, 'triangle'],
      [784, 0.16, 0.08, 'triangle'],
      [1047, 0.24, 0.24, 'triangle'],
    ],
  },
  fail: {
    gain: 0.06,
    notes: [
      [330, 0, 0.12, 'sawtooth', 300],
      [247, 0.13, 0.22, 'sawtooth', 220],
    ],
  },
  fumble: {
    gain: 0.06,
    notes: [
      [300, 0, 0.12, 'sawtooth', 260],
      [220, 0.12, 0.12, 'sawtooth', 190],
      [150, 0.24, 0.3, 'sawtooth', 110],
    ],
  },
  levelup: {
    gain: 0.06,
    notes: [
      [587, 0, 0.08, 'square'],
      [740, 0.08, 0.08, 'square'],
      [880, 0.16, 0.08, 'square'],
      [1175, 0.24, 0.2, 'square'],
    ],
  },
  coin: {
    gain: 0.05,
    notes: [
      [988, 0, 0.06, 'square'],
      [1319, 0.06, 0.16, 'square'],
    ],
  },
  reveal: {
    gain: 0.07,
    notes: [
      [392, 0, 0.12, 'triangle'],
      [523, 0.12, 0.12, 'triangle'],
      [659, 0.24, 0.12, 'triangle'],
      [784, 0.36, 0.35, 'triangle'],
    ],
  },
};

export function playSound(name: SoundName): void {
  try {
    if (!useSettings.getState().sound) return;
    const c = audio();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(() => undefined);
    }
    const { notes, gain } = PATTERNS[name];
    const t0 = c.currentTime + 0.01;
    for (const [freq, at, dur, type = 'sine', slideTo] of notes) {
      const osc = c.createOscillator();
      const g = c.createGain();
      const start = t0 + at;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    }
  } catch {
    // 소리는 없어도 된다
  }
}
