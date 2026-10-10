// 모든 화면 뒤에 깔리는 소풍 그림책 풍경: 하늘·구름·보라 산·초록 덤불·크림색 땅과 풀포기.
// 장식이므로 화면 읽기 프로그램에서는 숨기고, 클릭도 통과시킨다.

const OUTLINE = '#6b4f3a';

function cloudPath(x: number, y: number, w: number): string {
  const h = w * 0.32;
  return (
    `M${x},${y} ` +
    `a${h * 0.5},${h * 0.5} 0 0 1 ${w * 0.18},${-h * 0.45} ` +
    `a${h * 0.62},${h * 0.62} 0 0 1 ${w * 0.3},${-h * 0.32} ` +
    `a${h * 0.55},${h * 0.55} 0 0 1 ${w * 0.3},${h * 0.18} ` +
    `a${h * 0.45},${h * 0.45} 0 0 1 ${w * 0.22},${h * 0.59} Z`
  );
}

// 덤불: 원 여러 개를 겹쳐 뭉게구름처럼. [중심 x, 원들(dx, 높이, 반지름)]
const BUSHES: [number, [number, number, number][]][] = [
  [40, [[-70, 22, 30], [-35, 40, 36], [10, 46, 40], [55, 34, 32], [85, 18, 24]]],
  [250, [[-55, 26, 28], [-15, 44, 36], [30, 38, 32], [62, 20, 24]]],
  [455, [[-80, 20, 26], [-45, 40, 34], [0, 50, 42], [48, 40, 34], [86, 22, 26]]],
  [690, [[-50, 24, 28], [-12, 38, 34], [30, 30, 30], [60, 16, 22]]],
  [900, [[-85, 22, 28], [-48, 42, 36], [0, 52, 42], [50, 38, 34], [88, 20, 26]]],
  [1140, [[-60, 26, 30], [-20, 46, 38], [28, 40, 34], [64, 22, 26]]],
  [1360, [[-70, 24, 28], [-30, 42, 36], [16, 48, 40], [60, 30, 30], [92, 16, 22]]],
];
const GROUND_Y = 170;

const CLOUDS: { left: string; top: string; w: number; dur: number; delay: number }[] = [
  { left: '4%', top: '9%', w: 190, dur: 70, delay: -10 },
  { left: '33%', top: '18%', w: 120, dur: 90, delay: -40 },
  { left: '62%', top: '6%', w: 160, dur: 80, delay: -25 },
  { left: '84%', top: '15%', w: 110, dur: 95, delay: -60 },
];

const NOTES: { left: string; top: string; color: string; glyph: 'single' | 'double'; size: number; delay: number }[] = [
  { left: '11%', top: '24%', color: '#ff8fab', glyph: 'double', size: 46, delay: 0 },
  { left: '47%', top: '5%', color: '#6fd3a8', glyph: 'single', size: 38, delay: -1.2 },
  { left: '78%', top: '20%', color: '#b39cf5', glyph: 'double', size: 42, delay: -2.1 },
];

function Note({ glyph, color }: { glyph: 'single' | 'double'; color: string }) {
  const d =
    glyph === 'single'
      ? 'M18 6 L18 30 M18 6 C24 10 30 12 32 18'
      : 'M12 10 L12 32 M30 6 L30 28 M12 10 L30 6 M12 16 L30 12';
  return (
    <svg viewBox="0 0 40 44" className="h-full w-full overflow-visible">
      <path d={d} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {glyph === 'single' ? (
        <ellipse cx="12" cy="32" rx="8" ry="6.5" fill={color} stroke="#fff" strokeWidth="3" transform="rotate(-20 12 32)" />
      ) : (
        <>
          <ellipse cx="7" cy="34" rx="7" ry="5.5" fill={color} stroke="#fff" strokeWidth="3" transform="rotate(-20 7 34)" />
          <ellipse cx="25" cy="30" rx="7" ry="5.5" fill={color} stroke="#fff" strokeWidth="3" transform="rotate(-20 25 30)" />
        </>
      )}
    </svg>
  );
}

