'use client';
import { useState } from 'react';
import { getShopView, type ShopItemView } from '@/engine/view';
import { formatMoney } from '@/engine/rules';
import type { GameState } from '@/engine/types';
import { Button, Chip } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { KeyBadge } from './EventCard';
import { digitKey, isEnter, useAct, useHotkeys } from './hooks';

function canBuy(v: ShopItemView): boolean {
  return v.affordable && !v.soldOut;
}

/** 매점: 상품을 고른 뒤 구매 확정을 눌러야 산다. 여러 개 살 수 있고, 나가기로 끝낸다. */
export function Shop({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const views = getShopView(game);
  const p = game.pending;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = views.find((v) => v.item.id === selectedId && canBuy(v)) ?? null;

  const select = (v: ShopItemView) => {
    if (!canBuy(v)) return;
    setSelectedId((cur) => (cur === v.item.id ? null : v.item.id));
    playSound('click');
  };
  const cancel = () => setSelectedId(null);
  const confirm = () => {
    if (!selected) return;
    const err = dispatch({ type: 'BUY', itemId: selected.item.id });
    playSound(err ? 'fail' : 'coin');
    setSelectedId(null);
  };
  const leave = () => dispatch({ type: 'LEAVE_SHOP' });

  useHotkeys((e) => {
    const n = digitKey(e);
    if (n != null) {
      const v = views[n - 1];
      if (v && canBuy(v)) {
        select(v);
        return true;
      }
      return false;
    }
    if (e.key === 'Escape' && selected) {
      cancel();
      return true;
    }
    if (isEnter(e)) {
      if (selected) confirm();
      else leave();
      return true;
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-4xl leading-none">
          🏪
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl">{p?.title ?? '매점'}</h2>
          {p?.text && <p className="mt-1 text-base text-ink/90">{p.text}</p>}
        </div>
      </div>
      <p className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
        <span>
          <span aria-hidden="true">💰</span> 가진 돈
        </span>
        <strong className="font-display text-xl font-normal tabular-nums">{formatMoney(game.money)}</strong>
      </p>
      <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
        {views.map((v, i) => {
          const ok = canBuy(v);
          const isSel = selected?.item.id === v.item.id;
          const max = v.item.maxPerGame;
          return (
            <li key={v.item.id}>
              <button
                type="button"
                disabled={!ok}
                aria-pressed={isSel}
                onClick={() => select(v)}
                className={`flex h-full w-full flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-[transform,box-shadow] ${
                  !ok
                    ? 'cursor-not-allowed border-outline/45 bg-paper-2 opacity-70'
                    : isSel
                      ? 'translate-y-[2px] border-sky-deep bg-sky/25 shadow-[0_0_0_3px_var(--color-sky)]'
                      : 'border-outline/70 bg-paper shadow-[0_3px_0_0_rgb(107_79_58/0.6)] hover:bg-paper active:translate-y-[2px] active:shadow-none'
                }`}
              >
                <span className="flex items-center gap-2">
                  <KeyBadge>{i + 1}</KeyBadge>
                  <span aria-hidden="true" className="text-2xl leading-none">
                    {v.item.emoji}
                  </span>
                  <span className="font-display text-lg leading-tight">{v.item.name}</span>
                  {isSel && <span className="ml-auto font-display text-base text-sky-deep">✔ 선택</span>}
                </span>
                <span className="text-base text-muted">{v.item.desc}</span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Chip tone={v.affordable ? 'info' : 'bad'}>{formatMoney(v.item.price)}</Chip>
                  {v.soldOut ? (
                    <span className="font-display text-base text-danger">🔒 최대 {max}개까지 (다 샀음)</span>
                  ) : (
                    <>
                      {!v.affordable && <span className="font-display text-base text-danger">🔒 돈 부족</span>}
                      {max != null && (
                        <Chip tone="warn">
                          한 판 최대 {max}개 · 남은 {max - v.owned}개
                        </Chip>
                      )}
                    </>
                  )}
                  {v.bought > 0 && <Chip tone="good">✔ {v.bought}개 샀음</Chip>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selected ? (
        <div
          aria-live="polite"
          className="flex flex-col gap-2 rounded-2xl border-2 border-outline bg-paper-2 p-3"
        >
          <p className="text-base">
            <span aria-hidden="true">{selected.item.emoji}</span> <strong className="font-display font-normal">{selected.item.name}</strong>
            을(를) {formatMoney(selected.item.price)}에 살까요?
            <span className="text-muted"> (남는 돈 {formatMoney(game.money - selected.item.price)})</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" block onClick={cancel}>
              취소 <KeyBadge>Esc</KeyBadge>
            </Button>
            <Button size="lg" block onClick={confirm}>
              구매 확정 <KeyBadge>Enter</KeyBadge>
            </Button>
          </div>
        </div>
      ) : (
        <Button size="lg" variant="secondary" block onClick={leave}>
          매점 나가기 <KeyBadge>Enter</KeyBadge>
        </Button>
      )}
    </div>
  );
}
