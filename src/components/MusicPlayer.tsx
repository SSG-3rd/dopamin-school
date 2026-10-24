'use client';
// 배경음악 켜기·끄기. 브라우저는 사용자가 한 번 누르거나 키를 쳐야 소리를 내 주므로, 첫 입력 때 시작한다.
// 탭이 가려지면 멈췄다가 돌아오면 다시 튼다.
import { useEffect } from 'react';
import { startMusic, stopMusic } from '@/lib/music';
import { useSettings } from '@/lib/settings';

export function MusicPlayer() {
  const music = useSettings((s) => s.music);
  const loaded = useSettings((s) => s.loaded);

  useEffect(() => {
    useSettings.getState().load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!music) {
      stopMusic();
      return;
    }
    const kick = () => {
      if (document.visibilityState === 'visible') startMusic();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') startMusic();
      else stopMusic();
    };
    kick();
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [music, loaded]);

  return null;
}