export function Scenery({ notes = true }: { notes?: boolean }) {
  return (
    <div aria-hidden="true" className="yd-scenery pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 하늘 */}
      <div className="absolute inset-x-0 top-0" style={{ height: 'var(--yd-horizon)', background: 'linear-gradient(#9dd5f1, #d6effa)' }} />

      {/* 구름 */}
      {CLOUDS.map((c, i) => (
        <svg
          key={i}
          viewBox={`0 0 ${c.w + 20} ${c.w * 0.45}`}
          className="yd-cloud absolute"
          style={{ left: c.left, top: c.top, width: c.w, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        >
          <path d={cloudPath(10, c.w * 0.4, c.w)} fill="#fff" stroke="#e3f2fb" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      ))}

      {/* 음표 */}
      {notes &&
        NOTES.map((n, i) => (
          <div
            key={i}
            className="yd-note absolute"
            style={{ left: n.left, top: n.top, width: n.size, height: n.size * 1.1, animationDelay: `${n.delay}s` }}
          >
            <Note glyph={n.glyph} color={n.color} />
          </div>
        ))}

      {/* 땅 + 풀포기 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: 'var(--yd-horizon)',
          backgroundColor: '#f4ecd6',
          backgroundImage: 'var(--yd-tufts)',
          backgroundSize: '260px 190px',
        }}
      />

      {/* 산과 덤불 (지평선에 붙인다) */}
      <svg
        viewBox={`0 0 1440 ${GROUND_Y}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 w-full"
        style={{ top: `calc(var(--yd-horizon) - ${GROUND_Y - 1}px)`, height: GROUND_Y }}
      >
        <path
          d={`M-20 ${GROUND_Y} C 90 120, 200 62, 330 58 C 450 54, 560 104, 680 128 C 760 96, 880 36, 1010 34 C 1140 32, 1270 90, 1460 120 L1460 ${GROUND_Y + 10} L-20 ${GROUND_Y + 10} Z`}
          fill="#b3abd4"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M290 74 C 320 66, 352 68, 380 80" fill="none" stroke="#cbc5e6" strokeWidth="6" strokeLinecap="round" />
        <path d="M960 50 C 1000 42, 1040 46, 1072 60" fill="none" stroke="#cbc5e6" strokeWidth="6" strokeLinecap="round" />
        {BUSHES.map(([cx, circles], i) => (
          <g key={i}>
            {circles.map(([dx, rise, r], j) => (
              <circle key={`o${j}`} cx={cx + dx} cy={GROUND_Y - rise + r * 0.35} r={r + 3} fill={OUTLINE} />
            ))}
            {circles.map(([dx, rise, r], j) => (
              <circle key={`f${j}`} cx={cx + dx} cy={GROUND_Y - rise + r * 0.35} r={r} fill={i % 2 ? '#a9d897' : '#9fd18c'} />
            ))}
            {circles.slice(1, 3).map(([dx, rise, r], j) => (
              <path
                key={`h${j}`}
                d={`M${cx + dx - r * 0.5} ${GROUND_Y - rise - r * 0.25} q${r * 0.3} ${-r * 0.35} ${r * 0.7} ${-r * 0.2}`}
                fill="none"
                stroke="#c4e8b4"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}
            <path
              d={`M${cx - 18} ${GROUND_Y} l0 -20 m0 8 l-9 -10 m9 5 l8 -9 M${cx + 26} ${GROUND_Y} l0 -16 m0 7 l8 -9`}
              fill="none"
              stroke={OUTLINE}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path d={`M-20 ${GROUND_Y - 1} L1460 ${GROUND_Y - 1}`} stroke={OUTLINE} strokeWidth="2.5" opacity="0.5" />
      </svg>
    </div>
  );
}
