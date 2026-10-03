import type { GameState } from './types';

export function newGame(seed: number, now: number): GameState {
  return {
    version: 1,
    seed,
    rngState: seed | 0,
    phase: 'trait_select',
    traitId: '',
    year: 1,
    position: 0,
    turn: 0,
    stats: { study: 0, stamina: 0, social: 0, luck: 0 },
    stress: 0,
    money: 0,
    careerExp: { academic: 0, sports: 0, arts: 0, comm: 0, biz: 0 },
    clubId: null,
    routeId: null,
    buffs: [],
    debuffs: [],
    records: { examPass: 0, award: 0, praise: 0, late: 0 },
    flags: [],
    abilityUses: 0,
    seenEvents: [],
    finalExamBonus: false,
    startedAt: now,
    queue: [],
    burnoutPending: false,
    clubSwitchOffered: false,
    visitedClub: false,
    tick: 0,
  };
}
