'use client';
import type { ReactNode } from 'react';
import { activeBuffViews, getAbilityView } from '@/engine/view';
import { CAREER_ICONS, CAREER_TEXT, STAT_ICONS, STAT_TEXT, content, findTrait, getClub, getRoute } from '@/engine/content';
import { levelProgress, statBonus, stressTier } from '@/engine/rules';
import { lit, money } from '@/engine/text';
import { CAREERS, STATS } from '@/engine/types';
import type { GameState } from '@/engine/types';
import { Bar, Card, Chip, Stars } from '@/components/ui';
import { useI18n } from '@/i18n/client';
import { CAREER_COLORS, STAT_COLORS, STRESS_META, signed } from './meta';

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 text-lg text-ink">{children}</h3>;
}

export function StatRows({ game }: { game: GameState }) {
  const { t, text } = useI18n();
  return (
    <ul className="flex flex-col gap-2">
      {STATS.map((s) => {
        const v = game.stats[s];
        const b = statBonus(v);
        return (
          <li key={s} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-2">
            <span className="whitespace-nowrap">
              <span aria-hidden="true">{STAT_ICONS[s]}</span> {text(STAT_TEXT[s])}
            </span>
            <Bar value={v} color={STAT_COLORS[s]} label={t('ui.panel.statAria', { stat: STAT_TEXT[s], v, bonus: lit(signed(b)) })} />
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
  const { t, text } = useI18n();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <span aria-hidden="true">{meta.icon}</span> {t('stress.name')} ·{' '}
          <strong className="font-display text-lg font-normal">{text(tier.label)}</strong>
        </span>
        <span className="font-display text-lg tabular-nums">{stress}</span>
      </div>
      <div className="relative mt-1">
        <Bar value={stress} color={meta.color} label={t('ui.panel.stressAria', { v: stress, tier: tier.label })} className="h-4" />
        {/* 단계 눈금: 30·60·80 */}
        {[30, 60, 80].map((m) => (
          <span key={m} aria-hidden="true" className="absolute top-0 h-4 w-0.5 bg-ink/25" style={{ left: `${m}%` }} />
        ))}
      </div>
      <p className="mt-1 text-base text-muted">{text(tier.effect)}</p>
    </div>
  );
}

export function CareerRows({ game }: { game: GameState }) {
  const { t, text } = useI18n();
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
                <span aria-hidden="true">{CAREER_ICONS[c]}</span> {text(CAREER_TEXT[c])}
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
                label={
                  p.to != null
                    ? t('ui.panel.careerAria', { career: CAREER_TEXT[c], exp: p.exp, to: p.to })
                    : t('ui.panel.careerAriaMax', { career: CAREER_TEXT[c], exp: p.exp })
                }
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
  const { t, text } = useI18n();

  return (
    <Card className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-2xl leading-none">
          {t('ui.panel.yearTurn', { year: game.year, turn: game.turn })}
        </p>
        {tile && (
          <Chip tone="info">
            <span aria-hidden="true">📍</span> {text(tile.name)}
          </Chip>
        )}
      </div>

      <section aria-label={t('ui.panel.statsAria')}>
        <SectionTitle>{t('ui.panel.stats')}</SectionTitle>
        <StatRows game={game} />
      </section>

      <section aria-label={t('stress.name')}>
        <StressGauge stress={game.stress} />
      </section>

      <section aria-label={t('ui.panel.money')} className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
        <span>
          <span aria-hidden="true">💰</span> {t('ui.panel.money')}
        </span>
        <span className="font-display text-xl tabular-nums">{text(money(game.money))}</span>
      </section>

      <section aria-label={t('ui.panel.careerAriaSection')}>
        <SectionTitle>{t('ui.panel.career')}</SectionTitle>
        <CareerRows game={game} />
      </section>

      <section aria-label={t('ui.panel.buffs')}>
        <SectionTitle>{t('ui.panel.buffs')}</SectionTitle>
        {buffs.length === 0 ? (
          <p className="text-base text-muted">{t('ui.panel.none')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {buffs.map((b) => (
              <li
                key={`${b.id}-${b.debuff ? 'd' : 'b'}`}
                className={`rounded-xl border-2 px-2.5 py-1.5 ${b.debuff ? 'border-danger/40 bg-danger/10' : 'border-mint/40 bg-mint/10'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display">
                    <span aria-hidden="true">{b.emoji}</span> {b.debuff ? t('ui.panel.debuffPrefix') : ''}
                    {text(b.name)}
                  </span>
                  {b.remaining != null && (
                    <span className="whitespace-nowrap text-base text-muted">{t('ui.panel.remaining', { n: b.remaining })}</span>
                  )}
                </div>
                <p className="text-base text-muted">{text(b.desc)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t('ui.panel.clubRouteAria')} className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-paper-2 px-3 py-2">
          <p className="text-base text-muted">{t('ui.panel.club')}</p>
          <p className="font-display">{club ? `${club.emoji} ${text(club.name)}` : t('ui.panel.notYet')}</p>
        </div>
        <div className="rounded-xl bg-paper-2 px-3 py-2">
          <p className="text-base text-muted">{t('ui.panel.route')}</p>
          <p className="font-display">{route ? `${route.emoji} ${text(route.name)}` : t('ui.panel.notYet')}</p>
        </div>
      </section>

      {trait && (
        <section aria-label={t('ui.panel.abilityAria')} className="rounded-xl border-2 border-grape/30 bg-grape/10 px-3 py-2">
          <p className="font-display">
            <span aria-hidden="true">{trait.emoji}</span> {t('ui.panel.abilityTitle', { name: trait.name })}
          </p>
          <p className="text-base">{text(trait.ability)}</p>
          {ability ? (
            <p className="text-base text-muted">
              {t('ui.panel.usesLeft')}{' '}
              <strong className="font-display text-ink">{t('ui.panel.usesCount', { n: ability.usesLeft })}</strong>
              {ability.armed ? t('ui.panel.armed') : ''}
            </p>
          ) : (
            <p className="text-base text-muted">{t('ui.panel.always')}</p>
          )}
        </section>
      )}

      <section aria-label={t('ui.panel.recordsAria')}>
        <p className="text-base text-muted">{t('ui.panel.records')}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Chip>{t('ui.panel.recExam', { n: r.examPass })}</Chip>
          <Chip>{t('ui.panel.recAward', { n: r.award })}</Chip>
          <Chip>{t('ui.panel.recPraise', { n: r.praise })}</Chip>
          <Chip tone={r.late > 0 ? 'warn' : 'neutral'}>{t('ui.panel.recLate', { n: r.late })}</Chip>
        </div>
      </section>
    </Card>
  );
}

/** 세로 화면용 한 줄 요약. 누르면 전체 패널이 펼쳐진다. */
export function StatSummary({ game, open, onToggle }: { game: GameState; open: boolean; onToggle: () => void }) {
  const tier = stressTier(game.stress);
  const { t, text } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 border-outline/45 bg-paper px-3 py-2 text-left shadow-[0_3px_0_0_rgb(107_79_58/0.2)]"
    >
      <span className="font-display">
        {t('ui.panel.yearTurnShort', { year: game.year, turn: game.turn })}
      </span>
      {STATS.map((s) => (
        <span key={s} className="tabular-nums" aria-label={`${text(STAT_TEXT[s])} ${game.stats[s]}`}>
          <span aria-hidden="true">{STAT_ICONS[s]}</span>
          {game.stats[s]}
        </span>
      ))}
      <span className="tabular-nums">
        <span aria-hidden="true">{STRESS_META[tier.id].icon}</span> {t('ui.panel.stressShort', { v: game.stress })}
      </span>
      <span className="tabular-nums">
        <span aria-hidden="true">💰</span>
        {text(money(game.money))}
      </span>
      <span className="ml-auto font-display text-muted">{t(open ? 'ui.panel.collapse' : 'ui.panel.expand')}</span>
    </button>
  );
}
