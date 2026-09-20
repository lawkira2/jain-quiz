const SPOKE_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);

export default function WheelMark({ size = 56 }) {
  return (
    <svg className="wheel-mark" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--text-primary)" strokeOpacity="0.28" strokeWidth="2" />
      <g stroke="var(--text-primary)" strokeOpacity="0.45" strokeWidth="2">
        {SPOKE_ANGLES.map((angle) => (
          <line key={angle} x1="60" y1="12" x2="60" y2="24" transform={`rotate(${angle} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="9" fill="var(--brand)" />
    </svg>
  );
}
