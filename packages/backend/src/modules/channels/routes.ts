import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { channelService } from "./service.js";
import { prisma } from "../../lib/prisma.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";

export async function channelRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Get user's channels (owned + editor)
  app.get("/", async (request) => {
    const channels = await channelService.getChannelsForUser(request.user!.sub);
    return { success: true, data: channels };
  });

  // Get single channel
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const channel = await channelService.getChannel(request.params.id, request.user!.sub);
    return { success: true, data: channel };
  });

  // Add a new channel
  app.post<{ Body: { twitchUsername: string } }>("/", async (request, reply) => {
    try {
      const channel = await channelService.addChannel(
        request.user!.sub,
        request.body.twitchUsername
      );
      return { success: true, data: channel };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Delete channel
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      await channelService.deleteChannel(request.params.id, request.user!.sub);
      return { success: true };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Update channel settings
  app.patch<{ Params: { id: string }; Body: { commandPrefix?: string } }>(
    "/:id",
    async (request) => {
      const channel = await channelService.updateChannel(
        request.params.id,
        request.user!.sub,
        request.body
      );
      return { success: true, data: channel };
    }
  );

  // Join bot to channel
  app.post<{ Params: { id: string } }>("/:id/join", async (request) => {
    await channelService.joinBot(request.params.id, request.user!.sub);
    return { success: true };
  });

  // Remove bot from channel
  app.post<{ Params: { id: string } }>("/:id/leave", async (request) => {
    await channelService.leaveBot(request.params.id, request.user!.sub);
    return { success: true };
  });

  // Get stream preview thumbnail (for sandbox editor background)
  app.get<{ Params: { id: string } }>("/:id/stream-preview", async (request, reply) => {
    const channel = await prisma.channel.findUnique({ where: { id: request.params.id } });
    if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

    try {
      const api = getTwitchApi();
      const stream = await api.streams.getStreamByUserId(channel.twitchId);
      if (!stream) {
        return { success: true, data: { live: false, thumbnailUrl: null } };
      }
      const url = stream.thumbnailUrl
        .replace("{width}", "1920")
        .replace("{height}", "1080");
      return { success: true, data: { live: true, thumbnailUrl: url + "?t=" + Date.now() } };
    } catch {
      return { success: true, data: { live: false, thumbnailUrl: null } };
    }
  });
}
