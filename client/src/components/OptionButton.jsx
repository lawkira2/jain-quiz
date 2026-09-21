const SHAPES = [
  // triangle
  <svg key="0" viewBox="0 0 24 24" className="option-shape"><polygon points="12,3 21,21 3,21" fill="#fff" /></svg>,
  // diamond
  <svg key="1" viewBox="0 0 24 24" className="option-shape"><polygon points="12,2 22,12 12,22 2,12" fill="#fff" /></svg>,
  // circle
  <svg key="2" viewBox="0 0 24 24" className="option-shape"><circle cx="12" cy="12" r="10" fill="#fff" /></svg>,
  // square
  <svg key="3" viewBox="0 0 24 24" className="option-shape"><rect x="3" y="3" width="18" height="18" fill="#fff" /></svg>,
];

const LETTERS = ['A', 'B', 'C', 'D'];

export default function OptionButton({ index, text, onClick, disabled, muted, selected }) {
  return (
    <button
      className={`option-btn opt-${index}${selected ? ' selected' : ''}`}
      onClick={() => onClick(index)}
      disabled={disabled}
      style={muted ? { opacity: 0.35, filter: 'saturate(0.4) brightness(0.7)' } : undefined}
    >
      <span className="flex items-center gap-2">
        {SHAPES[index]}
        <span className="rounded bg-black/20 px-1.5 py-0.5 text-xs font-semibold tracking-wider">{LETTERS[index]}</span>
      </span>
      <span>{text}</span>
      {selected && (
        <svg className="option-check" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#fff" />
          <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}
