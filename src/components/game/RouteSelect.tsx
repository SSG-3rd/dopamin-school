'use client';
import { getRouteViews } from '@/engine/view';
import type { GameState } from '@/engine/types';
import { Chip } from '@/components/ui';
import { playSound } from '@/lib/sound';
import { KeyBadge } from './EventCard';
import { digitKey, useAct, useHotkeys } from './hooks';
import { previewTone } from './meta';

/** 2학년 반(루트) 고르기. 조건이 모자란 반은 잠기고 이유를 보여 준다. */
export function RouteSelect({ game }: { game: GameState }) {
  const dispatch = useAct(game);
  const views = getRouteViews(game);
  const p = game.pending;

  const pick = (id: string) => {
    playSound('click');
    dispatch({ type: 'SELECT_ROUTE', routeId: id });
  };

  useHotkeys((e) => {
    const n = digitKey(e);
    if (n == null) return;
    const v = views[n - 1];
    if (v && !v.disabled) {
      pick(v.route.id);
      return true;
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-4xl leading-none">
          {p?.icon ?? '🏫'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl">{p?.title ?? '2학년 반 배정'}</h2>
          <p className="mt-1 text-base text-ink/90">{p?.text ?? '2학년에 어떤 반으로 갈까? 한 번 정하면 졸업까지 간다.'}</p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
        {views.map((v, i) => (
          <li key={v.route.id}>
            <button
              type="button"
              disabled={v.disabled}
              onClick={() => pick(v.route.id)}
              className={`flex h-full w-full flex-col gap-1 rounded-2xl border-2 bg-white p-3 text-left transition-[transform,box-shadow] ${
                v.disabled
                  ? 'cursor-not-allowed border-line bg-paper-2 opacity-70'
                  : 'border-ink/70 shadow-[0_3px_0_0_rgb(43_42_51/0.6)] hover:bg-paper active:translate-y-[2px] active:shadow-none'
              }`}
            >
              <span className="flex items-center gap-2">
                <KeyBadge>{i + 1}</KeyBadge>
                <span aria-hidden="true" className="text-2xl leading-none">
                  {v.route.emoji}
                </span>
                <span className="font-display text-xl leading-tight">{v.route.name}</span>
              </span>
              <span className="text-base text-muted">{v.route.desc}</span>
              <span className="flex flex-wrap gap-1.5">
                {v.preview.map((t, k) => (
                  <Chip key={`${t}-${k}`} tone={previewTone(t)}>
                    {t}
                  </Chip>
                ))}
              </span>
              {v.disabled && v.reason && (
                <span className="font-display text-base text-danger">
                  <span aria-hidden="true">🔒</span> {v.reason}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
