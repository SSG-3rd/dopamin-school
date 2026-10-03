// 시드 난수 (mulberry32). 다음 상태를 GameState.rngState에 저장해
// 저장 후 다시 열어도 같은 결과가 나온다.

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** 0 ~ n-1 정수 */
  int(n: number): number;
  /** 1 ~ 6 */
  d6(): number;
  pick<T>(items: readonly T[]): T;
  /** 가중치 비례 추첨, 고른 인덱스 반환 */
  weighted(weights: readonly number[]): number;
  readonly state: number;
}

export function mulberry32Step(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

export function createRng(initialState: number): Rng {
  let s = initialState | 0;
  const rng: Rng = {
    next() {
      const r = mulberry32Step(s);
      s = r.state;
      return r.value;
    },
    int(n: number) {
      return Math.floor(rng.next() * n);
    },
    d6() {
      return rng.int(6) + 1;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[rng.int(items.length)];
    },
    weighted(weights: readonly number[]) {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) return 0;
      let r = rng.next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
    get state() {
      return s;
    },
  };
  return rng;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
