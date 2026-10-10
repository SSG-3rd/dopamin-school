'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { STAT_ICONS, STAT_NAMES, content } from '@/engine/content';
import { STATS } from '@/engine/types';
import { Bar, Button } from '@/components/ui';
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
  const selected = traits.find((t) => t.id === sel);

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
        <p className="font-display text-lg text-accent">입학 원서</p>
        <h1 className="text-3xl sm:text-4xl">나는 어떤 학생일까?</h1>
        <p className="mt-1 text-base text-muted">성향마다 시작 능력치와 특수 능력이 달라요. 카드를 눌러 골라 보세요.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {traits.map((t, i) => {
          const on = sel === t.id;
          return (
            <li key={t.id}>
              <motion.button
                type="button"
                onClick={() => choose(t.id)}
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
                  {on && <span className="font-display text-base text-accent">✔ 선택됨</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-5xl leading-none">
                    {t.emoji}
                  </span>
                  <span className="font-display text-2xl">{t.name}</span>
                </span>
                <span className="text-base leading-relaxed text-ink/90">{t.desc}</span>
                <span className="mt-1 flex flex-col gap-1">
                  {STATS.map((s) => (
                    <span key={s} className="grid grid-cols-[4.25rem_1fr_2rem] items-center gap-2 text-base">
                      <span className="whitespace-nowrap">
                        <span aria-hidden="true">{STAT_ICONS[s]}</span> {STAT_NAMES[s]}
                      </span>
                      <Bar value={t.stats[s]} color={STAT_COLORS[s]} label={`${STAT_NAMES[s]} ${t.stats[s]}`} className="h-2.5" />
                      <span className="text-right font-display tabular-nums">{t.stats[s]}</span>
                    </span>
                  ))}
                  <span className="grid grid-cols-[4.25rem_1fr_2rem] items-center gap-2 text-base">
                    <span className="whitespace-nowrap">
                      <span aria-hidden="true">😮‍💨</span> 스트레스
                    </span>
                    <Bar value={t.stress} color="var(--color-grape)" label={`시작 스트레스 ${t.stress}`} className="h-2.5" />
                    <span className="text-right font-display tabular-nums">{t.stress}</span>
                  </span>
                </span>
                <span className="mt-1 rounded-xl bg-grape/10 px-2.5 py-1.5 text-base">
                  <strong className="font-display font-normal">⭐ 능력</strong> · {t.ability}
                </span>
                <span className="rounded-xl bg-danger/8 px-2.5 py-1.5 text-base">
                  <strong className="font-display font-normal">⚠️ 약점</strong> · {t.weakness}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-outline/45 bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-1">
          <Button size="lg" block disabled={!selected} onClick={() => selected && confirm(selected.id)}>
            {selected ? `${selected.emoji} ${selected.name}(으)로 입학하기` : '성향을 골라 주세요'}
            {selected && <KeyBadge>Enter</KeyBadge>}
          </Button>
        </div>
      </div>
    </main>
  );
}
