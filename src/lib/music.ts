'use client';
// 배경음악: 음원 파일 없이 WebAudio로 그 자리에서 합성하는 16마디 반복곡 (직접 만든 곡).
// 다장조, 104BPM. 앞 8마디 C–G–Am–F–C–G–F–G, 뒤 8마디 F–G–Em–Am–Dm–G–C–C.
// 벨 같은 멜로디 + 통통 튀는 베이스 + 엇박 코드 + 아주 작은 북. 설정의 '배경음악'이 꺼져 있으면 멈춘다.
import { audio } from './sound';

const BPM = 104;
const EIGHTH = 60 / BPM / 2;
const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const VOLUME = 0.32;

// 8분음표 칸마다 음 이름. '-'는 앞 음을 이어 끌고, '.'는 쉼.
const MELODY = [
  'E5 G5 A5 G5 E5 - C5 -',
  'D5 E5 D5 B4 G4 - - -',
  'C5 E5 A5 G5 E5 - C5 D5',
  'C5 - A4 - C5 - - -',
  'E5 G5 C6 B5 A5 G5 E5 G5',
  'D5 - - B4 D5 G5 F5 D5',
  'C5 D5 E5 F5 A5 - G5 F5',
  'E5 - D5 - B4 - G4 -',
  'A5 - G5 F5 C5 - F5 -',
  'G5 - F5 D5 B4 - D5 -',
  'E5 - G5 - B5 - G5 E5',
  'C6 - B5 A5 E5 - - -',
  'F5 - E5 D5 A4 - D5 F5',
  'G5 - A5 - B5 - D6 -',
  'C6 - - G5 E5 - G5 -',
  'C5 - - - . . . .',
]
  .join(' ')
  .split(/\s+/);

const CHORDS = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'] as const;
type Chord = (typeof CHORDS)[number];

const CHORD_TONES: Record<Chord, string[]> = {
  C: ['C4', 'E4', 'G4'],
  G: ['B3', 'D4', 'G4'],
  Am: ['A3', 'C4', 'E4'],
  F: ['A3', 'C4', 'F4'],
  Em: ['B3', 'E4', 'G4'],
  Dm: ['A3', 'D4', 'F4'],
};
const BASS: Record<Chord, [string, string]> = {
  C: ['C3', 'G2'],
  G: ['G2', 'D3'],
  Am: ['A2', 'E3'],
  F: ['F2', 'C3'],
  Em: ['E2', 'B2'],
  Dm: ['D3', 'A2'],
};

const TOTAL_STEPS = MELODY.length;
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(name: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 440;
  const midi = 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;
let noise: AudioBuffer | null = null;
let wanted = false;
let nextLoop = 0;

function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  if (noise) return noise;
  const len = Math.floor(c.sampleRate * 0.3);
  noise = c.createBuffer(1, len, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(c: BaseAudioContext, t: number, peak: number, attack: number, hold: number, release: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(peak * 0.55, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

/** 멜로디: 삼각파 + 한 옥타브 위 사인파를 살짝 섞은 실로폰·오르골 같은 소리 */
function lead(c: BaseAudioContext, out: AudioNode, f: number, t: number, dur: number) {
  const g = envelope(c, t, 0.2, 0.012, Math.max(0.05, dur * 0.6), 0.22);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const o1 = c.createOscillator();
  o1.type = 'triangle';
  o1.frequency.setValueAtTime(f, t);
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(f * 2, t);
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  o1.connect(lp);
  o2.connect(g2).connect(lp);
  lp.connect(g).connect(out);
  const end = t + dur + 0.3;
  o1.start(t);
  o2.start(t);
  o1.stop(end);
  o2.stop(end);
}

function bass(c: BaseAudioContext, out: AudioNode, f: number, t: number, dur: number) {
  const g = envelope(c, t, 0.24, 0.01, dur * 0.5, 0.12);
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f, t);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.2);
}

/** 엇박 코드: 작게 퉁기는 우쿨렐레 느낌 */
function pluck(c: BaseAudioContext, out: AudioNode, tones: string[], t: number) {
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1500;
  const g = envelope(c, t, 0.05, 0.006, 0.04, 0.16);
  lp.connect(g).connect(out);
  tones.forEach((n, i) => {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(freq(n), t + i * 0.012);
    o.connect(lp);
    o.start(t + i * 0.012);
    o.stop(t + 0.3);
  });
}

function kick(c: BaseAudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  const g = envelope(c, t, 0.32, 0.004, 0.03, 0.12);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.2);
}

function tick(c: BaseAudioContext, out: AudioNode, t: number, kind: 'hat' | 'clap') {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = envelope(c, t, kind === 'hat' ? 0.035 : 0.06, 0.002, 0.01, kind === 'hat' ? 0.04 : 0.1);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.2);
}

