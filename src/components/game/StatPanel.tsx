'use client';
import type { ReactNode } from 'react';
import { activeBuffViews, getAbilityView } from '@/engine/view';
import { CAREER_ICONS, CAREER_NAMES, STAT_ICONS, STAT_NAMES, content, findTrait, getClub, getRoute } from '@/engine/content';
import { formatMoney, levelProgress, statBonus, stressTier } from '@/engine/rules';
import { CAREERS, STATS } from '@/engine/types';
import type { GameState } from '@/engine/types';
import { Bar, Card, Chip, Stars } from '@/components/ui';
import { CAREER_COLORS, STAT_COLORS, STRESS_META, signed } from './meta';

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 text-lg text-ink">{children}</h3>;
}

export function StatRows({ game }: { game: GameState }) {
  return (
    <ul className="flex flex-col gap-2">
      {STATS.map((s) => {
        const v = game.stats[s];
        const b = statBonus(v);
        return (
          <li key={s} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-2">
            <span className="whitespace-nowrap">
              <span aria-hidden="true">{STAT_ICONS[s]}</span> {STAT_NAMES[s]}
            </span>
            <Bar value={v} color={STAT_COLORS[s]} label={`${STAT_NAMES[s]} ${v} / 100, 판정 ${signed(b)}`} />
            <span className="text-right font-display text-lg tabular-nums">{v}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function StressGauge({ stress }: { stress: number }) {
  const tier = stressTier(stress);
  const meta = STRESS_META[tier.id];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <span aria-hidden="true">{meta.icon}</span> 스트레스 ·{' '}
          <strong className="font-display text-lg font-normal">{tier.label}</strong>
        </span>
        <span className="font-display text-lg tabular-nums">{stress}</span>
      </div>
      <div className="relative mt-1">
        <Bar value={stress} color={meta.color} label={`스트레스 ${stress} / 100, ${tier.label}`} className="h-4" />
        {/* 단계 눈금: 30·60·80 */}
        {[30, 60, 80].map((m) => (
          <span key={m} aria-hidden="true" className="absolute top-0 h-4 w-0.5 bg-ink/25" style={{ left: `${m}%` }} />
        ))}
      </div>
      <p className="mt-1 text-base text-muted">{tier.effect}</p>
    </div>
  );
}

export function CareerRows({ game }: { game: GameState }) {
  return (
    <ul className="flex flex-col gap-2">
      {CAREERS.map((c) => {
        const p = levelProgress(game.careerExp[c]);
        const span = p.to == null ? 1 : p.to - p.from;
        const into = p.to == null ? 1 : p.exp - p.from;
        return (
          <li key={c} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="whitespace-nowrap">
                <span aria-hidden="true">{CAREER_ICONS[c]}</span> {CAREER_NAMES[c]}
              </span>
              <span className="flex items-center gap-1.5">
                <Stars level={p.level} className="text-lg" />
                <span className="font-display tabular-nums">Lv{p.level}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Bar
                value={into}
                max={span}
                color={CAREER_COLORS[c]}
                label={`${CAREER_NAMES[c]} 경험치 ${p.exp}${p.to != null ? ` / ${p.to}` : ' (최고 레벨)'}`}
                className="h-2 flex-1"
              />
              <span className="w-14 text-right text-base tabular-nums text-muted">
                {p.to != null ? `${p.exp}/${p.to}` : 'MAX'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 상태 패널 전체 (§8 오른쪽 패널) */
export function StatPanel({ game, className = '' }: { game: GameState; className?: string }) {
  const trait = findTrait(game.traitId);
  const ability = getAbilityView(game);
  const buffs = activeBuffViews(game);
  const club = getClub(game.clubId);
  const route = getRoute(game.routeId);
  const tile = content.board[game.position];
  const r = game.records;

  return (
    <Card className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-2xl leading-none">
          {game.year}학년 · {game.turn}턴
        </p>
        {tile && (
          <Chip tone="info">
            <span aria-hidden="true">📍</span> {tile.name}
          </Chip>
        )}
      </div>

      <section aria-label="기본 능력치">
        <SectionTitle>능력치</SectionTitle>
        <StatRows game={game} />
      </section>

      <section aria-label="스트레스">
        <StressGauge stress={game.stress} />
      </section>

      <section aria-label="돈" className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
        <span>
          <span aria-hidden="true">💰</span> 돈
        </span>
        <span className="font-display text-xl tabular-nums">{formatMoney(game.money)}</span>
      </section>

      <section aria-label="진로 레벨">
        <SectionTitle>진로</SectionTitle>
        <CareerRows game={game} />
      </section>

      <section aria-label="버프">
        <SectionTitle>버프</SectionTitle>
        {buffs.length === 0 ? (
          <p className="text-base text-muted">지금은 없음</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {buffs.map((b) => (
              <li
                key={`${b.id}-${b.debuff ? 'd' : 'b'}`}
                className={`rounded-xl border-2 px-2.5 py-1.5 ${b.debuff ? 'border-danger/40 bg-danger/10' : 'border-mint/40 bg-mint/10'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display">
                    <span aria-hidden="true">{b.emoji}</span> {b.debuff ? '디버프 · ' : ''}
                    {b.name}
                  </span>
                  {b.remaining != null && (
                    <span className="whitespace-nowrap text-base text-muted">{b.remaining}칸 남음</span>
                  )}
                </div>
                <p className="text-base text-muted">{b.desc}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="동아리와 반" className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-paper-2 px-3 py-2">
          <p className="text-base text-muted">동아리</p>
          <p className="font-display">{club ? `${club.emoji} ${club.name}` : '아직 없음'}</p>
        </div>
        <div className="rounded-xl bg-paper-2 px-3 py-2">
          <p className="text-base text-muted">2학년 반</p>
          <p className="font-display">{route ? `${route.emoji} ${route.name}` : '아직 없음'}</p>
        </div>
      </section>

      {trait && (
        <section aria-label="특수 능력" className="rounded-xl border-2 border-grape/30 bg-grape/10 px-3 py-2">
          <p className="font-display">
            <span aria-hidden="true">{trait.emoji}</span> {trait.name} 특수 능력
          </p>
          <p className="text-base">{trait.ability}</p>
          {ability ? (
            <p className="text-base text-muted">
              올해 남은 횟수: <strong className="font-display text-ink">{ability.usesLeft}회</strong>
              {ability.armed ? ' · 발동 준비됨' : ''}
            </p>
          ) : (
            <p className="text-base text-muted">항상 적용</p>
          )}
        </section>
      )}

      <section aria-label="미수령 기록">
        <p className="text-base text-muted">교무실에서 정산할 기록</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Chip>📝 시험 {r.examPass}</Chip>
          <Chip>🏆 수상 {r.award}</Chip>
          <Chip>👏 칭찬 {r.praise}</Chip>
          <Chip tone={r.late > 0 ? 'warn' : 'neutral'}>⏰ 지각 {r.late}</Chip>
        </div>
      </section>
    </Card>
  );
}

/** 세로 화면용 한 줄 요약. 누르면 전체 패널이 펼쳐진다. */
export function StatSummary({ game, open, onToggle }: { game: GameState; open: boolean; onToggle: () => void }) {
  const tier = stressTier(game.stress);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 border-outline/45 bg-paper px-3 py-2 text-left shadow-[0_3px_0_0_rgb(107_79_58/0.2)]"
    >
      <span className="font-display">
        {game.year}학년 {game.turn}턴
      </span>
      {STATS.map((s) => (
        <span key={s} className="tabular-nums" aria-label={`${STAT_NAMES[s]} ${game.stats[s]}`}>
          <span aria-hidden="true">{STAT_ICONS[s]}</span>
          {game.stats[s]}
        </span>
      ))}
      <span className="tabular-nums">
        <span aria-hidden="true">{STRESS_META[tier.id].icon}</span> 스트레스 {game.stress}
      </span>
      <span className="tabular-nums">
        <span aria-hidden="true">💰</span>
        {formatMoney(game.money)}
      </span>
      <span className="ml-auto font-display text-muted">{open ? '접기 ▲' : '자세히 ▼'}</span>
    </button>
  );
}
