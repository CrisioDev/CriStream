import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { discordService } from "./service.js";
import { registerCommandsForChannel } from "../../discord/slash-commands.js";
import { summarizeDiscordChat } from "../summaries/discord-summary-service.js";
import { sendEmbedToDiscordChannel } from "../../discord/discord-client.js";
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

  // Trigger Discord chat summary manually
  app.post<{ Params: { cid: string }; Querystring: { hours?: string } }>(
    "/:cid/discord/summary",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }

      const settings = await discordService.getSettings(request.params.cid);
      if (!settings.guildId) {
        return reply.status(400).send({ success: false, error: "No Guild ID configured" });
      }

      const hours = parseInt(request.query.hours ?? "24", 10);
      const embed = await summarizeDiscordChat(settings.guildId, hours);

      if (!embed) {
        return reply.status(400).send({ success: false, error: "Not enough messages or AI not configured" });
      }

      if (settings.summaryChannelId) {
        await sendEmbedToDiscordChannel(settings.summaryChannelId, embed);
      }

      return { success: true, data: { posted: !!settings.summaryChannelId } };
    }
  );
}
