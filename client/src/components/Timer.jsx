import { useEffect, useState } from 'react';

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SPOKE_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);

export default function Timer({ startTime, limitMs }) {
  const [remaining, setRemaining] = useState(limitMs);

  useEffect(() => {
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, limitMs - elapsed);
      setRemaining(left);
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [startTime, limitMs]);

  const fraction = Math.max(0, Math.min(1, remaining / limitMs));
  const seconds = Math.ceil(remaining / 1000);
  const urgent = seconds <= 5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <svg className="wheel-timer" width="64" height="64" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--gridline)" strokeWidth="6" />
        <g stroke="var(--text-primary)" strokeOpacity="0.15" strokeWidth="2">
          {SPOKE_ANGLES.map((angle) => (
            <line key={angle} x1="60" y1="14" x2="60" y2="24" transform={`rotate(${angle} 60 60)`} />
          ))}
        </g>
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="var(--critical)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.1s linear' }}
        />
        <circle cx="60" cy="60" r="8" fill="var(--brand)" />
      </svg>
      <span className="wheel-timer-num" style={{ color: urgent ? 'var(--critical)' : 'var(--text-primary)' }}>
        {seconds} सेकंड
      </span>
    </div>
  );
}
