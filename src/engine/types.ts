// 게임 엔진 타입. 이 폴더는 React·브라우저 API를 import하지 않는다.

export const STATS = ['study', 'stamina', 'social', 'luck'] as const;
export const CAREERS = ['academic', 'sports', 'arts', 'comm', 'biz'] as const;

export type Stat = (typeof STATS)[number]; // 학업·체력·인맥·운
export type Career = (typeof CAREERS)[number]; // 학문·운동·예술·소통·경영
export type CheckBy = Stat | Career | 'club';

export type Phase =
  | 'trait_select'
  | 'enroll_roll'
  | 'await_roll'
  | 'moving'
  | 'tile_event'
  | 'choice'
  | 'judge'
  | 'result'
  | 'shop'
  | 'route_select'
  | 'burnout'
  | 'graduation'
  | 'ending';

export type OptionKind = 'growth' | 'rest' | 'adventure' | 'special';
export type Outcome = 'critical' | 'success' | 'fail' | 'fumble';
export type Grade = 'top' | 'mid' | 'low';
export type RecordKey = 'examPass' | 'award' | 'praise' | 'late';

export interface Records {
  examPass: number;
  award: number;
  praise: number;
  late: number;
}

export type BuffRef = string | { id: string; field: Career };

/** 사건·선택지·아이템이 일으키는 변화. 키는 이 목록만 허용한다. */
export interface Effects {
  stats?: Partial<Record<Stat, number>>;
  stress?: number;
  money?: number;
  career?: Partial<Record<Career | 'club', number>>;
  records?: Partial<Records>;
  buff?: BuffRef;
  debuff?: string;
  flag?: string;
}

export interface Check {
  by: CheckBy;
  diff: number;
}

export type Unlock = { career: Career; level: number } | { buff: string };

export interface Requirement {
  stats?: Partial<Record<Stat, number>>;
  career?: Partial<Record<Career, number>>;
  money?: number;
}

/** 화면에 보여 줄 선택지 하나. 사건 JSON의 선택지와 코너 칸의 선택지가 같은 틀을 쓴다. */
export interface ChoiceOption {
  id: string;
  label: string;
  kind: OptionKind;
  tags?: string[];
  unlock?: Unlock;
  require?: Requirement;
  effects?: Effects;
  check?: Check;
  onSuccess?: Effects;
  onFail?: Effects;
  resultText?: { success?: string; fail?: string; done?: string };
  /** 엔진 전용 처리(시험 전략, 동아리 가입 등). 콘텐츠 사건에는 없다. */
  action?: string;
  /** 판정 보정(시험 전략 등) */
  judgeMod?: number;
  /** 판정 뒤에 붙는 부가 효과(시험 전략 등) */
  after?: Effects;
  desc?: string;
}

export interface ActiveBuff {
  id: string;
  /** 'moves' 버프의 남은 칸 수 */
  remaining?: number;
  /** 연습벌레의 대상 분야 */
  field?: Career;
  gainedAt: number;
}

export interface JudgeBonus {
  label: string;
  value: number;
}

export interface JudgeResult {
  by: CheckBy;
  /** 'club'을 실제 분야로 풀어 쓴 값 */
  resolvedBy: Stat | Career;
  diff: number;
  dice: [number, number];
  bonuses: JudgeBonus[];
  total: number;
  outcome: Outcome;
  /** 운빨형 능력으로 대실패를 실패로 바꿈 */
  converted?: boolean;
}

export type Change =
  | { kind: 'stat'; key: Stat; delta: number; value: number }
  | { kind: 'stress'; delta: number; value: number }
  | { kind: 'money'; delta: number; value: number }
  | { kind: 'career'; key: Career; delta: number; exp: number; level: number; levelUp: boolean }
  | { kind: 'record'; key: RecordKey; delta: number }
  | { kind: 'buff'; id: string; gained: boolean; debuff?: boolean }
  | { kind: 'flag'; id: string }
  | { kind: 'club'; id: string }
  | { kind: 'route'; id: string }
  | { kind: 'note'; text: string };

export type PendingSource =
  | 'event'
  | 'counsel'
  | 'pick'
  | 'cafeteria'
  | 'treat'
  | 'nurse'
  | 'staffroom'
  | 'surprise'
  | 'exam'
  | 'vacation'
  | 'route'
  | 'club_mode'
  | 'club_pick'
  | 'allowance'
  | 'enroll'
  | 'burnout'
  | 'graduation'
  | 'shop';

