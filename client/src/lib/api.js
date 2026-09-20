const PASSCODE_KEY = 'jainquiz_host_passcode';

export function getHostPasscode() {
  return sessionStorage.getItem(PASSCODE_KEY) || '';
}

export function setHostPasscode(passcode) {
  sessionStorage.setItem(PASSCODE_KEY, passcode);
}

export function clearHostPasscode() {
  sessionStorage.removeItem(PASSCODE_KEY);
}

async function request(path, { method = 'GET', body, hostAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (hostAuth) headers['x-host-passcode'] = getHostPasscode();
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  hostLogin: (passcode) => request('/api/auth/host', { method: 'POST', body: { passcode } }),
  listQuizzes: () => request('/api/quizzes', { hostAuth: true }),
  getQuiz: (id) => request(`/api/quizzes/${id}`, { hostAuth: true }),
  createQuiz: (payload) => request('/api/quizzes', { method: 'POST', body: payload, hostAuth: true }),
  updateQuiz: (id, payload) => request(`/api/quizzes/${id}`, { method: 'PUT', body: payload, hostAuth: true }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, { method: 'DELETE', hostAuth: true }),
  createRoom: (quizId) => request('/api/rooms', { method: 'POST', body: { quizId }, hostAuth: true }),
};
