import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '플레이',
  robots: { index: false },
};

export default function PlayLayout({ children }: { children: ReactNode }) {
  return children;
}
