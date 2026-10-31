// 언어별 글꼴. 그 언어 글꼴만 불러오도록 Google Fonts 스타일시트를 언어마다 따로 건다
// (한중일 글꼴은 조각이 많아서, 모든 언어 글꼴을 한 CSS에 넣으면 첫 화면이 무거워진다).
// 공유 이미지(api/og)도 같은 글꼴을 쓴다.
import type { Locale } from './config';

export interface LocaleFont {
  /** <link rel="stylesheet"> 주소 */
  href: string;
  /** 제목·버튼용 글꼴 (CSS font-family 값) */
  display: string;
  /** 제목 굵기 */
  displayWeight: number;
  /** 본문 글꼴 */
  body: string;
  /** 공유 이미지에 쓸 글꼴 이름과 굵기 */
  og: { family: string; weight: number };
}

const GF = 'https://fonts.googleapis.com/css2';

export const LOCALE_FONTS: Record<Locale, LocaleFont> = {
  ko: {
    href: `${GF}?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap`,
    display: '"Jua", ui-rounded, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    displayWeight: 400,
    body: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    og: { family: 'Jua', weight: 400 },
  },
  en: {
    href: `${GF}?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700&display=swap`,
    display: '"Fredoka", ui-rounded, system-ui, sans-serif',
    displayWeight: 600,
    body: '"Nunito", ui-rounded, system-ui, sans-serif',
    og: { family: 'Fredoka', weight: 600 },
  },
  ja: {
    href: `${GF}?family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap`,
    display: '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif',
    displayWeight: 800,
    body: '"M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif',
    og: { family: 'M PLUS Rounded 1c', weight: 800 },
  },
  zh: {
    href: `${GF}?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;500;700&display=swap`,
    display: '"ZCOOL KuaiLe", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    displayWeight: 400,
    body: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    og: { family: 'ZCOOL KuaiLe', weight: 400 },
  },
};