/** 지금 보여 줄 사건·선택지·판정 결과 */
export interface PendingEvent {
  source: PendingSource;
  eventId?: string;
  tile?: number;
  icon?: string;
  title: string;
  text: string;
  options?: ChoiceOption[];
  /** 고른 선택지 (판정 중·결과 표시 중) */
  chosen?: ChoiceOption;
  judge?: JudgeResult;
  /** 결과 화면 */
  resultText?: string;
  changes?: Change[];
  /** 인싸형 능력: 이번 판정 기준을 인맥으로 */
  abilityArmed?: boolean;
  /** 상점 */
  shopItems?: string[];
  bought?: string[];
  /** 입학 주사위 */
  enrollDie?: number;
  /** 다음에 고를 하위 선택(원하는 능력치·진로) */
  pickFor?: 'stat5' | 'career3' | 'career3_trust' | 'enroll_stat';
  /** 시험 */
  examKind?: 'regular' | 'mock' | 'final';
  examCareer?: Career;
}

export interface MoveState {
  die: number;
  remaining: number;
  from: number;
}

export type Step =
  | 'promo_allowance'
  | 'route'
  | 'winter'
  | 'shop'
  | 'ability_reset'
  | 'summer_allowance'
  | 'summer'
  | 'treat';

export interface Candidate {
  id: string; // 'field:arts' | 'combo:academic+arts'
  label: string;
  weight: number;
  probability: number;
}

export type SequenceStep = 'roulette' | 'fail_scene' | 'phone_call' | 'grade_roll' | 'reveal';

export interface EndingResult {
  kind: 'normal' | 'combo' | 'miracle' | 'rescue' | 'explore';
  jobId: string;
  jobName: string;
  /** 직업이 속한 분야 묶음 (예: 'academic', 'arts_music', 'combo:sports+arts') */
  track?: string;
  grade?: Grade;
  candidates: Candidate[];
  /** 룰렛이 처음 멈춘 후보와 최종 후보 */
  firstPick?: string;
  pick?: string;
  rerolled: boolean;
  /** 운 60 이상: 다시 돌릴지 고르는 중 */
  awaitingReroll?: boolean;
  graduationRoll?: { dice: [number, number]; bonus: number; total: number; bonuses: JudgeBonus[] };
  epilogue: string[];
  sequence: SequenceStep[];
  rescueFriend?: string;
  flavor?: string;
}

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  phase: Phase;
  traitId: string;
  year: 1 | 2 | 3;
  position: number;
  turn: number;
  stats: Record<Stat, number>;
  stress: number;
  money: number;
  careerExp: Record<Career, number>;
  clubId: string | null;
  routeId: string | null;
  buffs: ActiveBuff[];
  debuffs: ActiveBuff[];
  records: Records;
  flags: string[];
  abilityUses: number;
  seenEvents: string[];
  pending?: PendingEvent;
  finalExamBonus: boolean;
  ending?: EndingResult;
  startedAt: number;
  endedAt?: number;
  // 엔진 진행용 보조 값
  move?: MoveState;
  queue: Step[];
  burnoutPending: boolean;
  clubSwitchOffered: boolean;
  visitedClub: boolean;
  /** 같은 버프가 언제 얻어졌는지 비교하기 위한 증가값 */
  tick: number;
}

export type Action =
  | { type: 'SELECT_TRAIT'; traitId: string }
  | { type: 'ROLL_ENROLL' }
  | { type: 'ENROLL_PICK_STAT'; stat: Stat }
  | { type: 'ROLL_MOVE' }
  | { type: 'STEP_DONE' }
  | { type: 'CHOOSE'; optionId: string }
  | { type: 'USE_ABILITY' }
  | { type: 'CONTINUE' }
  | { type: 'BUY'; itemId: string }
  | { type: 'LEAVE_SHOP' }
  | { type: 'SELECT_ROUTE'; routeId: string }
  | { type: 'ROULETTE_REROLL'; accept: boolean };

export interface ReduceResult {
  state: GameState;
  log: Change[];
  /** 잘못된 액션이면 이유 */
  error?: string;
}
