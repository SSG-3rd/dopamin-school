'use client';
// 배경음악: public/audio/turning-point-bgm.mp3 를 처음부터 끝까지 반복 재생한다.
// 음원은 웹용으로 다듬어 두었다 (끝의 무음 정리, 음량 −20 LUFS, 128kbps).
// 끄면 그 자리에서 멈추고, 다시 켜면 멈춘 곳부터 이어서 나온다.
import { audio } from './sound';

const SRC = '/audio/turning-point-bgm.mp3';
/** 효과음보다 살짝 뒤에 깔리게. iOS는 음량 조절을 막아 두어서 이 값과 상관없이 원래 크기로 나온다. */
const VOLUME = 0.8;
const FADE_IN_MS = 1200;
const FADE_OUT_MS = 150;

let el: HTMLAudioElement | null = null;
let wanted = false;
let blocked = false;
let fade: ReturnType<typeof setInterval> | null = null;

function element(): HTMLAudioElement | null {
  if (el) return el;
  if (typeof Audio === 'undefined') return null;
  try {
    el = new Audio(SRC);
    el.loop = true;
    el.preload = 'auto';
    return el;
  } catch {
    return null;
  }
}

/** 음량을 ms 동안 to까지 바꾼 뒤 done을 부른다 (음량을 못 바꾸는 기기에서는 바로 끝난다) */
function fadeTo(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  if (fade) clearInterval(fade);
  const from = a.volume;
  const start = performance.now();
  fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - start) / ms);
    try {
      a.volume = from + (to - from) * k;
    } catch {
      // 음량을 못 바꾸는 기기
    }
    if (k >= 1) {
      if (fade) clearInterval(fade);
      fade = null;
      done?.();
    }
  }, 30);
}

/** iOS 등에서 첫 터치 안에 소리를 한 번 내야 효과음(WebAudio)이 풀린다 */
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

/** 배경음악 시작 (이미 재생 중이면 아무것도 안 함). 브라우저가 막으면 첫 클릭·터치·키 입력 때 다시 부르면 된다. */
export function startMusic(): void {
  wanted = true;
  const a = element();
  if (!a) return;
  if (!a.paused && !fade) return;
  if (a.paused) {
    try {
      a.volume = 0;
    } catch {
      // 무시
    }
  }
  let p: Promise<void> | undefined;
  try {
    p = a.play();
  } catch {
    blocked = true;
    return;
  }
  const onPlaying = () => {
    blocked = false;
    if (!wanted) {
      a.pause();
      return;
    }
    fadeTo(a, VOLUME, FADE_IN_MS);
  };
  if (p && typeof p.then === 'function') {
    p.then(onPlaying).catch(() => {
      // 첫 입력 전이라 막힘 (NotAllowedError)
      blocked = wanted;
    });
  } else {
    onPlaying();
  }
}

/** 배경음악 멈춤: 아주 짧게 줄인 뒤 그 자리에서 멈춘다 */
export function stopMusic(): void {
  wanted = false;
  blocked = false;
  const a = el;
  if (!a || a.paused) return;
  fadeTo(a, 0, FADE_OUT_MS, () => {
    if (!wanted) a.pause();
  });
}

export function isMusicPlaying(): boolean {
  return !!el && !el.paused && wanted;
}

/** 음악을 켜 두었는데 브라우저가 아직 소리를 막고 있는지 (첫 입력 전) */
export function musicBlocked(): boolean {
  return wanted && blocked;
}
