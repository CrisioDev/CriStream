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

  // ── Gambling via Web ──
  app.post<{ Params: { channelName: string }; Body: { game: string; amount?: number } }>(
    "/:channelName/gamble",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });

      const game = request.body.game;
      const { pointsService } = await import("../points/service.js");

      // Flip
      if (game === "flip") {
        if (channelUser.points < 1) return reply.status(400).send({ success: false, error: "Nicht genug Punkte!" });
        await pointsService.deductPoints(channel.id, user.twitchId, 1);
        const win = Math.random() < 0.55;
        if (win) await pointsService.addMessagePoints(channel.id, user.twitchId, channelUser.displayName, 2);
        const side = Math.random() < 0.5 ? "Kopf" : "Zahl";
        return { success: true, data: { result: side, win, payout: win ? 2 : 0, cost: 1 } };
      }

      // Slots
      if (game === "slots") {
        if (channelUser.points < 25) return reply.status(400).send({ success: false, error: "Brauchst 25 Punkte!" });
        await pointsService.deductPoints(channel.id, user.twitchId, 25);
        const SYMS = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
        const W = [25,22,20,15,10,6,2];
        function pick() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        const r1=pick(),r2=pick(),r3=pick();
        let payout=10,label="Trostpreis";
        if(r1===r2&&r2===r3){const p:any={"7️⃣":[777,"JACKPOT 777!!!"],"💎":[300,"DIAMANT TRIPLE!"],"⭐":[150,"STERN TRIPLE!"],"🍇":[75,"TRIPLE!"],"🍊":[60,"TRIPLE!"],"🍋":[50,"TRIPLE!"],"🍒":[40,"TRIPLE!"]};[payout,label]=p[r1]??[50,"TRIPLE!"];}
        else if(r1===r2||r2===r3||r1===r3){payout=30;label="Doppelt!";}
        if(payout>0) await pointsService.addMessagePoints(channel.id, user.twitchId, channelUser.displayName, payout);
        return { success: true, data: { reels: [r1,r2,r3], payout, cost: 25, label } };
      }

      // Scratch
      if (game === "scratch") {
        if (channelUser.points < 50) return reply.status(400).send({ success: false, error: "Brauchst 50 Punkte!" });
        await pointsService.deductPoints(channel.id, user.twitchId, 50);
        const SYMS = ["🍀","💰","🎁","👑","💎","🌟"];
        const W = [30,25,20,12,8,5];
        function pick() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        const s1=pick(),s2=pick(),s3=pick();
        let payout=25,label="Trostpreis";
        if(s1===s2&&s2===s3){const p:any={"🌟":[1000,"MEGA GEWINN!!!"],"💎":[500,"DIAMANT!"],"👑":[250,"KÖNIGLICH!"],"🎁":[150,"GESCHENK!"],"💰":[100,"GELDREGEN!"],"🍀":[75,"GLÜCKSKLEE!"]};[payout,label]=p[s1]??[75,"DREIER!"];}
        else if(s1===s2||s2===s3||s1===s3){payout=45;label="Zweier!";}
        if(payout>0) await pointsService.addMessagePoints(channel.id, user.twitchId, channelUser.displayName, payout);
        return { success: true, data: { symbols: [s1,s2,s3], payout, cost: 50, label } };
      }

      // Double or Nothing
      if (game === "double") {
        const amount = request.body.amount as number | undefined;
        if (!amount || amount < 1) return reply.status(400).send({ success: false, error: "Ungültiger Betrag" });
        if (channelUser.points < amount) return reply.status(400).send({ success: false, error: `Nicht genug Punkte! Hast ${channelUser.points}.` });
        await pointsService.deductPoints(channel.id, user.twitchId, amount);
        const win = Math.random() < 0.48; // 48% — slight house edge on double
        if (win) {
          await pointsService.addMessagePoints(channel.id, user.twitchId, channelUser.displayName, amount * 2);
        }
        return { success: true, data: { win, amount, payout: win ? amount * 2 : 0 } };
      }

      return reply.status(400).send({ success: false, error: "Unbekanntes Spiel" });
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
