import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { discordService } from "./service.js";
import { registerCommandsForChannel } from "../../discord/slash-commands.js";
import type { UpdateDiscordSettingsDto } from "@streamguard/shared";

export async function discordRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // Get Discord settings
  app.get<{ Params: { cid: string } }>("/:cid/discord", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }

    const settings = await discordService.getSettings(request.params.cid);
    return { success: true, data: settings };
  });

  // Update Discord settings
  app.patch<{ Params: { cid: string }; Body: UpdateDiscordSettingsDto }>(
    "/:cid/discord",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }

      const settings = await discordService.updateSettings(request.params.cid, request.body);
      return { success: true, data: settings };
    }
  );

  // Sync slash commands for guild
  app.post<{ Params: { cid: string } }>("/:cid/discord/sync-commands", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (!canEdit(role)) {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }

    try {
      await registerCommandsForChannel(request.params.cid);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
