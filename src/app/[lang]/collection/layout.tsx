import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { localePath } from '@/i18n/config';
import { languageAlternates, localeOf } from '@/i18n/route';
import { getTranslator } from '@/i18n/server';

export async function generateMetadata({ params }: LayoutProps<'/[lang]/collection'>): Promise<Metadata> {
  const locale = await localeOf(params);
  const { t } = await getTranslator(locale);
  return {
    title: t('ui.collection.title'),
    alternates: { canonical: localePath(locale, '/collection'), languages: languageAlternates('/collection') },
  };
}

export default function CollectionLayout({ children }: { children: ReactNode }) {
  return children;
}
