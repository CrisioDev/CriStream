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
      const { redis } = await import("../../lib/redis.js");

      const logResult = async (g: string, payout: number, cost: number, detail: string) => {
        const entry = JSON.stringify({
          user: channelUser.displayName,
          game: g,
          payout,
          profit: payout - cost,
          detail,
          time: Date.now(),
        });
        const key = `casino:feed:${channel.id}`;
        await redis.lpush(key, entry);
        await redis.ltrim(key, 0, 29);
        await redis.expire(key, 86400);
      };

      // Free play helper
      const useFree = async (g: string) => {
        const k = `free:${g}:${channel.id}:${user.twitchId}`;
        const c = await redis.get(k);
        if (c && parseInt(c) >= 10) return false;
        await redis.incr(k);
        const ttl = await redis.ttl(k);
        if (ttl < 0) { const now = new Date(); const tom = new Date(now); tom.setHours(24,0,0,0); await redis.expire(k, Math.floor((tom.getTime()-now.getTime())/1000)); }
        return true;
      };
      const getFreeLeft = async (g: string) => {
        const c = await redis.get(`free:${g}:${channel.id}:${user.twitchId}`);
        return 10 - (c ? parseInt(c) : 0);
      };

      // Flip
      if (game === "flip") {
        const free = await useFree("flip");
        const cost = free ? 0 : 1;
        if (!free && channelUser.points < 1) return reply.status(400).send({ success: false, error: "Keine Gratis-Flips mehr & keine Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 1 } } });
        const win = Math.random() < 0.55;
        if (win) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: 2 } } });
        const side = Math.random() < 0.5 ? "Kopf" : "Zahl";
        await logResult("flip", win ? 2 : 0, cost, `🪙 ${side}`);
        return { success: true, data: { result: side, win, payout: win ? 2 : 0, cost, free, freeLeft: await getFreeLeft("flip") } };
      }

      // Slots (cost: 20)
      if (game === "slots") {
        const free = await useFree("slots");
        const cost = free ? 0 : 20;
        if (!free && channelUser.points < 20) return reply.status(400).send({ success: false, error: "Keine Gratis-Spins mehr & brauchst 20 Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 20 } } });
        const SYMS = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
        const W = [22,20,18,15,12,8,5];
        function pickSlot() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        const r1=pickSlot(),r2=pickSlot(),r3=pickSlot();
        let payout=12,label="Trostpreis";
        if(r1===r2&&r2===r3){const p:any={"7️⃣":[777,"JACKPOT 777!!!"],"💎":[350,"DIAMANT TRIPLE!"],"⭐":[175,"STERN TRIPLE!"],"🍇":[90,"TRIPLE!"],"🍊":[70,"TRIPLE!"],"🍋":[55,"TRIPLE!"],"🍒":[45,"TRIPLE!"]};[payout,label]=p[r1]??[55,"TRIPLE!"];}
        else if(r1===r2||r2===r3||r1===r3){payout=30;label="Doppelt!";}
        if(payout>0) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: payout } } });
        await logResult("slots", payout, cost, `🎰 ${r1}${r2}${r3} ${label}`);
        return { success: true, data: { reels: [r1,r2,r3], payout, cost, label, free, freeLeft: await getFreeLeft("slots") } };
      }

      // Scratch (cost: 40)
      if (game === "scratch") {
        const free = await useFree("scratch");
        const cost = free ? 0 : 40;
        if (!free && channelUser.points < 40) return reply.status(400).send({ success: false, error: "Keine Gratis-Lose mehr & brauchst 40 Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 40 } } });
        const SYMS = ["🍀","💰","🎁","👑","💎","🌟"];
        const W = [28,24,20,14,9,5];
        function pickScratch() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        const s1=pickScratch(),s2=pickScratch(),s3=pickScratch();
        let payout=20,label="Trostpreis";
        if(s1===s2&&s2===s3){const p:any={"🌟":[1000,"MEGA GEWINN!!!"],"💎":[500,"DIAMANT!"],"👑":[300,"KÖNIGLICH!"],"🎁":[175,"GESCHENK!"],"💰":[120,"GELDREGEN!"],"🍀":[85,"GLÜCKSKLEE!"]};[payout,label]=p[s1]??[85,"DREIER!"];}
        else if(s1===s2||s2===s3||s1===s3){payout=40;label="Zweier!";}
        if(payout>0) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: payout } } });
        await logResult("scratch", payout, cost, `🎟️ ${s1}${s2}${s3} ${label}`);
        return { success: true, data: { symbols: [s1,s2,s3], payout, cost, label, free, freeLeft: await getFreeLeft("scratch") } };
      }

      // Double or Nothing
      if (game === "double") {
        const amount = request.body.amount as number | undefined;
        if (!amount || amount < 1) return reply.status(400).send({ success: false, error: "Ungültiger Betrag" });
        if (channelUser.points < amount) return reply.status(400).send({ success: false, error: `Nicht genug Punkte! Hast ${channelUser.points}.` });
        await pointsService.deductPoints(channel.id, user.twitchId, amount);
        const win = Math.random() < 0.48; // 48% — slight house edge on double
        if (win) {
          await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: amount * 2 } } });
        }
        await logResult("double", win ? amount * 2 : 0, amount, win ? `⚡ x2 → ${amount * 2}` : `💥 Verloren`);
        return { success: true, data: { win, amount, payout: win ? amount * 2 : 0 } };
      }

      return reply.status(400).send({ success: false, error: "Unbekanntes Spiel" });
    }
  );

  // ── Free plays remaining ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/free",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { redis } = await import("../../lib/redis.js");
      const get = async (g: string) => { const c = await redis.get(`free:${g}:${channel.id}:${user.twitchId}`); return 10 - (c ? parseInt(c) : 0); };
      return { success: true, data: { flip: await get("flip"), slots: await get("slots"), scratch: await get("scratch") } };
    }
  );

  // ── Bingo & Lotto ticket check ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/tickets",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { redis } = await import("../../lib/redis.js");

      const bingoRaw = await redis.hget(`bingo:tickets:${channel.id}`, user.twitchId);
      const lottoRaw = await redis.hget(`lotto:tickets:${channel.id}`, user.twitchId);
      const lastBingo = await redis.get(`bingo:lastdraw:${channel.id}`);
      const lastLotto = await redis.get(`lotto:lastdraw:${channel.id}`);

      return {
        success: true,
        data: {
          bingo: bingoRaw ? JSON.parse(bingoRaw) : null,
          lotto: lottoRaw ? JSON.parse(lottoRaw) : null,
          lastBingoDraw: lastBingo ? JSON.parse(lastBingo) : null,
          lastLottoDraw: lastLotto ? JSON.parse(lastLotto) : null,
        },
      };
    }
  );

  // ── Casino live feed + leaderboard ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/feed",
    async (_request, reply) => {
      const channel = await viewerService.resolveChannel(_request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { redis } = await import("../../lib/redis.js");
      const raw = await redis.lrange(`casino:feed:${channel.id}`, 0, 19);
      const feed = raw.map((r: string) => JSON.parse(r));
      return { success: true, data: feed };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/leaderboard",
    async (_request, reply) => {
      const channel = await viewerService.resolveChannel(_request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const top = await prisma.channelUser.findMany({
        where: { channelId: channel.id },
        orderBy: { points: "desc" },
        take: 15,
        select: { displayName: true, points: true },
      });
      return { success: true, data: top };
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
