'use client';
// 배경음악: 음원 파일 없이 WebAudio로 그 자리에서 합성하는 16마디 반복곡 (직접 만든 곡).
// 평화롭지만 신나는 소풍 분위기: 다장조, 126BPM, 살짝 통통 튀는 스윙.
// 마림바 같은 멜로디 + 오르골 아르페지오 + 둥근 베이스 + 아주 작은 북과 셰이커, 부드러운 메아리.
// 길게 끄는 음이나 각진 파형(사각파·톱니파)은 쓰지 않는다 (웅웅거리는 소리가 나지 않게).
import { audio } from './sound';

const BPM = 126;
const EIGHTH = 60 / BPM / 2;
/** 엇박 8분음표를 이만큼 늦게 쳐서 통통 튀게 */
const SWING = EIGHTH * 0.2;
const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const VOLUME = 0.55;

// 8분음표 칸마다 음 이름. '-'는 앞 음을 조금 더 울리게, '.'는 쉼.
const MELODY = [
  // A: 밝고 통통 튀게
  'C5 E5 G5 E5 C6 - G5 -',
  'A5 G5 F5 E5 F5 - C5 -',
  'B4 D5 G5 F5 E5 D5 C5 B4',
  'C5 - E5 - G5 - . .',
  'A5 G5 E5 C5 E5 - A4 -',
  'F5 E5 F5 A5 C6 - A5 -',
  'D5 E5 F5 A5 G5 - F5 E5',
  'D5 - G5 - B5 - . .',
  // B: 조금 더 넓고 평화롭게
  'C6 - A5 - F5 - A5 C6',
  'B5 - G5 - D5 - G5 B5',
  'B5 - G5 E5 G5 - E5 -',
  'A5 - E5 C5 E5 - A5 -',
  'F5 G5 A5 C6 A5 G5 F5 A5',
  'G5 A5 B5 D6 B5 A5 G5 -',
  'C6 - G5 E5 G5 - E5 C5',
  'C5 - . . G4 - . .',
]
  .join(' ')
  .split(/\s+/);

const CHORDS = ['C', 'F', 'G', 'C', 'Am', 'F', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'] as const;
type Chord = (typeof CHORDS)[number];

/** 오르골 아르페지오용 화음 (뿌리, 3음, 5음, 옥타브 위 뿌리, 옥타브 위 3음) */
const ARP_TONES: Record<Chord, string[]> = {
  C: ['C4', 'E4', 'G4', 'C5', 'E5'],
  F: ['F4', 'A4', 'C5', 'F5', 'A5'],
  G: ['G4', 'B4', 'D5', 'G5', 'B5'],
  Am: ['A4', 'C5', 'E5', 'A5', 'C6'],
  Dm: ['D4', 'F4', 'A4', 'D5', 'F5'],
  Em: ['E4', 'G4', 'B4', 'E5', 'G5'],
};
const ARP_PATTERN = [0, 2, 3, 2, 4, 2, 3, 2];

const BASS: Record<Chord, [string, string]> = {
  C: ['C3', 'G2'],
  F: ['F2', 'C3'],
  G: ['G2', 'D3'],
  Am: ['A2', 'E3'],
  Dm: ['D3', 'A2'],
  Em: ['E2', 'B2'],
};

const TOTAL_STEPS = MELODY.length;
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(name: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 440;
  const midi = 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

interface Bus {
  /** 페이드 인·아웃을 거는 맨 끝 볼륨 */
  master: GainNode;
  /** 그대로 나가는 소리 */
  dry: GainNode;
  /** 메아리로 보내는 소리 */
  send: GainNode;
}

/** 출력 묶음: dry + 부드러운 메아리(딜레이) → master → 스피커 */
function createBus(c: BaseAudioContext, dest: AudioNode, volume: number): Bus {
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(dest);
  const dry = c.createGain();
  dry.connect(master);
  const send = c.createGain();
  send.gain.value = 0.22;
  const delay = c.createDelay(1);
  delay.delayTime.value = EIGHTH * 1.5;
  const fb = c.createGain();
  fb.gain.value = 0.28;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2800;
  send.connect(delay);
  delay.connect(tone);
  tone.connect(fb);
  fb.connect(delay);
  tone.connect(master);
  return { master, dry, send };
}

/** 짧게 튕기는 소리 하나 (사인파 + 배음). 소리는 금방 사라진다. */
function mallet(
  c: BaseAudioContext,
  outs: AudioNode[],
  f: number,
  t: number,
  peak: number,
  decay: number,
  partials: [number, number, number][],
) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  for (const o of outs) g.connect(o);
  for (const [mult, amp, pDecay] of partials) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * mult, t);
    const pg = c.createGain();
    pg.gain.setValueAtTime(amp, t);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + pDecay);
    osc.connect(pg).connect(g);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/** 멜로디: 마림바 (기본음 + 짧게 반짝이는 4배음) */
function lead(c: BaseAudioContext, bus: Bus, f: number, t: number, len: number) {
  const decay = Math.min(0.9, 0.32 + len * 0.12);
  mallet(c, [bus.dry, bus.send], f, t, 0.22, decay, [
    [1, 1, decay],
    [4, 0.28, 0.06],
    [2, 0.12, decay * 0.5],
  ]);
}

/** 오르골 아르페지오: 높고 작게 반짝 */
function arp(c: BaseAudioContext, bus: Bus, f: number, t: number) {
  mallet(c, [bus.dry, bus.send], f, t, 0.055, 0.28, [
    [1, 1, 0.28],
    [3, 0.25, 0.08],
  ]);
}

