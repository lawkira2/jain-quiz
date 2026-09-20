import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import cors from 'cors';
import { listQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz } from './quizzes.js';
import { createRoom, getRoom } from './rooms.js';
import { registerSocketHandlers } from './socketHandlers.js';

const PORT = process.env.PORT || 3001;
const HOST_PASSCODE = process.env.HOST_PASSCODE || 'jain-guru';
const isProd = process.env.NODE_ENV === 'production';

if (isProd && HOST_PASSCODE === 'jain-guru') {
  console.error('FATAL: HOST_PASSCODE is unset or still the default ("jain-guru"). Set a real HOST_PASSCODE env var before running in production.');
  process.exit(1);
}

const app = express();
app.use(express.json());
if (!isProd) app.use(cors());

function requireHost(req, res, next) {
  if (req.headers['x-host-passcode'] !== HOST_PASSCODE) {
    return res.status(401).json({ ok: false, error: 'अमान्य होस्ट पासकोड।' });
  }
  next();
}

app.post('/api/auth/host', (req, res) => {
  if (req.body?.passcode === HOST_PASSCODE) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'अमान्य होस्ट पासकोड।' });
});

app.get('/api/quizzes', requireHost, async (req, res) => {
  res.json({ ok: true, quizzes: await listQuizzes() });
});

app.get('/api/quizzes/:id', requireHost, async (req, res) => {
  const quiz = await getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ ok: false, error: 'नहीं मिला।' });
  res.json({ ok: true, quiz });
});

app.post('/api/quizzes', requireHost, async (req, res) => {
  const quiz = await createQuiz(req.body || {});
  res.json({ ok: true, quiz });
});

app.put('/api/quizzes/:id', requireHost, async (req, res) => {
  const quiz = await updateQuiz(req.params.id, req.body || {});
  if (!quiz) return res.status(404).json({ ok: false, error: 'नहीं मिला।' });
  res.json({ ok: true, quiz });
});

app.delete('/api/quizzes/:id', requireHost, async (req, res) => {
  const deleted = await deleteQuiz(req.params.id);
  res.json({ ok: deleted });
});

app.post('/api/rooms', requireHost, async (req, res) => {
  const quiz = await getQuiz(req.body?.quizId);
  if (!quiz) return res.status(404).json({ ok: false, error: 'क्विज़ नहीं मिला।' });
  if (!quiz.questions.length) return res.status(400).json({ ok: false, error: 'क्विज़ में कोई प्रश्न नहीं है।' });
  const room = createRoom(quiz);
  res.json({ ok: true, pin: room.pin });
});

app.get('/api/rooms/:pin', async (req, res) => {
  const room = getRoom(req.params.pin);
  if (!room) return res.status(404).json({ ok: false, error: 'रूम नहीं मिला।' });
  res.json({ ok: true, status: room.status, quizTitle: room.quiz.title, participantCount: room.participants.size });
});

if (isProd) {
  const clientDist = path.resolve(process.cwd(), 'client', 'dist');
  app.use(express.static(clientDist));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).end();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: isProd ? undefined : { origin: '*' },
  maxHttpBufferSize: 1e4,
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Jain Quiz server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
