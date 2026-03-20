import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { WsEvents } from "@streamguard/shared";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";
import { songRequestService } from "../modules/songrequests/service.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/ws",
  });

  io.on("connection", async (socket) => {
    logger.info({ socketId: socket.id }, "WebSocket client connected");

    // Overlay connection via token query param
    const overlayToken = socket.handshake.query.overlayToken as string | undefined;
    if (overlayToken) {
      try {
        const channel = await prisma.channel.findUnique({
          where: { overlayToken },
        });
        if (channel) {
          socket.join(`channel:${channel.id}`);
          logger.info({ socketId: socket.id, channelId: channel.id }, "Overlay joined channel room");

          // Send current song to player overlay on connect
          songRequestService.getCurrentSong(channel.id).then((song) => {
            socket.emit("songrequest:play", { channelId: channel.id, song });
          }).catch(() => {});
        }
      } catch (err) {
        logger.error({ err }, "Failed to lookup overlay token");
      }
    }

    // Player overlay: song ended → advance queue
    socket.on("songrequest:ended", async (data: { channelId: string }) => {
      try {
        await songRequestService.advanceQueue(data.channelId);
      } catch (err) {
        logger.error({ err }, "Failed to advance song queue");
      }
    });

    // Sandbox relay: dashboard → overlay
    socket.on("sandbox:update", (data: { channelId: string; elements: unknown[] }) => {
      io!.to(`channel:${data.channelId}`).emit("sandbox:update", data);
    });

    socket.on("sandbox:clear", (data: { channelId: string }) => {
      io!.to(`channel:${data.channelId}`).emit("sandbox:clear", data);
    });

    // Dashboard client joining a channel room
    socket.on("join:channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
      logger.debug({ socketId: socket.id, channelId }, "Client joined channel room");
    });

    socket.on("leave:channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

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

export function emitToChannel<K extends keyof WsEvents>(
  channelId: string,
  event: K,
  data: WsEvents[K]
) {
  getIO().to(`channel:${channelId}`).emit(event, data);
}
