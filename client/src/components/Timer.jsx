import { useEffect, useState } from 'react';
import { useLanguage } from '../lib/i18n.jsx';

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SPOKE_ANGLES = Array.from({ length: 8 }, (_, i) => i * 45);
const WARN_AT_SECONDS = 10;
const URGENT_AT_SECONDS = 5;

export default function Timer({ startTime, limitMs, variant = 'default' }) {
  const { t } = useLanguage();
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
  const urgent = seconds <= URGENT_AT_SECONDS;
  const warn = !urgent && seconds <= WARN_AT_SECONDS;
  const isStage = variant === 'stage';
  const stateClass = urgent ? 'urgent' : warn ? 'warn' : 'safe';

  return (
    <div className="timer-wrap">
      <div
        className={`timer-ring timer-ring--${isStage ? 'stage' : 'default'} ${stateClass}`}
        role="timer"
        aria-label={t('timerSeconds', { n: seconds })}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--color-gridline)" strokeWidth="9" />
          <g stroke="var(--color-text-primary)" strokeOpacity="0.14" strokeWidth="2">
            {SPOKE_ANGLES.map((angle) => (
              <line key={angle} x1="60" y1="9" x2="60" y2="20" transform={`rotate(${angle} 60 60)`} />
            ))}
          </g>
          <circle
            className="timer-arc"
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.25s ease' }}
          />
        </svg>
        <span className="timer-ring-number">{seconds}</span>
      </div>
      {isStage && <span className="timer-ring-caption">{t('timerCaption')}</span>}
    </div>
  );
}
