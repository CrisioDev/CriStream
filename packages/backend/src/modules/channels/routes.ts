import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { channelService } from "./service.js";

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
}
