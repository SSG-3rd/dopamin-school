'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { content, findTrait, getClub, getRoute } from '@/engine/content';
import { formatMoney } from '@/engine/rules';
import type { Candidate, EndingResult, GameState } from '@/engine/types';
import { Bar, Button, Card, buttonClass } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { sharePath } from '@/lib/share';
import { useGame } from '@/store/game';
import { pct } from './meta';
import { CareerRows, StatRows, StressGauge } from './StatPanel';

/** 후보(분야·조합)에 속한 직업 이름들 */
function candidateJobs(c: Candidate, ending: EndingResult): string[] {
  const E = content.endings;
  let table: { top: { name: string }[]; mid: { name: string }[]; low: { name: string }[] } | undefined;
  if (c.id.startsWith('combo:')) {
    table = E.combos[c.id.slice(6)];
  } else if (c.id.startsWith('field:')) {
    const field = c.id.slice(6);
    let track = field;
    if (field === 'arts') {
      track =
        (ending.pick === c.id && ending.track) ||
        Object.entries(E.fieldNames).find(([k, v]) => k.startsWith('arts') && v === c.label)?.[0] ||
        'arts_general';
    }
    table = E.fields[track];
  }
  if (!table) return [];
  return [...table.top, ...table.mid, ...table.low].map((j) => j.name);
}

function SharePanel({ game }: { game: GameState }) {
  const booth = useSettings((s) => s.booth);
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    try {
      setUrl(window.location.origin + sharePath(game));
      setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    } catch {
      setUrl('');
    }
  }, [game]);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    import('qrcode')
      .then((mod) => {
        const lib = (mod as unknown as { default?: typeof mod }).default ?? mod;
        return lib.toDataURL(url, {
          margin: 1,
          width: booth ? 520 : 240,
          errorCorrectionLevel: 'M',
          color: { dark: '#2b2a33', light: '#ffffff' },
        });
      })
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [url, booth]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: '청춘다이스 결과', text: '내 고등학교 3년의 결말은?', url });
    } catch {
      // 사용자가 취소한 경우 등
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-2xl">
        <span aria-hidden="true">🔗</span> 결과 공유
      </h2>
      <div className={`flex flex-col items-center gap-3 ${booth ? '' : 'sm:flex-row sm:items-start'}`}>
        {qr ? (
          <figure className="flex flex-col items-center gap-1">
            <img
              src={qr}
              alt="결과 페이지 QR 코드"
              width={booth ? 320 : 160}
              height={booth ? 320 : 160}
              className={`rounded-xl border-2 border-line bg-white ${booth ? 'h-auto w-[min(320px,80vw)]' : 'h-40 w-40'}`}
            />
            <figcaption className="text-center text-base text-muted">
              {booth ? '📱 휴대폰 카메라로 찍어 결과를 가져가세요!' : '휴대폰으로 찍어 가져가기'}
            </figcaption>
          </figure>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-line text-base text-muted">
            QR 준비 중…
          </div>
        )}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <label className="text-base text-muted" htmlFor="yd-share-url">
            결과 주소
          </label>
          <input
            id="yd-share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full min-w-0 rounded-xl border-2 border-line bg-paper-2 px-3 py-2 text-base"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={copy} disabled={!url}>
              📋 주소 복사
            </Button>
            {canShare && (
              <Button variant="secondary" size="sm" onClick={share} disabled={!url}>
                📤 공유하기
              </Button>
            )}
            {url && (
              <Link href={sharePath(game)} className={buttonClass('ghost', 'sm')}>
                🃏 결과 카드 보기
              </Link>
            )}
          </div>
          <p className="min-h-6 text-base" aria-live="polite">
            {copied === 'ok' ? '✔ 복사했어요!' : copied === 'fail' ? '복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.' : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** 엔딩 연출이 끝난 뒤 보여 주는 정리 화면 */
export function EndingSummary({ game, onReplay }: { game: GameState; onReplay?: () => void }) {
  const ending = game.ending!;
  const newGame = useGame((s) => s.newGame);
  const trait = findTrait(game.traitId);
  const club = getClub(game.clubId);
  const route = getRoute(game.routeId);
  const cands = [...ending.candidates].sort((a, b) => b.probability - a.probability);

  const again = () => {
    newGame();
    try {
      window.history.replaceState(null, '', '/play');
      window.scrollTo({ top: 0 });
    } catch {
      // 무시
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-2xl">
          <span aria-hidden="true">🎰</span> 될 수 있었던 직업들
        </h2>
        {cands.length === 0 ? (
          <p className="text-base text-muted">진로 레벨 2 이상인 분야가 없어서 룰렛 후보가 없었어요.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cands.map((c) => {
              const picked = ending.pick === c.id && ending.kind !== 'rescue' && ending.kind !== 'miracle';
              const jobs = candidateJobs(c, ending);
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border-2 px-3 py-2 ${picked ? 'border-ink bg-sun/30' : 'border-line bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg">
                      {picked && <span aria-hidden="true">🎯 </span>}
                      {c.label}
                      {picked && <span className="text-base text-muted"> (당첨)</span>}
                    </span>
                    <span className="font-display text-lg tabular-nums">{pct(c.probability)}</span>
                  </div>
                  <Bar value={c.probability} max={1} color="var(--color-accent)" label={`${c.label} 확률 ${pct(c.probability)}`} className="mt-1 h-2" />
                  {jobs.length > 0 && <p className="mt-1 text-base text-muted">{jobs.join(' · ')}</p>}
                </li>
              );
            })}
          </ul>
        )}
        {ending.rerolled && <p className="text-base text-muted">🍀 룰렛을 한 번 더 돌렸어요.</p>}
      </Card>

      {ending.epilogue.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-2xl">
            <span aria-hidden="true">📔</span> 그 뒤 이야기
          </h2>
          <ul className="flex flex-col gap-1.5">
            {ending.epilogue.map((line, i) => (
              <li key={i} className="rounded-xl bg-paper-2 px-3 py-2 text-base leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-2xl">
          <span aria-hidden="true">📋</span> 졸업 성적표
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-base">
          {trait && (
            <span>
              성향 <strong className="font-display font-normal">{trait.emoji} {trait.name}</strong>
            </span>
          )}
          <span>
            동아리 <strong className="font-display font-normal">{club ? `${club.emoji} ${club.name}` : '없음'}</strong>
          </span>
          <span>
            반 <strong className="font-display font-normal">{route ? `${route.emoji} ${route.name}` : '없음'}</strong>
          </span>
          <span>
            <strong className="font-display font-normal">{game.turn}</strong>턴
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <StatRows game={game} />
            <StressGauge stress={game.stress} />
            <p className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2">
              <span>
                <span aria-hidden="true">💰</span> 남은 돈
              </span>
              <strong className="font-display text-xl font-normal tabular-nums">{formatMoney(game.money)}</strong>
            </p>
          </div>
          <CareerRows game={game} />
        </div>
      </Card>

      <SharePanel game={game} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button size="lg" onClick={again}>
          🎲 다시 하기
        </Button>
        <Link href="/collection" className={buttonClass('secondary', 'lg')}>
          📖 엔딩 도감
        </Link>
        <Link href="/" className={buttonClass('secondary', 'lg')}>
          🏠 처음으로
        </Link>
      </div>
      {onReplay && (
        <button type="button" onClick={onReplay} className="self-center text-base text-muted underline">
          🎬 엔딩 연출 다시 보기
        </button>
      )}
    </div>
  );
}
