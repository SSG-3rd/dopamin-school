import type { Metadata, Viewport } from 'next';
import { Jua, Noto_Sans_KR } from 'next/font/google';
import type { ReactNode } from 'react';
import { FlushPending } from '@/components/FlushPending';
import { Scenery } from '@/components/Scenery';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/brand';
import './globals.css';

// 한글 폰트는 조각이 많아서 미리 불러오지 않는다(preload: false).
const jua = Jua({ weight: '400', variable: '--font-jua', display: 'swap', preload: false });
const notoSansKr = Noto_Sans_KR({ variable: '--font-noto-sans-kr', display: 'swap', preload: false });

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

const description = APP_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description,
  applicationName: APP_NAME,
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    locale: 'ko_KR',
    title: APP_NAME,
    description,
    images: [{ url: '/api/og', width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description,
    images: ['/api/og'],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#9dd5f1',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${notoSansKr.variable}`}>
      <body className="font-sans text-ink">
        <Scenery />
        <FlushPending />
        {children}
      </body>
    </html>
  );
}
