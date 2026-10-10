// 데굴이: 볼이 발그레한 주사위 마스코트. 타이틀과 보드 말에 쓴다.
export function DiceBuddy({
  size = 64,
  color = '#fffaf0',
  mood = 'happy',
  className,
}: {
  size?: number;
  color?: string;
  mood?: 'happy' | 'wink' | 'wow';
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* 그림자 */}
      <ellipse cx="50" cy="94" rx="30" ry="5" fill="rgb(107 79 58 / 0.22)" />
      {/* 몸통 */}
      <rect x="12" y="10" width="76" height="76" rx="22" fill={color} stroke="#6b4f3a" strokeWidth="5" />
      {/* 이마의 주사위 눈 */}
      <circle cx="50" cy="27" r="5" fill="#ff8fab" />
      {/* 눈 */}
      {mood === 'wink' ? (
        <>
          <circle cx="36" cy="50" r="4.6" fill="#4a3a2f" />
          <path d="M58 50 q6 -5 12 0" fill="none" stroke="#4a3a2f" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="36" cy="50" r={mood === 'wow' ? 5.4 : 4.6} fill="#4a3a2f" />
          <circle cx="64" cy="50" r={mood === 'wow' ? 5.4 : 4.6} fill="#4a3a2f" />
          <circle cx="37.6" cy="48.4" r="1.5" fill="#fff" />
          <circle cx="65.6" cy="48.4" r="1.5" fill="#fff" />
        </>
      )}
      {/* 볼 */}
      <ellipse cx="27" cy="60" rx="7" ry="4.5" fill="#ffb3c4" opacity="0.9" />
      <ellipse cx="73" cy="60" rx="7" ry="4.5" fill="#ffb3c4" opacity="0.9" />
      {/* 입 */}
      {mood === 'wow' ? (
        <ellipse cx="50" cy="63" rx="4" ry="5" fill="#4a3a2f" />
      ) : (
        <path d="M43 59 q3.5 5 7 0 q3.5 5 7 0" fill="none" stroke="#4a3a2f" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
