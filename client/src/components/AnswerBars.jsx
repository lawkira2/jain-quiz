const COLORS = ['var(--opt-1)', 'var(--opt-2)', 'var(--opt-3)', 'var(--opt-4)'];

export default function AnswerBars({ options, counts, correctIndex }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ width: '100%' }}>
      {options.map((text, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(counts[i] / max) * 100}%`,
                background: COLORS[i],
                outline: i === correctIndex ? '3px solid var(--good)' : 'none',
                outlineOffset: '-3px',
              }}
            />
          </div>
          <span className="bar-count">{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
