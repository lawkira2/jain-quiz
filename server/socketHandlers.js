import { getRoom, addParticipant, publicParticipantList, leaderboard, deleteRoom, MAX_PARTICIPANTS } from './rooms.js';
import { computeScore, QUESTION_LIMIT_MS } from './scoring.js';

const HOST_PASSCODE = process.env.HOST_PASSCODE || 'jain-guru';

function questionPayload(room) {
  const q = room.quiz.questions[room.currentQuestionIndex];
  return {
    index: room.currentQuestionIndex,
    total: room.quiz.questions.length,
    text: q.text,
    options: q.options,
    limitMs: QUESTION_LIMIT_MS,
    startTime: room.questionStartTime,
  };
}

function closeQuestion(io, room) {
  if (room.status !== 'question') return;
  if (room.questionTimeout) {
    clearTimeout(room.questionTimeout);
    room.questionTimeout = null;
  }
  room.status = 'results';

  const q = room.quiz.questions[room.currentQuestionIndex];
  const counts = [0, 0, 0, 0];
  for (const p of room.participants.values()) {
    if (p.currentAnswer && p.currentAnswer.questionIndex === room.currentQuestionIndex) {
      counts[p.currentAnswer.optionIndex] += 1;
    }
  }

  for (const p of room.participants.values()) {
    const answer = p.currentAnswer && p.currentAnswer.questionIndex === room.currentQuestionIndex ? p.currentAnswer : null;
    const correct = !!answer && answer.optionIndex === q.correctIndex;
    const points = answer ? computeScore(correct, answer.elapsedMs) : 0;
    p.score += points;
    p.answers.push({ questionIndex: room.currentQuestionIndex, optionIndex: answer?.optionIndex ?? null, correct, points });
    p.currentAnswer = null;

    io.to(p.id).emit('participant:result', {
      correct,
      points,
      score: p.score,
      correctIndex: q.correctIndex,
    });
  }

  io.to(room.pin).emit('question:results', {
    index: room.currentQuestionIndex,
    correctIndex: q.correctIndex,
    counts,
    leaderboard: leaderboard(room, { limit: 10 }),
    isLastQuestion: room.currentQuestionIndex === room.quiz.questions.length - 1,
  });
}

function startQuestion(io, room, index) {
  room.currentQuestionIndex = index;
  room.status = 'question';
  room.questionStartTime = Date.now();
  io.to(room.pin).emit('question:show', questionPayload(room));
  room.questionTimeout = setTimeout(() => closeQuestion(io, room), QUESTION_LIMIT_MS + 300);
}

function answeredCount(room) {
  let n = 0;
  for (const p of room.participants.values()) {
    if (p.currentAnswer && p.currentAnswer.questionIndex === room.currentQuestionIndex) n += 1;
  }
  return n;
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedPin = null;
    let role = null; // 'host' | 'participant'

    socket.on('host:join', ({ pin, passcode } = {}, ack) => {
      const room = getRoom(pin);
      if (!room) return ack?.({ ok: false, error: 'Room not found.' });
      if (passcode !== HOST_PASSCODE) return ack?.({ ok: false, error: 'Invalid host passcode.' });
      room.hostSocketId = socket.id;
      socket.join(room.pin);
      joinedPin = room.pin;
      role = 'host';
      ack?.({
        ok: true,
        room: {
          pin: room.pin,
          status: room.status,
          quizTitle: room.quiz.title,
          totalQuestions: room.quiz.questions.length,
          participants: publicParticipantList(room),
        },
      });
    });

    socket.on('participant:join', ({ pin, name } = {}, ack) => {
      const room = getRoom(pin);
      if (!room) return ack?.({ ok: false, error: 'Room not found. Check the PIN.' });
      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'This quiz has already started.' });
      if (room.participants.size >= MAX_PARTICIPANTS) return ack?.({ ok: false, error: 'Room is full.' });
      const cleanName = (name || '').trim().slice(0, 24);
      if (!cleanName) return ack?.({ ok: false, error: 'Please enter your name.' });

      const participant = addParticipant(room, { socketId: socket.id, name: cleanName });
      socket.join(room.pin);
      joinedPin = room.pin;
      role = 'participant';

      io.to(room.pin).emit('lobby:update', {
        count: room.participants.size,
        participants: publicParticipantList(room),
      });
      ack?.({ ok: true, participant: { id: participant.id, name: participant.name }, quizTitle: room.quiz.title });
    });

    socket.on('host:start', ({ pin } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'Not authorized.' });
      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'Quiz already started.' });
      if (room.quiz.questions.length === 0) return ack?.({ ok: false, error: 'Quiz has no questions.' });
      startQuestion(io, room, 0);
      ack?.({ ok: true });
    });

    socket.on('host:next', ({ pin } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'Not authorized.' });
      if (room.status === 'question') {
        closeQuestion(io, room);
        return ack?.({ ok: true });
      }
      const nextIndex = room.currentQuestionIndex + 1;
      if (nextIndex >= room.quiz.questions.length) {
        room.status = 'final';
        io.to(room.pin).emit('quiz:final', { leaderboard: leaderboard(room) });
        return ack?.({ ok: true, finished: true });
      }
      startQuestion(io, room, nextIndex);
      ack?.({ ok: true });
    });

    socket.on('host:end', ({ pin } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'Not authorized.' });
      io.to(room.pin).emit('room:closed');
      deleteRoom(room.pin);
      ack?.({ ok: true });
    });

    socket.on('participant:answer', ({ pin, optionIndex } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.status !== 'question') return ack?.({ ok: false, error: 'No active question.' });
      const participant = room.participants.get(socket.id);
      if (!participant) return ack?.({ ok: false, error: 'Not joined.' });
      if (participant.currentAnswer) return ack?.({ ok: false, error: 'Already answered.' });
      if (![0, 1, 2, 3].includes(optionIndex)) return ack?.({ ok: false, error: 'Invalid option.' });

      const elapsedMs = Date.now() - room.questionStartTime;
      participant.currentAnswer = { questionIndex: room.currentQuestionIndex, optionIndex, elapsedMs };
      ack?.({ ok: true, locked: true });

      if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('question:answeredCount', {
          count: answeredCount(room),
          total: room.participants.size,
        });
      }
      if (answeredCount(room) >= room.participants.size && room.participants.size > 0) {
        closeQuestion(io, room);
      }
    });

    socket.on('disconnect', () => {
      if (!joinedPin) return;
      const room = getRoom(joinedPin);
      if (!room) return;
      if (role === 'participant') {
        const participant = room.participants.get(socket.id);
        if (participant) {
          participant.connected = false;
          io.to(room.pin).emit('lobby:update', {
            count: room.participants.size,
            participants: publicParticipantList(room),
          });
        }
      }
    });
  });
}
