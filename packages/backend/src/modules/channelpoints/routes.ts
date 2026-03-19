import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { channelPointService } from "./service.js";
import { executeRewardActions } from "./action-executor.js";
import type { CreateChannelPointRewardDto, UpdateChannelPointRewardDto } from "@streamguard/shared";

export async function channelPointRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // List all channel point rewards
  app.get<{ Params: { cid: string } }>("/:cid/channelpoints", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }
    const rewards = await channelPointService.list(request.params.cid);
    return { success: true, data: rewards };
  });

  // Create reward mapping
  app.post<{ Params: { cid: string }; Body: CreateChannelPointRewardDto }>(
    "/:cid/channelpoints",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const reward = await channelPointService.create(request.params.cid, request.body);
        return { success: true, data: reward };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Update reward mapping
  app.patch<{ Params: { cid: string; rid: string }; Body: UpdateChannelPointRewardDto }>(
    "/:cid/channelpoints/:rid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const reward = await channelPointService.update(
          request.params.cid,
          request.params.rid,
          request.body
        );
        return { success: true, data: reward };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Delete reward mapping
  app.delete<{ Params: { cid: string; rid: string } }>(
    "/:cid/channelpoints/:rid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      await channelPointService.delete(request.params.cid, request.params.rid);
      return { success: true };
    }
  );

  // Test reward actions
  app.post<{ Params: { cid: string; rid: string } }>(
    "/:cid/channelpoints/:rid/test",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }

      const rewards = await channelPointService.list(request.params.cid);
      const reward = rewards.find((r) => r.id === request.params.rid);
      if (!reward) {
        return reply.status(404).send({ success: false, error: "Reward not found" });
      }

      // Use channel displayName for chat actions
      const { prisma } = await import("../../lib/prisma.js");
      const channel = await prisma.channel.findUnique({
        where: { id: request.params.cid },
        select: { displayName: true },
      });

      await executeRewardActions(
        request.params.cid,
        channel?.displayName ?? "testchannel",
        "TestUser",
        "test input",
        reward.rewardTitle,
        reward.actionConfig
      );

      return { success: true };
    }
  );
}
