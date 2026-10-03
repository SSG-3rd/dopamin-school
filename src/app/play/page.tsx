'use client';
// /play — 게임 진행 화면 (클라이언트 전용). phase에 따라 성향 선택 → 보드 → 엔딩을 그린다.
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { GameScreen } from '@/components/game/GameScreen';
import { useSettings } from '@/lib/settings';
import { useGame } from '@/store/game';

export default function PlayPage() {
  const router = useRouter();
  const game = useGame((s) => s.game);
  const hydrated = useGame((s) => s.hydrated);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    useSettings.getState().load();
    const store = useGame.getState();
    store.hydrate();
    let wantsNew = false;
    try {
      wantsNew = new URLSearchParams(window.location.search).get('new') === '1';
    } catch {
      wantsNew = false;
    }
    if (wantsNew || !useGame.getState().game) {
      useGame.getState().newGame();
    }
    if (wantsNew) router.replace('/play');
  }, [router]);

  if (!hydrated || !game) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center" aria-busy="true">
        <span aria-hidden="true" className="animate-bounce text-5xl">
          🎲
        </span>
        <p className="font-display text-xl text-muted">가방 챙기는 중…</p>
      </main>
    );
  }

  return <GameScreen game={game} />;
}
