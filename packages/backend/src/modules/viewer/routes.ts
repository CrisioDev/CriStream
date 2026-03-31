import type { FastifyInstance, FastifyRequest } from "fastify";
import { viewerService } from "./service.js";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";

function getUser(request: FastifyRequest): { sub: string; twitchId: string } | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), config.jwtSecret) as any;
  } catch {
    return null;
  }
}

export async function viewerRoutes(app: FastifyInstance) {
  // ── Profile (public) ──
  app.get<{ Params: { channelName: string; twitchUserId: string } }>(
    "/:channelName/profile/:twitchUserId",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const profile = await viewerService.getProfile(channel.id, request.params.twitchUserId);
      if (!profile) return reply.status(404).send({ success: false, error: "Viewer not found" });
      return { success: true, data: profile };
    }
  );

  // ── Marketplace (public read) ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/marketplace",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      return { success: true, data: await viewerService.getListings(channel.id) };
    }
  );

  // ── Sell item (auth required) ──
  app.post<{ Params: { channelName: string }; Body: { itemId: string; quantity: number; pricePerUnit: number } }>(
    "/:channelName/marketplace",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      const result = await viewerService.createListing(
        channel.id, user.twitchId, channelUser?.displayName ?? "Unknown",
        request.body.itemId, request.body.quantity, request.body.pricePerUnit
      );
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  // ── Buy listing (auth required) ──
  app.post<{ Params: { channelName: string; listingId: string } }>(
    "/:channelName/marketplace/:listingId/buy",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      const result = await viewerService.buyListing(channel.id, request.params.listingId, user.twitchId, channelUser?.displayName ?? "Unknown");
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  // ── Cancel listing (auth required) ──
  app.delete<{ Params: { channelName: string; listingId: string } }>(
    "/:channelName/marketplace/:listingId",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const result = await viewerService.cancelListing(channel.id, request.params.listingId, user.twitchId);
      if (result.error) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  // ── Trades (auth required) ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/trades",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      return { success: true, data: await viewerService.getTrades(channel.id, user.twitchId) };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { receiverTwitchUserId: string; offeredItems: { itemId: string; quantity: number }[]; requestedItems: { itemId: string; quantity: number }[]; pointsOffered?: number; pointsRequested?: number } }>(
    "/:channelName/trades",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      const result = await viewerService.createTrade(
        channel.id, user.twitchId, channelUser?.displayName ?? "Unknown",
        request.body.receiverTwitchUserId,
        request.body.offeredItems ?? [],
        request.body.requestedItems ?? [],
        request.body.pointsOffered ?? 0,
        request.body.pointsRequested ?? 0
      );
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string; tradeId: string } }>(
    "/:channelName/trades/:tradeId/accept",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const result = await viewerService.acceptTrade(channel.id, request.params.tradeId, user.twitchId);
      if (result.error) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string; tradeId: string } }>(
    "/:channelName/trades/:tradeId/decline",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      await viewerService.declineTrade(request.params.tradeId, user.twitchId);
      return { success: true };
    }
  );

  app.delete<{ Params: { channelName: string; tradeId: string } }>(
    "/:channelName/trades/:tradeId",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      await viewerService.cancelTrade(request.params.tradeId, user.twitchId);
      return { success: true };
    }
  );

  // ── User search ──
  app.get<{ Params: { channelName: string }; Querystring: { q: string } }>(
    "/:channelName/users",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const users = await viewerService.searchUsers(channel.id, request.query.q ?? "");
      return { success: true, data: users };
    }
  );
}
