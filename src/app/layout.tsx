import type { Metadata, Viewport } from 'next';
import { Jua, Noto_Sans_KR } from 'next/font/google';
import type { ReactNode } from 'react';
import { FlushPending } from '@/components/FlushPending';
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

const description = '주사위로 굴리는 고등학교 3년! 선택과 운이 쌓여 졸업 후 직업이 정해지는 1인용 보드게임.';

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: { default: '청춘다이스', template: '%s · 청춘다이스' },
  description,
  applicationName: '청춘다이스',
  openGraph: {
    type: 'website',
    siteName: '청춘다이스',
    locale: 'ko_KR',
    title: '청춘다이스',
    description,
    images: [{ url: '/api/og', width: 1200, height: 630, alt: '청춘다이스' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청춘다이스',
    description,
    images: ['/api/og'],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2f5d50',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${notoSansKr.variable}`}>
      <body className="font-sans text-ink">
        <FlushPending />
        {children}
      </body>
    </html>
  );
}
