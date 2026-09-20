import { nanoid } from 'nanoid';

const PIN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I to avoid confusion
export const MAX_PARTICIPANTS = 500;

const rooms = new Map(); // pin -> room

function generatePin() {
  let pin;
  do {
    pin = Array.from({ length: 6 }, () => PIN_ALPHABET[Math.floor(Math.random() * PIN_ALPHABET.length)]).join('');
  } while (rooms.has(pin));
  return pin;
}

export function createRoom(quiz) {
  const pin = generatePin();
  const room = {
    pin,
    quiz,
    status: 'lobby', // lobby | question | results | final
    currentQuestionIndex: -1,
    questionStartTime: null,
    questionTimeout: null,
    hostSocketId: null,
    participants: new Map(), // socketId -> participant
    createdAt: Date.now(),
  };
  rooms.set(pin, room);
  return room;
}

export function getRoom(pin) {
  return rooms.get((pin || '').toUpperCase()) || null;
}

export function deleteRoom(pin) {
  const room = rooms.get(pin);
  if (room?.questionTimeout) clearTimeout(room.questionTimeout);
  rooms.delete(pin);
}

export function addParticipant(room, { socketId, name }) {
  const participant = {
    id: socketId,
    name,
    score: 0,
    connected: true,
    currentAnswer: null, // reset each question
    answers: [], // history: {questionIndex, optionIndex, correct, points, elapsedMs}
    joinedAt: Date.now(),
  };
  room.participants.set(socketId, participant);
  return participant;
}

export function publicParticipantList(room) {
  return Array.from(room.participants.values()).map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
  }));
}

export function leaderboard(room, { limit } = {}) {
  const list = Array.from(room.participants.values())
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  return limit ? list.slice(0, limit) : list;
}

export { rooms };
