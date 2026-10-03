// 결과 공유 미리보기 이미지 (1200×630). /api/og?d=<공유 데이터>
// 한글은 Google Fonts에서 쓰는 글자만 잘라 받은 Jua로 그린다. 실패하면 폰트 없이 다시 그린다.
import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import { CAREERS } from '@/engine/types';
import { CAREER_NAMES, findTrait, jobName, trackName } from '@/engine/content';
import { ENDING_KIND_LABELS, decodeShare, gradeName } from '@/lib/share';
import type { SharePayload } from '@/lib/share';

const WIDTH = 1200;
const HEIGHT = 630;

const C = {
  paper: '#fff8ec',
  paper2: '#fdf0d9',
  ink: '#2b2a33',
  muted: '#6b6875',
  line: '#e8dcc6',
  board: '#2f5d50',
  board2: '#3e7465',
  accent: '#ff7a59',
  sun: '#ffc93c',
  frame: '#6b4f2a',
} as const;

const CAREER_COLORS: Record<(typeof CAREERS)[number], string> = {
  academic: '#5aa9e6',
  sports: '#ff7a59',
  arts: '#b46cf0',
  comm: '#2fbf94',
  biz: '#e0a400',
};

const STAT_LABELS = ['학업', '체력', '인맥', '운', '스트레스'] as const;

async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { cache: 'force-cache' })).text();
  const m = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(opentype|truetype|woff)['"]?\)/);
  if (!m) throw new Error('font url not found');
  const res = await fetch(m[1], { cache: 'force-cache' });
  if (!res.ok) throw new Error(`font fetch ${res.status}`);
  return res.arrayBuffer();
}

function uniqueChars(parts: string[]): string {
  return [...new Set([...parts.join('')])].join('');
}

function Pips({ level, color }: { level: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: i < level ? color : 'rgba(255,255,255,0.18)',
            border: `3px solid ${i < level ? color : 'rgba(255,255,255,0.35)'}`,
          }}
        />
      ))}
    </div>
  );
}

function resultCard(p: SharePayload): { el: ReactElement; text: string[] } {
  const trait = findTrait(p.t);
  const job = jobName(p.j);
  const kind = ENDING_KIND_LABELS[p.k];
  const grade = p.g ? `${gradeName(p.g)} 등급` : '';
  const track = p.tr ? trackName(p.tr) : '';
  const traitLine = trait ? `${trait.name} 학생의 졸업 후 직업은` : '졸업 후 나의 직업은';
  const jobSize = Math.max(56, Math.min(112, Math.floor(700 / Math.max(job.length, 1))));
  const stats = p.s.slice(0, 5).map((v, i) => `${STAT_LABELS[i]} ${v}`);
  const money = `돈 ${p.s[5].toLocaleString('ko-KR')}원`;
  const footer = '청춘다이스 · 주사위로 굴리는 고등학교 3년';

  const el = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: C.paper,
        padding: 28,
        fontFamily: 'Jua',
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          borderRadius: 36,
          border: `6px solid ${C.line}`,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* 왼쪽: 직업 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '44px 48px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 30, color: C.muted }}>{traitLine}</div>
            <div style={{ display: 'flex', fontSize: jobSize, color: C.ink, lineHeight: 1.15, marginTop: 14 }}>{job}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  padding: '8px 20px',
                  borderRadius: 999,
                  backgroundColor: C.accent,
                  color: C.ink,
                }}
              >
                {kind}
              </div>
              {grade ? (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 28,
                    padding: '8px 20px',
                    borderRadius: 999,
                    backgroundColor: C.sun,
                    color: C.ink,
                  }}
                >
                  {grade}
                </div>
              ) : null}
              {track ? (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 28,
                    padding: '8px 20px',
                    borderRadius: 999,
                    backgroundColor: C.paper2,
                    border: `3px solid ${C.line}`,
                    color: C.ink,
                  }}
                >
                  {track}
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 22, fontSize: 26, color: C.ink, flexWrap: 'wrap' }}>
              {stats.map((s) => (
                <div key={s} style={{ display: 'flex' }}>
                  {s}
                </div>
              ))}
              <div style={{ display: 'flex' }}>{money}</div>
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: C.muted }}>{footer}</div>
          </div>
        </div>

        {/* 오른쪽: 칠판 진로 레벨 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 380,
            backgroundColor: C.board,
            borderLeft: `10px solid ${C.frame}`,
            padding: '40px 36px',
            justifyContent: 'center',
            gap: 22,
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, color: C.sun }}>진로 레벨</div>
          {CAREERS.map((c, i) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', fontSize: 30, color: '#ffffff' }}>{CAREER_NAMES[c]}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Pips level={p.c[i]} color={CAREER_COLORS[c]} />
                <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.85)', width: 48 }}>
                  {`Lv${p.c[i]}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return {
    el,
    text: [traitLine, job, kind, grade, track, ...stats, money, footer, '진로 레벨', ...Object.values(CAREER_NAMES), 'Lv012345'],
  };
}

function titleCard(): { el: ReactElement; text: string[] } {
  const title = '청춘다이스';
  const sub = '주사위로 굴리는 고등학교 3년';
  const sub2 = '졸업하는 날, 나는 무엇이 되어 있을까?';
  const el = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: C.paper,
        padding: 28,
        fontFamily: 'Jua',
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          border: `14px solid ${C.frame}`,
          backgroundColor: C.board,
        }}
      >
        <div style={{ display: 'flex', fontSize: 150, color: '#ffffff', lineHeight: 1.1 }}>
          <span>청춘</span>
          <span style={{ color: C.sun }}>다이스</span>
        </div>
        <div style={{ display: 'flex', fontSize: 44, color: 'rgba(255,255,255,0.92)', marginTop: 24 }}>{sub}</div>
        <div style={{ display: 'flex', fontSize: 34, color: 'rgba(255,255,255,0.75)', marginTop: 12 }}>{sub2}</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 40 }}>
          {[C.accent, C.sun, '#5aa9e6', '#2fbf94', '#b46cf0'].map((col) => (
            <div key={col} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: col }} />
          ))}
        </div>
      </div>
    </div>
  );
  return { el, text: [title, sub, sub2] };
}

async function renderPng(el: ReactElement, font: ArrayBuffer | null): Promise<ArrayBuffer> {
  const res = new ImageResponse(el, {
    width: WIDTH,
    height: HEIGHT,
    fonts: font ? [{ name: 'Jua', data: font, weight: 400, style: 'normal' }] : undefined,
  });
  // 그리기 오류를 여기서 잡기 위해 끝까지 읽는다
  return res.arrayBuffer();
}

export async function GET(request: Request): Promise<Response> {
  const d = new URL(request.url).searchParams.get('d');
  const payload = decodeShare(d);
  const card = payload ? resultCard(payload) : titleCard();

  let font: ArrayBuffer | null = null;
  try {
    font = await loadGoogleFont('Jua', uniqueChars(card.text));
  } catch {
    font = null;
  }

  let png: ArrayBuffer;
  try {
    png = await renderPng(card.el, font);
  } catch {
    try {
      png = await renderPng(card.el, null);
    } catch {
      try {
        png = await renderPng(titleCard().el, null);
      } catch {
        return new Response('이미지를 만들지 못했어요', { status: 500 });
      }
    }
  }

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}
