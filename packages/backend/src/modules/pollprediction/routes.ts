import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { prisma } from "../../lib/prisma.js";
import type { UpdatePollPredictionSettingsDto } from "@streamguard/shared";

async function getOrCreateSettings(channelId: string) {
  return prisma.pollPredictionSettings.upsert({
    where: { channelId },
    create: { channelId },
    update: {},
  });
}

export async function pollPredictionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  app.get<{ Params: { cid: string } }>(
    "/:cid/poll-prediction-settings",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (role === "none") {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const settings = await getOrCreateSettings(request.params.cid);
      return { success: true, data: settings };
    }
  );

  app.patch<{ Params: { cid: string }; Body: UpdatePollPredictionSettingsDto }>(
    "/:cid/poll-prediction-settings",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      await getOrCreateSettings(request.params.cid);
      const settings = await prisma.pollPredictionSettings.update({
        where: { channelId: request.params.cid },
        data: request.body,
      });
      return { success: true, data: settings };
    }
  );
}
