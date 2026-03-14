import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { channelService } from "./service.js";

export async function channelRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Get user's channels
  app.get("/", async (request) => {
    const channels = await channelService.getChannelsForUser(request.user!.sub);
    return { success: true, data: channels };
  });

  // Get single channel
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const channel = await channelService.getChannel(request.params.id, request.user!.sub);
    return { success: true, data: channel };
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
