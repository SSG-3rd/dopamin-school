'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { STAT_ICONS, STAT_TEXT, content } from '@/engine/content';
import { lit } from '@/engine/text';
import { STATS } from '@/engine/types';
import { Bar, Button } from '@/components/ui';
import { useI18n } from '@/i18n/client';
import { playSound } from '@/lib/sound';
import { useGame } from '@/store/game';
import { KeyBadge } from './EventCard';
import { digitKey, isEnter, useHotkeys } from './hooks';
import { STAT_COLORS } from './meta';

/** 성향 5개 중 하나 고르기. 카드를 누르면 선택, 아래 버튼(또는 같은 카드 한 번 더)으로 입학. */
export function TraitSelect() {
  const dispatch = useGame((s) => s.dispatch);
  const traits = content.traits;
  const [sel, setSel] = useState<string | null>(null);
  const selected = traits.find((tr) => tr.id === sel);
  const { t, text } = useI18n();

  const confirm = (id: string) => {
    playSound('click');
    dispatch({ type: 'SELECT_TRAIT', traitId: id });
  };
  const choose = (id: string) => {
    if (sel === id) confirm(id);
    else setSel(id);
  };

  useHotkeys((e) => {
    const n = digitKey(e);
    if (n != null && traits[n - 1]) {
      choose(traits[n - 1].id);
      return true;
    }
    if (isEnter(e) && sel) {
      confirm(sel);
      return true;
    }
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-32 pt-4">
      <div className="text-center">
        <p className="font-display text-lg text-accent">{t('ui.trait.badge')}</p>
        <h1 className="text-3xl sm:text-4xl">{t('ui.trait.title')}</h1>
        <p className="mt-1 text-base text-muted">{t('ui.trait.lead')}</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {traits.map((tr, i) => {
          const on = sel === tr.id;
          return (
            <li key={tr.id}>
              <motion.button
                type="button"
                onClick={() => choose(tr.id)}
                aria-pressed={on}
                whileTap={{ scale: 0.98 }}
                className={`flex h-full w-full flex-col gap-2 rounded-3xl border-[3px] bg-paper p-4 text-left transition-[box-shadow,border-color,background-color] ${
                  on
                    ? 'border-outline bg-[#fff3d6] shadow-[0_5px_0_0_rgb(107_79_58/0.32)]'
                    : 'border-outline/45 shadow-[0_4px_0_0_rgb(107_79_58/0.2)] hover:border-outline/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <KeyBadge>{i + 1}</KeyBadge>
                  {on && <span className="font-display text-base text-accent">{t('ui.trait.selected')}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-5xl leading-none">
                    {tr.emoji}
                  </span>
                  <span className="font-display text-2xl">{text(tr.name)}</span>
                </span>
                <span className="text-base leading-relaxed text-ink/90">{text(tr.desc)}</span>
                <span className="mt-1 flex flex-col gap-1">
                  {STATS.map((s) => (
                    <span key={s} className="grid grid-cols-[4.25rem_1fr_2rem] items-center gap-2 text-base">
                      <span className="whitespace-nowrap">
                        <span aria-hidden="true">{STAT_ICONS[s]}</span> {text(STAT_TEXT[s])}
                      </span>
                      <Bar
                        value={tr.stats[s]}
                        color={STAT_COLORS[s]}
                        label={t('ui.trait.statAria', { stat: STAT_TEXT[s], v: tr.stats[s] })}
                        className="h-2.5"
                      />
                      <span className="text-right font-display tabular-nums">{tr.stats[s]}</span>
                    </span>
                  ))}
                  <span className="grid grid-cols-[4.25rem_1fr_2rem] items-center gap-2 text-base">
                    <span className="whitespace-nowrap">
                      <span aria-hidden="true">😮‍💨</span> {t('stress.name')}
                    </span>
                    <Bar value={tr.stress} color="var(--color-grape)" label={t('ui.trait.startStress', { v: tr.stress })} className="h-2.5" />
                    <span className="text-right font-display tabular-nums">{tr.stress}</span>
                  </span>
                </span>
                <span className="mt-1 rounded-xl bg-grape/10 px-2.5 py-1.5 text-base">
                  <strong className="font-display font-normal">{t('ui.trait.ability')}</strong> · {text(tr.ability)}
                </span>
                <span className="rounded-xl bg-danger/8 px-2.5 py-1.5 text-base">
                  <strong className="font-display font-normal">{t('ui.trait.weakness')}</strong> · {text(tr.weakness)}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-outline/45 bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-1">
          <Button size="lg" block disabled={!selected} onClick={() => selected && confirm(selected.id)}>
            {selected ? t('ui.trait.enroll', { emoji: lit(selected.emoji), name: selected.name }) : t('ui.trait.pickPrompt')}
            {selected && <KeyBadge>Enter</KeyBadge>}
          </Button>
        </div>
      </div>
    </main>
  );
}
