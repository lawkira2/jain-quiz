export const QUESTION_LIMIT_MS = 15000;

// Kahoot-style continuous speed score: instant correct answer = full points, a correct
// answer landing right at the buzzer still keeps half credit, linear in between. Replaces
// the old 4-bracket table, which bucketed most answers into the same 2-3 tiers and gave no
// credit for being faster within a bracket.
export const MAX_POINTS = 1000;

export function computeScore(correct, elapsedMs) {
  if (!correct) return 0;
  const clamped = Math.max(0, Math.min(elapsedMs, QUESTION_LIMIT_MS));
  const fraction = clamped / QUESTION_LIMIT_MS;
  return Math.round(MAX_POINTS * (1 - fraction / 2));
}
