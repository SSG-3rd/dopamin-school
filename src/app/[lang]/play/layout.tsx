import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { localeOf } from '@/i18n/route';
import { getTranslator } from '@/i18n/server';

export async function generateMetadata({ params }: LayoutProps<'/[lang]/play'>): Promise<Metadata> {
  const { t } = await getTranslator(await localeOf(params));
  return { title: t('ui.play.title'), robots: { index: false } };
}

export default function PlayLayout({ children }: { children: ReactNode }) {
  return children;
}
