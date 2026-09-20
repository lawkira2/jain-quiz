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

export default function OptionButton({ index, text, onClick, disabled, muted }) {
  return (
    <button
      className={`option-btn opt-${index}`}
      onClick={() => onClick(index)}
      disabled={disabled}
      style={muted ? { opacity: 0.4 } : undefined}
    >
      {SHAPES[index]}
      <span>{text}</span>
    </button>
  );
}
