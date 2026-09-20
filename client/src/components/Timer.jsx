import { useEffect, useState } from 'react';

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

  const pct = Math.max(0, Math.min(100, (remaining / limitMs) * 100));
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div style={{ width: '100%' }}>
      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="muted">{seconds}s left</div>
    </div>
  );
}
