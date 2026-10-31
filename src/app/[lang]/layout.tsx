import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { FlushPending } from '@/components/FlushPending';
import { MusicPlayer } from '@/components/MusicPlayer';
import { Scenery } from '@/components/Scenery';
import { I18nProvider } from '@/i18n/client';
import { LOCALES, LOCALE_INFO, localePath } from '@/i18n/config';
import { LOCALE_FONTS } from '@/i18n/fonts';
import { languageAlternates, localeOf } from '@/i18n/route';
import { getTranslator, loadTables } from '@/i18n/server';
import '../globals.css';

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

function metadataBase(): URL {
  try {
    return new URL(siteUrl());
  } catch {
    return new URL('http://localhost:3000');
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const locale = await localeOf(params);
  const { t } = await getTranslator(locale);
  const name = t('brand.name');
  const description = t('brand.description');
  const og = `/api/og?l=${locale}`;
  return {
    metadataBase: metadataBase(),
    title: { default: name, template: `%s · ${name}` },
    description,
    applicationName: name,
    alternates: { canonical: localePath(locale), languages: languageAlternates('/') },
    openGraph: {
      type: 'website',
      siteName: name,
      locale: LOCALE_INFO[locale].ogLocale,
      title: name,
      description,
      images: [{ url: og, width: 1200, height: 630, alt: name }],
    },
    twitter: { card: 'summary_large_image', title: name, description, images: [og] },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#9dd5f1',
  colorScheme: 'light',
};

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const locale = await localeOf(params);
  const tables = await loadTables(locale);
  const font = LOCALE_FONTS[locale];
  const fontVars = {
    '--tp-font-display': font.display,
    '--tp-font-body': font.body,
    '--tp-display-weight': font.displayWeight,
  } as CSSProperties;
  return (
    <html lang={LOCALE_INFO[locale].htmlLang} style={fontVars}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={font.href} />
      </head>
      <body className="font-sans text-ink">
        <I18nProvider locale={locale} tables={tables}>
          <Scenery />
          <FlushPending />
          <MusicPlayer />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
