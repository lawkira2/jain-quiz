export const QUESTION_LIMIT_MS = 15000;

// Speed brackets for a correct answer (seconds elapsed -> points). Checked in order.
const BRACKETS = [
  { maxSeconds: 2, points: 10 }, // instant: under 2s
  { maxSeconds: 6, points: 7.5 }, // 2-5s
  { maxSeconds: 11, points: 5 }, // 6-10s
  { maxSeconds: 15, points: 3 }, // 11-15s
];

export function computeScore(correct, elapsedMs) {
  if (!correct) return 0;
  const elapsedSeconds = Math.max(0, Math.min(elapsedMs, QUESTION_LIMIT_MS)) / 1000;
  const bracket = BRACKETS.find((b) => elapsedSeconds < b.maxSeconds) || BRACKETS[BRACKETS.length - 1];
  return bracket.points;
}
