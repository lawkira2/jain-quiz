import { MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';
import { sanitizeQuestions } from './sanitizeQuestions.js';

let collectionPromise = null;

function getCollection() {
  if (!collectionPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    collectionPromise = client
      .connect()
      .then((c) => c.db('jainquiz').collection('quizzes'))
      .then(async (collection) => {
        await collection.createIndex({ id: 1 }, { unique: true });
        return collection;
      });
  }
  return collectionPromise;
}

function toPublic(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

export async function listQuizzes() {
  const collection = await getCollection();
  const docs = await collection.find({}, { projection: { id: 1, title: 1, questions: 1, updatedAt: 1 } }).toArray();
  return docs.map((q) => ({
    id: q.id,
    title: q.title,
    questionCount: q.questions.length,
    updatedAt: q.updatedAt,
  }));
}

export async function getQuiz(id) {
  const collection = await getCollection();
  const doc = await collection.findOne({ id });
  return toPublic(doc);
}

export async function createQuiz({ title, questions }) {
  const collection = await getCollection();
  const quiz = {
    id: nanoid(10),
    title: (title || 'Untitled Quiz').trim(),
    questions: sanitizeQuestions(questions),
    updatedAt: new Date().toISOString(),
  };
  await collection.insertOne(quiz);
  return toPublic(quiz);
}

export async function updateQuiz(id, { title, questions }) {
  const collection = await getCollection();
  const existing = await collection.findOne({ id });
  if (!existing) return null;
  const updated = {
    title: title !== undefined ? title.trim() : existing.title,
    questions: questions !== undefined ? sanitizeQuestions(questions) : existing.questions,
    updatedAt: new Date().toISOString(),
  };
  await collection.updateOne({ id }, { $set: updated });
  return toPublic({ ...existing, ...updated });
}

export async function deleteQuiz(id) {
  const collection = await getCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}