function scheduleStep(c: BaseAudioContext, out: AudioNode, s: number, t: number, loop: number) {
  const bar = Math.floor(s / 8);
  const pos = s % 8;
  const chord = CHORDS[bar];

  const note = MELODY[s];
  if (note && note !== '-' && note !== '.') {
    let len = 1;
    while (MELODY[s + len] === '-') len++;
    lead(c, out, freq(note), t, len * EIGHTH);
  }

  const [root, fifth] = BASS[chord];
  if (pos === 0 || pos === 4) bass(c, out, freq(root), t, EIGHTH * 1.6);
  if (pos === 3 || pos === 6) bass(c, out, freq(fifth), t, EIGHTH * 1.2);

  if (pos % 2 === 1) pluck(c, out, CHORD_TONES[chord], t);

  // 첫 마디는 북 없이 시작해서 반복될 때부터 들어온다
  if (s >= 8 || loop > 0) {
    if (pos === 0 || pos === 4) kick(c, out, t);
    if (pos === 2 || pos === 6) tick(c, out, t, 'clap');
    if (pos % 2 === 1) tick(c, out, t, 'hat');
  }
}

function begin(c: AudioContext) {
  if (timer || !wanted) return;
  if (!master) {
    master = c.createGain();
    master.connect(c.destination);
  }
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(VOLUME, c.currentTime + 1.5);
  step = 0;
  nextLoop = 0;
  nextTime = c.currentTime + 0.08;
  const out = master;
  timer = setInterval(() => {
    while (nextTime < c.currentTime + LOOKAHEAD) {
      scheduleStep(c, out, step, nextTime, nextLoop);
      nextTime += EIGHTH;
      step += 1;
      if (step >= TOTAL_STEPS) {
        step = 0;
        nextLoop += 1;
      }
    }
  }, TICK_MS);
}

/** 배경음악 시작 (이미 재생 중이면 아무것도 안 함). 브라우저 정책상 첫 클릭·키 입력 뒤에야 소리가 난다. */
export function startMusic(): void {
  wanted = true;
  try {
    const c = audio();
    if (!c) return;
    if (c.state === 'running') {
      begin(c);
      return;
    }
    c.resume()
      .then(() => begin(c))
      .catch(() => undefined);
  } catch {
    // 소리는 없어도 된다
  }
}

export function stopMusic(): void {
  wanted = false;
  try {
    const c = audio();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (c && master) {
      const g = master;
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
      // 이미 예약된 음이 남아 있어도 들리지 않게 새 출력으로 바꾼다
      master = null;
      setTimeout(() => g.disconnect(), 600);
    }
  } catch {
    // 무시
  }
}

/** 곡 한 바퀴 길이(초) */
export const SONG_SECONDS = TOTAL_STEPS * EIGHTH;

/** 미리 듣기·검사용: 곡 전체를 한 번에 예약한다 (OfflineAudioContext에서도 쓴다) */
export function scheduleSong(c: BaseAudioContext, out: AudioNode, t0: number, loops = 1): void {
  const g = c.createGain();
  g.gain.value = VOLUME;
  g.connect(out);
  for (let l = 0; l < loops; l++) {
    for (let s = 0; s < TOTAL_STEPS; s++) scheduleStep(c, g, s, t0 + (l * TOTAL_STEPS + s) * EIGHTH, l);
  }
}

export function isMusicPlaying(): boolean {
  return timer != null;
}
