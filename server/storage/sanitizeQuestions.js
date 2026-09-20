import { nanoid } from 'nanoid';

export function sanitizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions
    .filter((q) => q && typeof q.text === 'string' && q.text.trim())
    .map((q) => ({
      id: q.id || nanoid(8),
      text: q.text.trim(),
      options: Array.from({ length: 4 }, (_, i) => String(q.options?.[i] ?? '').trim()),
      correctIndex: [0, 1, 2, 3].includes(q.correctIndex) ? q.correctIndex : 0,
    }));
}
