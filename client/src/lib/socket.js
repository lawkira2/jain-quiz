import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function emitAsync(event, payload) {
  return new Promise((resolve) => {
    getSocket().emit(event, payload, (response) => resolve(response));
  });
}
