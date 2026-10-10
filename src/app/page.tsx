'use client';
// 타이틀 화면 (§8): 새 게임 · 이어하기 · 엔딩 도감 · 통계 · 설정 · 게임 방법
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { DiceBuddy } from '@/components/DiceBuddy';
import { Card, buttonClass } from '@/components/ui';
import { APP_NAME_PARTS, APP_TAGLINE } from '@/lib/brand';
import { KEYS, readJSON } from '@/lib/storage';
import { useSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';

type SaveInfo = { resumable: boolean; year?: number; turn?: number };

/** 'yd:save'는 GameState 그대로이거나 zustand persist 래퍼 { state: { game }, version }. */
function readSaveInfo(): SaveInfo {
  const raw = readJSON<unknown>(KEYS.save, null);
  if (!raw || typeof raw !== 'object') return { resumable: false };
  const obj = raw as Record<string, unknown>;
  let game: Record<string, unknown> | null = null;
  const wrapped = (obj.state as Record<string, unknown> | undefined)?.game;
  if (wrapped && typeof wrapped === 'object') game = wrapped as Record<string, unknown>;
  else if ('phase' in obj) game = obj;
  if (!game || game.version !== 1 || typeof game.phase !== 'string') return { resumable: false };
  if (game.phase === 'ending') return { resumable: false };
  return {
    resumable: true,
    year: typeof game.year === 'number' ? game.year : undefined,
    turn: typeof game.turn === 'number' ? game.turn : undefined,
  };
}

const HOW_TO = [
  { icon: '🧑‍🎓', title: '성향 고르기', text: '재능형·노력형·운동형·인싸형·운빨형 중 하나. 시작 능력치와 특수 능력이 달라요.' },
  { icon: '🎲', title: '입학 주사위', text: '한 번 굴려서 학업·체력·인맥·운 중 하나를 올리거나 스트레스를 낮춰요.' },
  { icon: '🏫', title: '3년 동안 보드 3바퀴', text: '주사위로 16칸 학교를 돌며 사건마다 선택해요. 시험, 방학, 동아리, 상점도 있어요.' },
  { icon: '🎓', title: '졸업과 엔딩', text: '쌓인 진로 레벨이 직업 후보를 정하고, 운이 룰렛을 돌리고, 능력치가 등급을 정해요.' },
] as const;

const TOGGLES: { key: keyof Settings; icon: string; label: string; desc: string }[] = [
  { key: 'fast', icon: '⏩', label: '빠른 진행', desc: '주사위·이동 연출을 짧게, 결과 창은 자동으로 닫혀요.' },
  { key: 'sound', icon: '🔊', label: '소리', desc: '주사위·효과음을 켜요.' },
  { key: 'booth', icon: '🎪', label: '부스 모드', desc: '행사 부스용: 결과 화면에 QR 코드를 크게 띄워요.' },
];

function Toggle({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div id={`${id}-l`} className="font-display text-lg">
          <span aria-hidden="true">{icon}</span> {label}
        </div>
        <p id={`${id}-d`} className="text-base leading-snug text-muted">
          {desc}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border-2 transition-colors ${
          checked ? 'border-outline bg-bush-deep' : 'border-outline bg-paper-2'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_0_0_rgb(0_0_0/0.15)] transition-[left] ${
            checked ? 'left-[calc(100%-1.75rem)]' : 'left-1'
          }`}
        />
        <span className="sr-only">{checked ? '켜짐' : '꺼짐'}</span>
      </button>
    </div>
  );
}

export default function TitlePage() {
  const [save, setSave] = useState<SaveInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();

  useEffect(() => {
    setSave(readSaveInfo());
    useSettings.getState().load();
  }, []);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const resumable = save?.resumable === true;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-6 pb-12 sm:pt-10">
      {/* 하늘 위 타이틀 */}
      <header className="flex flex-col items-center pt-2 text-center">
        <p className="rounded-full border-2 border-outline bg-paper px-3 py-0.5 font-display text-base text-ink shadow-[0_3px_0_0_rgb(107_79_58/0.22)]">
          1인용 고교생활 보드게임
        </p>
        <div className="mt-3 flex items-center gap-2 sm:gap-4">
          <DiceBuddy size={72} className="yd-buddy-hop shrink-0 -rotate-6" />
          <h1 className="yd-logo font-display text-[3.4rem] leading-[1.05] sm:text-7xl">
            <span className="text-accent">{APP_NAME_PARTS[0]}</span>
            <br className="sm:hidden" />
            <span className="text-sun sm:ml-3">{APP_NAME_PARTS[1]}</span>
          </h1>
          <DiceBuddy size={56} mood="wink" color="#ffe08a" className="yd-buddy-hop yd-buddy-hop--late hidden shrink-0 rotate-6 sm:block" />
        </div>
        <p className="yd-panel mt-4 max-w-sm px-5 py-3 text-base leading-relaxed text-ink">
          {APP_TAGLINE}.
          <br />
          졸업하는 날, 나는 무엇이 되어 있을까?
        </p>
      </header>

      {/* 메뉴 */}
      <nav aria-label="메뉴" className="flex flex-col gap-3">
        {resumable && (
          <Link href="/play" className={buttonClass('primary', 'lg', true)}>
            <span aria-hidden="true">▶️</span> 이어하기
            {save?.year ? (
              <span className="font-sans text-base text-ink/75">
                ({save.year}학년{save.turn ? ` · ${save.turn}턴` : ''})
              </span>
            ) : null}
          </Link>
        )}

        {resumable ? (
          <button
            type="button"
            className={buttonClass('secondary', 'lg', true)}
            aria-expanded={confirming}
            aria-controls="new-game-confirm"
            onClick={() => setConfirming(true)}
          >
            <span aria-hidden="true">✏️</span> 새 게임
          </button>
        ) : (
          <Link href="/play?new=1" className={buttonClass('primary', 'lg', true)}>
            <span aria-hidden="true">✏️</span> 새 게임
          </Link>
        )}

        {confirming && resumable && (
          <Card
            id="new-game-confirm"
            ref={confirmRef}
            tabIndex={-1}
            role="alertdialog"
            aria-labelledby="new-game-confirm-title"
            aria-describedby="new-game-confirm-desc"
            className="border-accent/60 bg-paper-2 p-4"
          >
            <h2 id="new-game-confirm-title" className="text-xl">
              <span aria-hidden="true">⚠️</span> 새로 시작할까요?
            </h2>
            <p id="new-game-confirm-desc" className="mt-1 text-muted">
              진행 중인 게임이 있어요. 새 게임을 시작하면 지금 저장된 게임은 사라져요.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className={buttonClass('secondary', 'md', true)} onClick={() => setConfirming(false)}>
                취소
              </button>
              <Link href="/play?new=1" className={buttonClass('danger', 'md', true)}>
                새로 시작
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/collection" className={buttonClass('secondary', 'md', true)}>
            <span aria-hidden="true">📖</span> 엔딩 도감
          </Link>
          <Link href="/stats" className={buttonClass('secondary', 'md', true)}>
            <span aria-hidden="true">📊</span> 통계
          </Link>
        </div>
      </nav>

      {/* 설정 */}
      <Card className="px-4 py-2 sm:px-5">
        <h2 className="pt-2 text-xl">
          <span aria-hidden="true">⚙️</span> 설정
        </h2>
        <div className="divide-y-2 divide-dashed divide-line">
          {TOGGLES.map((t) => (
            <Toggle
              key={t.key}
              icon={t.icon}
              label={t.label}
              desc={t.desc}
              checked={settings[t.key]}
              onChange={(v) => settings.set({ [t.key]: v })}
            />
          ))}
        </div>
      </Card>

      {/* 게임 방법 */}
      <section aria-labelledby="howto-title" className="flex flex-col gap-3">
        <h2 id="howto-title" className="yd-panel self-start px-4 py-1 text-2xl">
          <span aria-hidden="true">📝</span> 게임 방법
        </h2>
        <ol className="flex flex-col gap-3">
          {HOW_TO.map((s, i) => (
            <li key={s.title}>
              <Card className="flex gap-3 p-4">
                <div
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-outline bg-sky/40 text-2xl"
                >
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg">
                    <span className="text-accent-deep">{i + 1}.</span> {s.title}
                  </h3>
                  <p className="text-base leading-relaxed text-muted">{s.text}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        <p className="yd-panel px-4 py-2 text-base text-muted">
          키보드: <kbd className="rounded border border-line bg-white px-1.5">Space</kbd> 주사위 ·{' '}
          <kbd className="rounded border border-line bg-white px-1.5">1</kbd>
          <kbd className="ml-0.5 rounded border border-line bg-white px-1.5">2</kbd>
          <kbd className="ml-0.5 rounded border border-line bg-white px-1.5">3</kbd> 선택 ·{' '}
          <kbd className="rounded border border-line bg-white px-1.5">Enter</kbd> 계속
        </p>
      </section>

      <footer className="yd-panel px-4 py-2 text-center text-base text-muted">
        로그인 없이 플레이해요. 끝난 판의 익명 요약만 통계로 모아요.
      </footer>
    </main>
  );
}
