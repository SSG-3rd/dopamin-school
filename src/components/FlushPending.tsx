'use client';
// 앱을 열 때 한 번, 전송에 실패해 쌓아 둔 통계를 다시 보낸다.
import { useEffect } from 'react';
import { flushPending } from '@/lib/supabase';

export function FlushPending() {
  useEffect(() => {
    void flushPending();
  }, []);
  return null;
}
