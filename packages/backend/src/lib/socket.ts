import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { WsEvents } from "@streamguard/shared";
import { logger } from "./logger.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/ws",
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "WebSocket client connected");
    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "WebSocket client disconnected");
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function emitEvent<K extends keyof WsEvents>(event: K, data: WsEvents[K]) {
  getIO().emit(event, data);
}
