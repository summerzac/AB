import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  socket?.disconnect();
  socket = io(API_URL, { auth: { token }, transports: ["websocket", "polling"] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
