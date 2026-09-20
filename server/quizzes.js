import * as fileStore from './storage/fileQuizzes.js';
import * as mongoStore from './storage/mongoQuizzes.js';

// MongoDB persists quiz content across restarts/redeploys (needed on hosts like
// Render free tier, which have no persistent disk). Falls back to a local JSON
// file when MONGODB_URI isn't set, so local development needs no DB setup.
const store = process.env.MONGODB_URI ? mongoStore : fileStore;

export const listQuizzes = store.listQuizzes;
export const getQuiz = store.getQuiz;
export const createQuiz = store.createQuiz;
export const updateQuiz = store.updateQuiz;
export const deleteQuiz = store.deleteQuiz;
