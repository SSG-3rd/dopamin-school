// 동아리방: 첫 방문은 동아리 선택(두 단계), 이후는 동아리 사건. 2학년 첫 방문에 '동아리 옮기기' 1회.
import { CAREER_NAMES, content, getClub } from '../content';
import { addCareerExp, applyEffects } from '../effects';
import { setChoice, setResult, since, type Ctx } from '../flow';
import type { ChoiceOption, GameState } from '../types';
import { pickEvent, showEvent } from './place';

const CLUB_JOIN_EXP = 3;

export function startClub(d: GameState, ctx: Ctx): void {
  if (!d.clubId) {
    if (d.year >= 2) d.clubSwitchOffered = true;
    setChoice(d, {
      source: 'club_mode',
      title: '동아리 가입',
      text: '동아리방 앞 게시판이 신입 부원 모집 포스터로 가득하다. 어떻게 정할까?',
      options: [
        { id: 'follow', label: '친구 따라간다', kind: 'special', action: 'club_follow', desc: '동아리 무작위 · 인맥 +10 · 스트레스 −5' },
        { id: 'choose', label: '내가 고른다', kind: 'special', action: 'club_choose', desc: '원하는 동아리 · 스트레스 +5' },
      ],
    });
    return;
  }
  const extra: ChoiceOption[] = [];
  if (d.year === 2 && !d.clubSwitchOffered) {
    d.clubSwitchOffered = true;
    extra.push({
      id: 'switch_club',
      label: '동아리 옮기기',
      kind: 'special',
      action: 'club_switch',
      desc: '경험치는 유지, 배율만 새 분야로',
    });
  } else if (d.year >= 2) {
    d.clubSwitchOffered = true;
  }
  const e = pickEvent(d, ctx, 'club');
  if (!e) {
    const club = getClub(d.clubId)!;
    setResult(d, { source: 'event', title: club.name, text: '동아리방이 조용하다. 오늘은 각자 쉬는 날.', changes: [] });
    return;
  }
  showEvent(d, e, extra);
}

function clubPickOptions(d: GameState, mode: 'join' | 'switch'): ChoiceOption[] {
  return content.clubs
    .filter((c) => c.id !== d.clubId)
    .map((c) => ({
      id: `${mode}:${c.id}`,
      label: `${c.emoji} ${c.name}`,
      kind: 'special' as const,
      action: mode === 'join' ? 'club_join' : 'club_switch_to',
      desc: `${CAREER_NAMES[c.career]} 분야 · ${c.desc}`,
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
      applyEffects(d, { stats: { social: 10 }, stress: -5 }, ctx.log);
      joinClub(d, ctx, club.id);
      setResult(d, {
        source: 'club_mode',
        title: `${club.emoji} ${club.name} 가입!`,
        text: `친구 손에 이끌려 들어간 곳은 ${club.name}. ${club.desc}`,
        changes: since(ctx.log, start),
      });
      return true;
    }
    case 'club_choose': {
      applyEffects(d, { stress: 5 }, ctx.log);
      setChoice(d, {
        source: 'club_pick',
        title: '어떤 동아리에 들어갈까?',
        text: '가입한 동아리 분야는 진로 경험치를 1.5배로 얻는다.',
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
        title: `${club.emoji} ${club.name} 가입!`,
        text: club.desc,
        changes: since(ctx.log, start),
      });
      return true;
    }
    case 'club_switch': {
      setChoice(d, {
        source: 'club_pick',
        title: '어느 동아리로 옮길까?',
        text: '쌓은 경험치는 그대로, 1.5배 배율만 새 분야로 바뀐다.',
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
        title: `${club.emoji} ${club.name}(으)로 이동`,
        text: '새 동아리 사람들이 반갑게 맞아 준다.',
        changes: since(ctx.log, start),
      });
      return true;
    }
  }
  return false;
}
