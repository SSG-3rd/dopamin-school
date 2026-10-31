// 동아리방: 첫 방문은 동아리 선택(두 단계), 이후는 동아리 사건. 2학년 첫 방문에 '동아리 옮기기' 1회.
import { CAREER_TEXT, content, getClub } from '../content';
import { addCareerExp, applyEffects } from '../effects';
import { setChoice, setResult, since, type Ctx } from '../flow';
import { scaleStatGain } from '../rules';
import { lit, signed, tx } from '../text';
import type { ChoiceOption, GameState } from '../types';
import { pickEvent, showEvent } from './place';

const CLUB_JOIN_EXP = 3;
/** '친구 따라간다'의 인맥 상승(배율 적용 전) */
const FOLLOW_SOCIAL = 10;

export function startClub(d: GameState, ctx: Ctx): void {
  if (!d.clubId) {
    if (d.year >= 2) d.clubSwitchOffered = true;
    setChoice(d, {
      source: 'club_mode',
      title: tx('engine.club.modeTitle'),
      text: tx('engine.club.modeText'),
      options: [
        {
          id: 'follow',
          label: tx('engine.club.follow'),
          kind: 'special',
          action: 'club_follow',
          desc: tx('engine.club.followDesc', { social: signed(scaleStatGain(FOLLOW_SOCIAL)) }),
        },
        { id: 'choose', label: tx('engine.club.choose'), kind: 'special', action: 'club_choose', desc: tx('engine.club.chooseDesc') },
      ],
    });
    return;
  }
  const extra: ChoiceOption[] = [];
  if (d.year === 2 && !d.clubSwitchOffered) {
    d.clubSwitchOffered = true;
    extra.push({
      id: 'switch_club',
      label: tx('engine.club.switch'),
      kind: 'special',
      action: 'club_switch',
      desc: tx('engine.club.switchDesc'),
    });
  } else if (d.year >= 2) {
    d.clubSwitchOffered = true;
  }
  const e = pickEvent(d, ctx, 'club');
  if (!e) {
    const club = getClub(d.clubId)!;
    setResult(d, { source: 'event', title: club.name, text: tx('engine.club.quiet'), changes: [] });
    return;
  }
  showEvent(d, e, extra);
}

function clubPickOptions(d: GameState, mode: 'join' | 'switch'): ChoiceOption[] {
  return content.clubs
    .filter((c) => c.id !== d.clubId)
    .map((c) => ({
      id: `${mode}:${c.id}`,
      label: tx('fmt.iconName', { icon: lit(c.emoji), name: c.name }),
      kind: 'special' as const,
      action: mode === 'join' ? 'club_join' : 'club_switch_to',
      desc: tx('engine.club.pickDesc', { career: CAREER_TEXT[c.career], desc: c.desc }),
    }));
}

function joinClub(d: GameState, ctx: Ctx, clubId: string): void {
  const club = getClub(clubId)!;
  d.clubId = club.id;
  ctx.log.push({ kind: 'club', id: club.id });
  addCareerExp(d, club.career, CLUB_JOIN_EXP, ctx.log, true);
}

/** 동아리 관련 선택지 처리. 처리했으면 true */
export function handleClubAction(d: GameState, ctx: Ctx, opt: ChoiceOption): boolean {
  const start = ctx.log.length;
  switch (opt.action) {
    case 'club_follow': {
      const club = ctx.rng.pick(content.clubs);
      applyEffects(d, { stats: { social: FOLLOW_SOCIAL }, stress: -5 }, ctx.log);
      joinClub(d, ctx, club.id);
      setResult(d, {
        source: 'club_mode',
        title: tx('engine.club.joinedTitle', { emoji: lit(club.emoji), name: club.name }),
        text: tx('engine.club.followText', { name: club.name, desc: club.desc }),
        changes: since(ctx.log, start),
      });
      return true;
    }
    case 'club_choose': {
      applyEffects(d, { stress: 5 }, ctx.log);
      setChoice(d, {
        source: 'club_pick',
        title: tx('engine.club.pickTitle'),
        text: tx('engine.club.pickText'),
        options: clubPickOptions(d, 'join'),
      });
      return true;
    }
    case 'club_join': {
      const id = opt.id.split(':')[1];
      joinClub(d, ctx, id);
      const club = getClub(id)!;
      setResult(d, {
        source: 'club_pick',
        title: tx('engine.club.joinedTitle', { emoji: lit(club.emoji), name: club.name }),
        text: club.desc,
        changes: since(ctx.log, start),
      });
      return true;
    }
    case 'club_switch': {
      setChoice(d, {
        source: 'club_pick',
        title: tx('engine.club.switchTitle'),
        text: tx('engine.club.switchText'),
        options: clubPickOptions(d, 'switch'),
      });
      return true;
    }
    case 'club_switch_to': {
      const id = opt.id.split(':')[1];
      const club = getClub(id)!;
      d.clubId = club.id;
      ctx.log.push({ kind: 'club', id: club.id });
      setResult(d, {
        source: 'club_pick',
        title: tx('engine.club.movedTitle', { emoji: lit(club.emoji), name: club.name }),
        text: tx('engine.club.movedText'),
        changes: since(ctx.log, start),
      });
      return true;
    }
  }
  return false;
}
