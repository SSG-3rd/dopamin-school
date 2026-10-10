'use client';
import { getShopView } from '@/engine/view';
import { formatMoney } from '@/engine/rules';
import type { GameState } from '@/engine/types';
import { Button, Chip } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { KeyBadge } from './EventCard';
import { digitKey, isEnter, useAct, useHotkeys } from './hooks';

/** 매점: 여러 개 살 수 있고, 나가기로 끝낸다. */
export function Shop({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const views = getShopView(game);
  const p = game.pending;

  const buy = (id: string) => {
    const err = dispatch({ type: 'BUY', itemId: id });
    playSound(err ? 'fail' : 'coin');
  };
  const leave = () => dispatch({ type: 'LEAVE_SHOP' });

  useHotkeys((e) => {
    const n = digitKey(e);
    if (n != null) {
      const v = views[n - 1];
      if (v && v.affordable) {
        buy(v.item.id);
        return true;
      }
      return false;
    }
    if (isEnter(e)) {
      leave();
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
        {views.map((v, i) => (
          <li key={v.item.id}>
            <button
              type="button"
              disabled={!v.affordable}
              onClick={() => buy(v.item.id)}
              className={`flex h-full w-full flex-col gap-1 rounded-2xl border-2 bg-paper p-3 text-left transition-[transform,box-shadow] ${
                v.affordable
                  ? 'border-outline/70 shadow-[0_3px_0_0_rgb(107_79_58/0.6)] hover:bg-paper active:translate-y-[2px] active:shadow-none'
                  : 'cursor-not-allowed border-outline/45 bg-paper-2 opacity-70'
              }`}
            >
              <span className="flex items-center gap-2">
                <KeyBadge>{i + 1}</KeyBadge>
                <span aria-hidden="true" className="text-2xl leading-none">
                  {v.item.emoji}
                </span>
                <span className="font-display text-lg leading-tight">{v.item.name}</span>
              </span>
              <span className="text-base text-muted">{v.item.desc}</span>
              <span className="mt-auto flex flex-wrap items-center gap-1.5">
                <Chip tone={v.affordable ? 'info' : 'bad'}>{formatMoney(v.item.price)}</Chip>
                {!v.affordable && <span className="font-display text-base text-danger">🔒 돈 부족</span>}
                {v.bought > 0 && <Chip tone="good">✔ {v.bought}개 샀음</Chip>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button size="lg" variant="secondary" block onClick={leave}>
        매점 나가기 <KeyBadge>Enter</KeyBadge>
      </Button>
    </div>
  );
}
