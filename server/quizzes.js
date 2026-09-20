import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'quizzes.json');

async function ensureStore() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) await writeFile(DATA_FILE, '[]', 'utf-8');
}

async function readAll() {
  await ensureStore();
  const raw = await readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(quizzes) {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(quizzes, null, 2), 'utf-8');
}

export async function listQuizzes() {
  const quizzes = await readAll();
  return quizzes.map(({ id, title, questions, updatedAt }) => ({
    id,
    title,
    questionCount: questions.length,
    updatedAt,
  }));
}

export async function getQuiz(id) {
  const quizzes = await readAll();
  return quizzes.find((q) => q.id === id) || null;
}

function sanitizeQuestions(questions) {
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

export async function createQuiz({ title, questions }) {
  const quizzes = await readAll();
  const quiz = {
    id: nanoid(10),
    title: (title || 'Untitled Quiz').trim(),
    questions: sanitizeQuestions(questions),
    updatedAt: new Date().toISOString(),
  };
  quizzes.push(quiz);
  await writeAll(quizzes);
  return quiz;
}

export async function updateQuiz(id, { title, questions }) {
  const quizzes = await readAll();
  const idx = quizzes.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  quizzes[idx] = {
    ...quizzes[idx],
    title: title !== undefined ? title.trim() : quizzes[idx].title,
    questions: questions !== undefined ? sanitizeQuestions(questions) : quizzes[idx].questions,
    updatedAt: new Date().toISOString(),
  };
  await writeAll(quizzes);
  return quizzes[idx];
}

export async function deleteQuiz(id) {
  const quizzes = await readAll();
  const next = quizzes.filter((q) => q.id !== id);
  await writeAll(next);
  return next.length !== quizzes.length;
}
