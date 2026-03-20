import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { channelPointService } from "./service.js";
import { executeRewardActions } from "./action-executor.js";
import type { CreateChannelPointRewardDto, UpdateChannelPointRewardDto, CreateTwitchRewardDto, UpdateTwitchRewardDto } from "@streamguard/shared";
import { prisma } from "../../lib/prisma.js";
import {
  getTwitchRewards,
  createTwitchReward,
  updateTwitchReward,
  deleteTwitchReward,
} from "../../twitch/twitch-api.js";

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

  // ── Twitch Reward Management (actual Twitch API) ──

  // List Twitch rewards from Twitch API
  app.get<{ Params: { cid: string } }>("/:cid/channelpoints/twitch", async (request, reply) => {
    const role = await getChannelAccess(request.params.cid, request.user!.sub);
    if (role === "none") {
      return reply.status(403).send({ success: false, error: "Insufficient permissions" });
    }
    try {
      const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const rewards = await getTwitchRewards(channel.twitchId);
      return { success: true, data: rewards };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Create Twitch reward
  app.post<{ Params: { cid: string }; Body: CreateTwitchRewardDto }>(
    "/:cid/channelpoints/twitch",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

        // Enforce Twitch limit of 50 custom rewards
        const existing = await getTwitchRewards(channel.twitchId);
        if (existing.length >= 50) {
          return reply.status(400).send({ success: false, error: "Twitch-Limit erreicht: max 50 Custom Rewards pro Kanal" });
        }

        const reward = await createTwitchReward(channel.twitchId, request.body);
        return { success: true, data: reward };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Update Twitch reward
  app.patch<{ Params: { cid: string; trid: string }; Body: UpdateTwitchRewardDto }>(
    "/:cid/channelpoints/twitch/:trid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
        const reward = await updateTwitchReward(channel.twitchId, request.params.trid, request.body);
        return { success: true, data: reward };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Delete Twitch reward
  app.delete<{ Params: { cid: string; trid: string } }>(
    "/:cid/channelpoints/twitch/:trid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
        await deleteTwitchReward(channel.twitchId, request.params.trid);
        return { success: true };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Import Twitch rewards — sync rewardIds for existing titles, create missing ones
  app.post<{ Params: { cid: string } }>(
    "/:cid/channelpoints/import",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

        const twitchRewards = await getTwitchRewards(channel.twitchId);
        const localRewards = await channelPointService.list(request.params.cid);

        let imported = 0;
        let linked = 0;
        let unlinked = 0;

        const twitchIds = new Set(twitchRewards.map((tr) => tr.id));

        // Unlink local rewards whose Twitch reward no longer exists
        for (const local of localRewards) {
          if (local.rewardId && !twitchIds.has(local.rewardId)) {
            await channelPointService.unlinkFromTwitch(request.params.cid, local.id);
            unlinked++;
          }
        }

        for (const tr of twitchRewards) {
          // Check if already linked by rewardId
          const byId = localRewards.find((r) => r.rewardId === tr.id);
          if (byId) continue;

          // Check if exists by title but not linked
          const byTitle = localRewards.find((r) => r.rewardTitle === tr.title && !r.rewardId);
          if (byTitle) {
            await channelPointService.linkToTwitch(request.params.cid, byTitle.id, tr.id);
            linked++;
            continue;
          }

          // Check if title already exists (already linked to different reward)
          const titleExists = localRewards.find((r) => r.rewardTitle === tr.title);
          if (titleExists) continue;

          // Create new local mapping
          const created = await channelPointService.create(request.params.cid, {
            rewardTitle: tr.title, actionConfig: [], cost: tr.cost, prompt: tr.prompt,
            isUserInputRequired: tr.isUserInputRequired, maxPerStream: tr.maxPerStream,
            maxPerUserPerStream: tr.maxPerUserPerStream, globalCooldown: tr.globalCooldown,
            backgroundColor: tr.backgroundColor,
          });
          await channelPointService.linkToTwitch(request.params.cid, created.id, tr.id);
          imported++;
        }

        const allRewards = await channelPointService.list(request.params.cid);
        return { success: true, data: allRewards, meta: { imported, linked, unlinked, total: twitchRewards.length } };
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message });
      }
    }
  );

  // Push local reward to Twitch
  app.post<{ Params: { cid: string; rid: string } }>(
    "/:cid/channelpoints/:rid/push",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

        const mapping = await channelPointService.list(request.params.cid);
        const reward = mapping.find((r) => r.id === request.params.rid);
        if (!reward) return reply.status(404).send({ success: false, error: "Reward not found" });
        if (reward.isSynced) return reply.status(400).send({ success: false, error: "Already synced to Twitch" });

        // Check limit
        const existing = await getTwitchRewards(channel.twitchId);
        if (existing.length >= 50) {
          return reply.status(400).send({ success: false, error: "Twitch-Limit erreicht (50/50). Deaktiviere zuerst eine andere Belohnung." });
        }

        const twitchReward = await createTwitchReward(channel.twitchId, {
          title: reward.rewardTitle,
          cost: reward.cost,
          prompt: reward.prompt,
          isEnabled: reward.enabled,
          isUserInputRequired: reward.isUserInputRequired,
          maxPerStream: reward.maxPerStream,
          maxPerUserPerStream: reward.maxPerUserPerStream,
          globalCooldown: reward.globalCooldown,
          backgroundColor: reward.backgroundColor,
        });

        const updated = await channelPointService.linkToTwitch(request.params.cid, request.params.rid, twitchReward.id);
        return { success: true, data: updated };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
    }
  );

  // Pull reward from Twitch (keep local, optionally try to delete from Twitch)
  app.post<{ Params: { cid: string; rid: string }; Querystring: { deleteFromTwitch?: string } }>(
    "/:cid/channelpoints/:rid/pull",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      try {
        const channel = await prisma.channel.findUnique({ where: { id: request.params.cid } });
        if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

        const mapping = await channelPointService.list(request.params.cid);
        const reward = mapping.find((r) => r.id === request.params.rid);
        if (!reward) return reply.status(404).send({ success: false, error: "Reward not found" });
        if (!reward.isSynced) return reply.status(400).send({ success: false, error: "Not synced to Twitch" });

        let deletedFromTwitch = false;
        // Try to delete from Twitch (only works for bot-created rewards)
        if (request.query.deleteFromTwitch === "true") {
          try {
            await deleteTwitchReward(channel.twitchId, reward.rewardId);
            deletedFromTwitch = true;
          } catch {
            // Can't delete manually-created Twitch rewards — that's OK
          }
        }

        // Unlink locally
        const updated = await channelPointService.unlinkFromTwitch(request.params.cid, request.params.rid);
        return { success: true, data: { ...updated, deletedFromTwitch } };
      } catch (err: any) {
        return reply.status(400).send({ success: false, error: err.message });
      }
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
