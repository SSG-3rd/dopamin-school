'use client';
// 언어 고르기. 같은 화면을 다른 언어 주소로 다시 열고, 고른 언어를 쿠키에 기억한다
// (언어 없는 주소로 들어오면 proxy가 이 쿠키를 본다). 게임 저장은 언어와 상관없어서 그대로 이어진다.
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/client';
import { LOCALES, LOCALE_COOKIE, LOCALE_INFO, isLocale, localePath, splitLocale } from '@/i18n/config';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  function choose(next: string) {
    if (!isLocale(next) || next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const { rest } = splitLocale(pathname);
    router.replace(`${localePath(next, rest)}${window.location.search}`);
  }

  return (
    <label
      className={`relative inline-flex items-center gap-1.5 rounded-full border-2 border-outline bg-paper py-1 pr-2 pl-3 font-display text-base text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.22)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${className}`}
    >
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">{t('ui.common.language')}</span>
      <select
        value={locale}
        onChange={(e) => choose(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={LOCALE_INFO[l].htmlLang}>
            {LOCALE_INFO[l].label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-xs text-muted">
        ▼
      </span>
    </label>
  );
}
