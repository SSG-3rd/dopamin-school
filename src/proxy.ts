// 주소에 언어가 없으면(/, /play, 예전 공유 링크 /result?d=…, 부스 QR) 알맞은 언어 주소로 보낸다.
// 고르는 순서: 쿠키(마지막으로 고른 언어) → 브라우저 언어(Accept-Language) → 한국어.
import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localePath,
  matchLocale,
  parseAcceptLanguage,
  splitLocale,
} from './i18n/config';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (splitLocale(pathname).locale) return NextResponse.next();
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : (matchLocale(parseAcceptLanguage(request.headers.get('accept-language'))) ?? DEFAULT_LOCALE);
  const url = request.nextUrl.clone();
  url.pathname = localePath(locale, pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Next 내부(_next), API, 파일(점이 들어간 주소: /audio/….mp3, /icon.svg)은 건너뛴다
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
