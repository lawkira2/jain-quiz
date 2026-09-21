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

    io.to(p.socketId).emit('participant:result', {
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

// What a reconnecting participant needs to jump straight back into the live state,
// instead of always restarting at the lobby.
function resumeState(room, participant) {
  if (room.status === 'question') {
    const answered = participant.currentAnswer?.questionIndex === room.currentQuestionIndex;
    return {
      status: 'question',
      question: questionPayload(room),
      alreadyAnswered: answered,
      selectedIndex: answered ? participant.currentAnswer.optionIndex : null,
    };
  }
  if (room.status === 'results') {
    const q = room.quiz.questions[room.currentQuestionIndex];
    const counts = [0, 0, 0, 0];
    for (const p of room.participants.values()) {
      const ans = p.answers.find((a) => a.questionIndex === room.currentQuestionIndex);
      if (ans && ans.optionIndex !== null) counts[ans.optionIndex] += 1;
    }
    const myAnswer = participant.answers.find((a) => a.questionIndex === room.currentQuestionIndex);
    return {
      status: 'results',
      question: questionPayload(room),
      results: {
        index: room.currentQuestionIndex,
        correctIndex: q.correctIndex,
        counts,
        leaderboard: leaderboard(room, { limit: 10 }),
        isLastQuestion: room.currentQuestionIndex === room.quiz.questions.length - 1,
      },
      personalResult: myAnswer
        ? { correct: myAnswer.correct, points: myAnswer.points, score: participant.score, correctIndex: q.correctIndex }
        : null,
    };
  }
  if (room.status === 'final') {
    return { status: 'final', leaderboard: leaderboard(room) };
  }
  return { status: 'lobby' };
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedPin = null;
    let role = null; // 'host' | 'participant'
    let participantId = null;

    socket.on('host:join', ({ pin, passcode } = {}, ack) => {
      const room = getRoom(pin);
      if (!room) return ack?.({ ok: false, error: 'रूम नहीं मिला।' });
      if (passcode !== HOST_PASSCODE) return ack?.({ ok: false, error: 'अमान्य होस्ट पासकोड।' });
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

    socket.on('participant:join', ({ pin, name, participantId: knownId } = {}, ack) => {
      const room = getRoom(pin);
      if (!room) return ack?.({ ok: false, error: 'रूम नहीं मिला। पिन जांचें।' });

      // Reconnect path: a participant who already has a spot in this room (dropped
      // connection, backgrounded phone, page reload) can rejoin at any room status —
      // this restores their existing score/answers onto the new socket instead of
      // treating them as a brand-new player.
      const existing = knownId ? room.participants.get(knownId) : null;
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        socket.join(room.pin);
        joinedPin = room.pin;
        role = 'participant';
        participantId = existing.id;

        io.to(room.pin).emit('lobby:update', {
          count: room.participants.size,
          participants: publicParticipantList(room),
        });
        return ack?.({
          ok: true,
          participant: { id: existing.id, name: existing.name },
          quizTitle: room.quiz.title,
          resume: resumeState(room, existing),
        });
      }

      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'यह क्विज़ पहले ही शुरू हो चुका है।' });
      if (room.participants.size >= MAX_PARTICIPANTS) return ack?.({ ok: false, error: 'रूम भर गया है।' });
      const cleanName = (name || '').trim().slice(0, 24);
      if (!cleanName) return ack?.({ ok: false, error: 'कृपया अपना नाम दर्ज करें।' });

      const participant = addParticipant(room, { socketId: socket.id, name: cleanName });
      socket.join(room.pin);
      joinedPin = room.pin;
      role = 'participant';
      participantId = participant.id;

      io.to(room.pin).emit('lobby:update', {
        count: room.participants.size,
        participants: publicParticipantList(room),
      });
      ack?.({
        ok: true,
        participant: { id: participant.id, name: participant.name },
        quizTitle: room.quiz.title,
        resume: { status: 'lobby' },
      });
    });

    socket.on('host:start', ({ pin } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'अनुमति नहीं है।' });
      if (room.status !== 'lobby') return ack?.({ ok: false, error: 'क्विज़ पहले ही शुरू हो चुका है।' });
      if (room.quiz.questions.length === 0) return ack?.({ ok: false, error: 'क्विज़ में कोई प्रश्न नहीं है।' });
      startQuestion(io, room, 0);
      ack?.({ ok: true });
    });

    socket.on('host:next', ({ pin } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'अनुमति नहीं है।' });
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
      if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: 'अनुमति नहीं है।' });
      io.to(room.pin).emit('room:closed');
      deleteRoom(room.pin);
      ack?.({ ok: true });
    });

    socket.on('participant:answer', ({ pin, optionIndex } = {}, ack) => {
      const room = getRoom(pin);
      if (!room || room.status !== 'question') return ack?.({ ok: false, error: 'कोई सक्रिय प्रश्न नहीं है।' });
      const participant = participantId ? room.participants.get(participantId) : null;
      if (!participant) return ack?.({ ok: false, error: 'आप शामिल नहीं हुए हैं।' });
      if (participant.currentAnswer) return ack?.({ ok: false, error: 'पहले ही उत्तर दे दिया गया है।' });
      if (![0, 1, 2, 3].includes(optionIndex)) return ack?.({ ok: false, error: 'अमान्य विकल्प।' });

      const elapsedMs = Date.now() - room.questionStartTime;
      participant.currentAnswer = { questionIndex: room.currentQuestionIndex, optionIndex, elapsedMs };
      ack?.({ ok: true, locked: true });

      io.to(room.pin).emit('question:answeredCount', {
        count: answeredCount(room),
        total: room.participants.size,
      });
      if (answeredCount(room) >= room.participants.size && room.participants.size > 0) {
        closeQuestion(io, room);
      }
    });

    socket.on('disconnect', () => {
      if (!joinedPin) return;
      const room = getRoom(joinedPin);
      if (!room) return;
      if (role === 'participant') {
        const participant = participantId ? room.participants.get(participantId) : null;
        // Only mark disconnected if this socket is still the participant's current one —
        // a reconnect may have already re-attached a newer socket to this participant.
        if (participant && participant.socketId === socket.id) {
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