/** 둥근 베이스: 사인파, 짧게 */
function bass(c: BaseAudioContext, bus: Bus, f: number, t: number) {
  mallet(c, [bus.dry], f, t, 0.26, 0.32, [
    [1, 1, 0.32],
    [2, 0.18, 0.12],
  ]);
}

let noise: AudioBuffer | null = null;
function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise;
  const len = Math.floor(c.sampleRate * 0.2);
  noise = c.createBuffer(1, len, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function kick(c: BaseAudioContext, bus: Bus, t: number) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(bus.dry);
  o.start(t);
  o.stop(t + 0.16);
}

/** 손뼉(snap)과 셰이커: 아주 짧은 잡음 */
function noiseHit(c: BaseAudioContext, bus: Bus, t: number, kind: 'snap' | 'shaker', accent = false) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = kind === 'snap' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 'snap' ? 2600 : 8000;
  if (kind === 'snap') f.Q.value = 1.2;
  const g = c.createGain();
  const peak = kind === 'snap' ? 0.07 : accent ? 0.022 : 0.012;
  const dur = kind === 'snap' ? 0.07 : 0.035;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus.dry);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** 8분음표 한 칸 연주. t는 박자 그대로의 시간(스윙은 여기서 더한다). */
function scheduleStep(c: BaseAudioContext, bus: Bus, s: number, t0: number, loop: number) {
  const bar = Math.floor(s / 8);
  const pos = s % 8;
  const chord = CHORDS[bar];
  const t = t0 + (pos % 2 === 1 ? SWING : 0);

  const note = MELODY[s];
  if (note && note !== '-' && note !== '.') {
    let len = 1;
    while (MELODY[s + len] === '-') len++;
    lead(c, bus, freq(note), t, len);
  }

  arp(c, bus, freq(ARP_TONES[chord][ARP_PATTERN[pos]]), t);

  const [root, fifth] = BASS[chord];
  if (pos === 0) bass(c, bus, freq(root), t);
  if (pos === 3) bass(c, bus, freq(root) * 2, t);
  if (pos === 4) bass(c, bus, freq(fifth), t);
  if (pos === 6) bass(c, bus, freq(root), t);

  // 첫 두 마디는 북 없이 가볍게, 그다음부터 통통
  if (s >= 16 || loop > 0) {
    if (pos === 0 || pos === 4) kick(c, bus, t);
    if (pos === 2 || pos === 6) noiseHit(c, bus, t, 'snap');
  }
  noiseHit(c, bus, t, 'shaker', pos % 2 === 1);
}

// ───────── 재생 제어 ─────────
let bus: Bus | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let loopCount = 0;
let nextTime = 0;
let wanted = false;

function begin(c: AudioContext) {
  if (timer || !wanted) return;
  const b = createBus(c, c.destination, 0.0001);
  b.master.gain.setValueAtTime(0.0001, c.currentTime);
  b.master.gain.exponentialRampToValueAtTime(VOLUME, c.currentTime + 1.2);
  bus = b;
  step = 0;
  loopCount = 0;
  nextTime = c.currentTime + 0.06;
  timer = setInterval(() => {
    if (!bus) return;
    while (nextTime < c.currentTime + LOOKAHEAD) {
      scheduleStep(c, bus, step, nextTime, loopCount);
      nextTime += EIGHTH;
      step += 1;
      if (step >= TOTAL_STEPS) {
        step = 0;
        loopCount += 1;
      }
    }
  }, TICK_MS);
}

/** iOS 등에서 첫 터치 안에 소리를 한 번 내야 오디오가 풀린다 */
export function unlockAudio(): void {
  try {
    const c = audio();
    if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => undefined);
    const b = c.createBuffer(1, 1, c.sampleRate);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
  } catch {
    // 무시
  }
}

/** 배경음악 시작 (이미 재생 중이면 아무것도 안 함). 브라우저가 막으면 첫 클릭·터치·키 입력 때 시작된다. */
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
      .then(() => {
        if (c.state === 'running') begin(c);
      })
      .catch(() => undefined);
  } catch {
    // 소리는 없어도 된다
  }
}

/** 배경음악 멈춤: 바로 작게 줄이고, 이미 예약된 음도 들리지 않게 출력 자체를 끊는다 */
export function stopMusic(): void {
  wanted = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const b = bus;
  bus = null;
  if (!b) return;
  try {
    const c = audio();
    if (c) {
      b.master.gain.cancelScheduledValues(c.currentTime);
      b.master.gain.setValueAtTime(Math.max(0.0001, b.master.gain.value), c.currentTime);
      b.master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    }
    setTimeout(() => {
      try {
        b.master.disconnect();
      } catch {
        // 이미 끊김
      }
    }, 200);
  } catch {
    // 무시
  }
}

export function isMusicPlaying(): boolean {
  return timer != null;
}

/** 음악을 켜 두었는데 브라우저가 아직 소리를 막고 있는지 (첫 입력 전) */
export function musicBlocked(): boolean {
  if (!wanted || timer) return false;
  const c = audio();
  return !!c && c.state !== 'running';
}

/** 곡 한 바퀴 길이(초) */
export const SONG_SECONDS = TOTAL_STEPS * EIGHTH;

/** 미리 듣기·검사용: 곡 전체를 한 번에 예약한다 (OfflineAudioContext에서도 쓴다) */
export function scheduleSong(c: BaseAudioContext, out: AudioNode, t0: number, loops = 1): void {
  const b = createBus(c, out, VOLUME);
  for (let l = 0; l < loops; l++) {
    for (let s = 0; s < TOTAL_STEPS; s++) scheduleStep(c, b, s, t0 + (l * TOTAL_STEPS + s) * EIGHTH, l);
  }
}
