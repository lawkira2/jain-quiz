const KEY_PREFIX = 'jainquiz_participant_';

// A participant's spot in a room survives their socket connection dying (phone locked/
// backgrounded, brief network drop, even a full page reload) — the server keys them by
// this id, not by the live socket id. Scoped per-PIN since a browser could in principle
// be used to join more than one room over time.
export function saveParticipantSession(pin, { id, name }) {
  try {
    localStorage.setItem(KEY_PREFIX + pin, JSON.stringify({ id, name }));
  } catch {
    // ignore — worst case, a reload falls back to a fresh join
  }
}

export function loadParticipantSession(pin) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + pin);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearParticipantSession(pin) {
  try {
    localStorage.removeItem(KEY_PREFIX + pin);
  } catch {
    // ignore
  }
}
