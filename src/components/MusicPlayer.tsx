'use client';
// 배경음악 켜기·끄기.
// - 페이지가 열리자마자 바로 틀어 본다 (브라우저가 허락하면 그대로 재생).
// - 브라우저가 첫 입력 전 소리를 막으면, 첫 클릭·터치·키 입력 순간에 바로 시작하고 그동안 작은 안내를 띄운다.
// - 설정을 끄면 즉시 멈추고, 다시 켜면 다시 나온다. 탭이 가려지면 멈췄다가 돌아오면 다시 튼다.
// - 휴대폰 알림창·잠금화면의 재생/일시정지 버튼도 같은 설정을 켜고 끈다.
import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/brand';
import { musicBlocked, startMusic, stopMusic, unlockAudio } from '@/lib/music';
import { useSettings } from '@/lib/settings';

const GESTURES = ['pointerdown', 'click', 'touchend', 'keydown'] as const;

export function MusicPlayer() {
  const music = useSettings((s) => s.music);
  const loaded = useSettings((s) => s.loaded);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    useSettings.getState().load();
  }, []);

  useEffect(() => {
    try {
      const ms = navigator.mediaSession;
      if (!ms || typeof MediaMetadata === 'undefined') return;
      ms.metadata = new MediaMetadata({ title: '배경음악', artist: APP_NAME });
      ms.setActionHandler('play', () => useSettings.getState().set({ music: true }));
      ms.setActionHandler('pause', () => useSettings.getState().set({ music: false }));
    } catch {
      // 지원하지 않는 브라우저
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!music) {
      stopMusic();
      setBlocked(false);
      return;
    }
    const play = () => {
      if (document.visibilityState === 'visible') startMusic();
    };
    const onGesture = () => {
      unlockAudio();
      play();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') startMusic();
      else stopMusic();
    };
    play();
    for (const g of GESTURES) window.addEventListener(g, onGesture, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisible);
    // 막혀 있는 동안만 안내를 보여 준다
    const check = setInterval(() => setBlocked(musicBlocked()), 400);
    return () => {
      for (const g of GESTURES) window.removeEventListener(g, onGesture, { capture: true });
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(check);
    };
  }, [music, loaded]);

  if (!blocked || !music) return null;
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        startMusic();
      }}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] inline-flex items-center gap-2 rounded-full border-[2.5px] border-outline bg-paper px-4 py-2 font-display text-base text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.3)]"
    >
      <span aria-hidden="true" className="yd-note-hint">
        🎵
      </span>
      화면을 누르면 음악이 나와요
    </button>
  );
}
