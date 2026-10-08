import { io } from 'socket.io-client';
let socket = null;
export const getSocket = () => {
  if (!socket) socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: { token: localStorage.getItem('token') }
  });
  return socket;
};
export const closeSocket = () => { socket?.disconnect(); socket = null; };
