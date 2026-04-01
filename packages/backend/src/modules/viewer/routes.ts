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
      const { prePlaySpecials, postPlaySpecials } = await import("../gambling/specials.js");
      const { recordPlay } = await import("../casino/stats.js");
      const { checkAchievements } = await import("../casino/achievements.js");
      const { updateQuestProgress } = await import("../casino/quests.js");
      const { addXp } = await import("../casino/battlepass.js");
      const { getSkills, getLuckBonus, getPayoutMultiplier, getShieldBonus, getExtraFreePlays, getCombatMultiplier } = await import("../casino/skilltree.js");
      const { getPetBonuses } = await import("../casino/pets.js");
      const skills = await getSkills(channel.id, user.twitchId);
      const petBonus = await getPetBonuses(channel.id, user.twitchId);
      const profitMult = getPayoutMultiplier(skills) + petBonus.payout;
      const shieldBonus = getShieldBonus(skills) + petBonus.shield;

      const logResult = async (g: string, payout: number, cost: number, detail: string) => {
        const entry = JSON.stringify({
          user: channelUser.displayName, game: g, payout, profit: payout - cost, detail, time: Date.now(),
        });
        const key = `casino:feed:${channel.id}`;
        await redis.lpush(key, entry);
        await redis.ltrim(key, 0, 29);
        await redis.expire(key, 86400);
      };

      // Free play helper (speed skill adds extra free plays)
      const maxFree = 10 + getExtraFreePlays(skills) + petBonus.freePlays;
      const useFree = async (g: string) => {
        const k = `free:${g}:${channel.id}:${user.twitchId}`;
        const c = await redis.get(k);
        if (c && parseInt(c) >= maxFree) return false;
        await redis.incr(k);
        const ttl = await redis.ttl(k);
        if (ttl < 0) { const now = new Date(); const tom = new Date(now); tom.setHours(24,0,0,0); await redis.expire(k, Math.floor((tom.getTime()-now.getTime())/1000)); }
        return true;
      };
      const getFreeLeft = async (g: string) => {
        const c = await redis.get(`free:${g}:${channel.id}:${user.twitchId}`);
        return 10 - (c ? parseInt(c) : 0);
      };

      const specCtx = { channelId: channel.id, userId: user.twitchId, displayName: channelUser.displayName };

      // Progression helper: runs after every game (wrapped in try-catch so games work even if progression fails)
      const runProgression = async (
        gameType: "flip" | "slots" | "scratch" | "double" | "allin",
        win: boolean,
        payout: number,
        cost: number,
        specials: any[],
        opts?: { isTriple?: boolean; is777?: boolean },
      ) => {
        try {
        const specialTypes = specials.map((s: any) => s.type);
        const stats = await recordPlay(channel.id, user.twitchId, {
          game: gameType,
          win,
          payout,
          cost,
          isTriple: opts?.isTriple,
          is777: opts?.is777,
          specials: specialTypes,
        });

        const [achievements, questResult] = await Promise.all([
          checkAchievements(channel.id, user.twitchId, stats).catch(() => []),
          updateQuestProgress(channel.id, user.twitchId, {
            game: gameType,
            win,
            isTriple: opts?.isTriple,
            streak: stats.currentStreak,
            pointsWon: payout > cost ? payout - cost : 0,
            specialType: specialTypes[0],
            doubleWon: gameType === "double" && win,
            is777: opts?.is777,
            isBossHit: specialTypes.includes("boss_damage") || specialTypes.includes("boss_kill"),
            isAllinWin: gameType === "allin" && win,
          }).catch(() => ({ completed: [] })),
        ]);

        // XP: base 5 for playing, +5 for win, +15 for triple, +90 for 777
        let xp = 5;
        if (win) xp += 5;
        if (opts?.isTriple) xp += 15;
        if (opts?.is777) xp += 90;

        // Daily login XP (first play of the day)
        const today = new Date().toISOString().slice(0, 10);
        const dailyKey = `casino:daily:${channel.id}:${user.twitchId}`;
        const alreadyPlayed = await redis.get(dailyKey);
        if (!alreadyPlayed) {
          xp += 15;
          const now = new Date();
          const tom = new Date(now);
          tom.setHours(24, 0, 0, 0);
          await redis.set(dailyKey, today, "EX", Math.floor((tom.getTime() - now.getTime()) / 1000));
        }

        // Quest completion XP
        if (questResult.completed.length > 0) {
          xp += questResult.completed.length * 30;
          // Check if all 3 quests done
          const { getDailyQuests } = await import("../casino/quests.js");
          const allQuests = await getDailyQuests(channel.id, user.twitchId);
          if (allQuests.every((q) => q.done)) {
            xp += 50; // bonus for completing all 3
          }
        }

        // Achievement unlock XP
        if (achievements.length > 0) {
          xp += achievements.length * 20;
        }

        const xpResult = await addXp(channel.id, user.twitchId, xp, gameType).catch(() => ({ levelUp: false, newLevel: 0, rewards: [] }));

        // Pet XP (5 per play, 10 per win)
        const { addPetXp } = await import("../casino/pets.js");
        await addPetXp(channel.id, user.twitchId, win ? 10 : 5).catch(() => null);

        // ── Login Streak (first play of the day) ──
        let loginStreak: any = undefined;
        try {
          const { checkLoginStreak } = await import("../casino/login-streak.js");
          const streakResult = await checkLoginStreak(channel.id, user.twitchId);
          if (streakResult.isNewDay) {
            loginStreak = streakResult;
          }
        } catch {}

        // ── Lootbox Pet/Item Roll ──
        let lootboxDrop: any = undefined;
        try {
          const { rollLootboxPet, rollLootboxItem, grantLootboxPet, grantLootboxItem } = await import("../casino/lootbox-pets.js");
          const petRoll = rollLootboxPet();
          if (petRoll) {
            await grantLootboxPet(channel.id, user.twitchId, petRoll.pet.id);
            lootboxDrop = { type: "pet" as const, data: petRoll.pet };
          } else {
            const itemRoll = rollLootboxItem();
            if (itemRoll) {
              await grantLootboxItem(channel.id, user.twitchId, itemRoll.item.category, itemRoll.item.emoji, itemRoll.item.bonusValue);
              lootboxDrop = { type: "item" as const, data: itemRoll.item };
            }
          }
        } catch {}

        // ── Tournament Points (on win) ──
        let tournamentPoints: number | undefined = undefined;
        try {
          if (win) {
            const { addTournamentPoints } = await import("../casino/tournaments.js");
            const channelUserForName = await prisma.channelUser.findUnique({
              where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
            });
            const tPts =
              gameType === "flip" ? 1 :
              gameType === "slots" ? (opts?.is777 ? 50 : opts?.isTriple ? 10 : 3) :
              gameType === "scratch" ? (opts?.isTriple ? 10 : 3) :
              gameType === "double" ? 2 : 1;
            await addTournamentPoints(channel.id, user.twitchId, tPts, channelUserForName?.displayName ?? undefined);
            tournamentPoints = tPts;
          }
        } catch {}

        // ── Guild XP (every game) ──
        try {
          const { addGuildXp } = await import("../casino/guilds.js");
          await addGuildXp(channel.id, user.twitchId, win ? 10 : 5);
        } catch {}

        return {
          stats,
          newAchievements: achievements,
          questsCompleted: questResult.completed,
          xp: { gained: xp, levelUp: xpResult.levelUp, newLevel: xpResult.newLevel, rewards: xpResult.rewards },
          loginStreak,
          lootboxDrop,
          tournamentPoints,
        };
        } catch (err) {
          // Progression is non-critical — don't break the game
          return {};
        }
      };

      // ── Flip ──
      if (game === "flip") {
        const pre = await prePlaySpecials({ ...specCtx, game: "flip" });
        const free = await useFree("flip");
        const cost = free ? 0 : 1;
        if (!free && channelUser.points < 1) return reply.status(400).send({ success: false, error: "Keine Gratis-Flips mehr & keine Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 1 } } });
        const winChance = (pre.winChanceOverride ?? 0.50) + getLuckBonus(skills, "flip") + petBonus.flipLuck;
        const win = pre.forceWin || Math.random() < winChance;
        const basePayout = win ? Math.round(2 * profitMult) : 0;
        if (basePayout > 0) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: basePayout } } });
        const side = Math.random() < 0.5 ? "Kopf" : "Zahl";
        const post = await postPlaySpecials({ ...specCtx, game: "flip", win, payout: basePayout, cost });
        const finalPayout = post.adjustedPayout;
        await logResult("flip", finalPayout, cost, `🪙 ${side}`);
        const specials = [...pre.specials, ...post.specials];
        const progression = await runProgression("flip", win, finalPayout, cost, specials);
        return { success: true, data: { result: side, win, payout: finalPayout, cost, free, freeLeft: await getFreeLeft("flip"), specials, ...progression } };
      }

      // ── Slots (cost: 20) ──
      if (game === "slots") {
        const pre = await prePlaySpecials({ ...specCtx, game: "slots" });
        const free = await useFree("slots");
        const cost = free ? 0 : 20;
        if (!free && channelUser.points < 20) return reply.status(400).send({ success: false, error: "Keine Gratis-Spins mehr & brauchst 20 Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 20 } } });
        const SYMS = ["🍒","🍋","🍊","🍇","⭐","💎","7️⃣"];
        const W = [25,22,18,15,10,6,4];
        function pickSlot() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        let r1: string, r2: string, r3: string;
        if (pre.forceWin) {
          const forced = ["🍇","🍊","🍋","⭐"][Math.floor(Math.random()*4)]!;
          r1 = r2 = r3 = forced;
        } else {
          r1=pickSlot(); r2=pickSlot(); r3=pickSlot();
        }
        let payout=8+shieldBonus,label="Trostpreis";
        if(r1===r2&&r2===r3){const p:any={"7️⃣":[777,"JACKPOT 777!!!"],"💎":[350,"DIAMANT TRIPLE!"],"⭐":[175,"STERN TRIPLE!"],"🍇":[90,"TRIPLE!"],"🍊":[70,"TRIPLE!"],"🍋":[55,"TRIPLE!"],"🍒":[45,"TRIPLE!"]};[payout,label]=p[r1]??[55,"TRIPLE!"];}
        else if(r1===r2||r2===r3||r1===r3){payout=22;label="Doppelt!";}
        payout = Math.round(payout * profitMult);
        if(payout>0) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: payout } } });
        const isTriple = r1===r2&&r2===r3;
        const is777 = isTriple && r1==="7️⃣";
        const post = await postPlaySpecials({ ...specCtx, game: "slots", win: payout > cost, payout, cost, reels: [r1,r2,r3], isTriple, is777 });
        const finalPayout = post.adjustedPayout;
        await logResult("slots", finalPayout, cost, `🎰 ${r1}${r2}${r3} ${label}`);
        const specials = [...pre.specials, ...post.specials];
        const progression = await runProgression("slots", payout > cost, finalPayout, cost, specials, { isTriple, is777 });
        return { success: true, data: { reels: [r1,r2,r3], payout: finalPayout, cost, label, free, freeLeft: await getFreeLeft("slots"), specials, ...progression } };
      }

      // ── Scratch (cost: 40) ──
      if (game === "scratch") {
        const pre = await prePlaySpecials({ ...specCtx, game: "scratch" });
        const free = await useFree("scratch");
        const cost = free ? 0 : 40;
        if (!free && channelUser.points < 40) return reply.status(400).send({ success: false, error: "Keine Gratis-Lose mehr & brauchst 40 Punkte!" });
        if (!free) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { decrement: 40 } } });
        const SYMS = ["🍀","💰","🎁","👑","💎","🌟"];
        const W = [30,26,20,12,8,4];
        function pickScratch() { const t=W.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<SYMS.length;i++){r-=W[i]!;if(r<=0)return SYMS[i]!;} return SYMS[0]!; }
        let s1: string, s2: string, s3: string;
        if (pre.forceWin) {
          const forced = ["🎁","💰","👑","🍀"][Math.floor(Math.random()*4)]!;
          s1 = s2 = s3 = forced;
        } else {
          s1=pickScratch(); s2=pickScratch(); s3=pickScratch();
        }
        let payout=15+shieldBonus,label="Trostpreis";
        if(s1===s2&&s2===s3){const p:any={"🌟":[1000,"MEGA GEWINN!!!"],"💎":[500,"DIAMANT!"],"👑":[300,"KÖNIGLICH!"],"🎁":[175,"GESCHENK!"],"💰":[120,"GELDREGEN!"],"🍀":[85,"GLÜCKSKLEE!"]};[payout,label]=p[s1]??[85,"DREIER!"];}
        else if(s1===s2||s2===s3||s1===s3){payout=30;label="Zweier!";}
        payout = Math.round(payout * profitMult);
        if(payout>0) await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: payout } } });
        const isTriple = s1===s2&&s2===s3;
        const post = await postPlaySpecials({ ...specCtx, game: "scratch", win: payout > cost, payout, cost, reels: [s1,s2,s3], isTriple });
        const finalPayout = post.adjustedPayout;
        await logResult("scratch", finalPayout, cost, `🎟️ ${s1}${s2}${s3} ${label}`);
        const specials = [...pre.specials, ...post.specials];
        const progression = await runProgression("scratch", payout > cost, finalPayout, cost, specials, { isTriple });
        return { success: true, data: { symbols: [s1,s2,s3], payout: finalPayout, cost, label, free, freeLeft: await getFreeLeft("scratch"), specials, ...progression } };
      }

      // ── Double or Nothing ──
      if (game === "double") {
        const amount = request.body.amount as number | undefined;
        if (!amount || amount < 1) return reply.status(400).send({ success: false, error: "Ungültiger Betrag" });
        if (channelUser.points < amount) return reply.status(400).send({ success: false, error: `Nicht genug Punkte! Hast ${channelUser.points}.` });
        const pre = await prePlaySpecials({ ...specCtx, game: "double" });
        await pointsService.deductPoints(channel.id, user.twitchId, amount);
        const win = pre.forceWin || Math.random() < 0.48;
        if (win) {
          await prisma.channelUser.update({ where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } }, data: { points: { increment: amount * 2 } } });
        }
        const post = await postPlaySpecials({ ...specCtx, game: "double", win, payout: win ? amount * 2 : 0, cost: amount });
        await logResult("double", win ? amount * 2 : 0, amount, win ? `⚡ x2 → ${amount * 2}` : `💥 Verloren`);
        const specials = [...pre.specials, ...post.specials];
        const progression = await runProgression("double", win, win ? amount * 2 : 0, amount, specials);
        return { success: true, data: { win, amount, payout: win ? amount * 2 : 0, specials, ...progression } };
      }

      // ── All-In ──
      if (game === "allin") {
        const allInCdKey = `casino:allin:cd:${channel.id}:${user.twitchId}`;
        const cdExists = await redis.get(allInCdKey);
        if (cdExists) return reply.status(400).send({ success: false, error: "All-In Cooldown! Versuche es in einer Stunde wieder." });

        if (channelUser.points < 10) return reply.status(400).send({ success: false, error: "Brauchst mindestens 10 Punkte für All-In!" });

        const allInAmount = channelUser.points;
        await prisma.channelUser.update({
          where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
          data: { points: 0 },
        });

        // Set 1 hour cooldown
        await redis.set(allInCdKey, "1", "EX", 3600);

        const win = Math.random() < 0.40;
        const payout = win ? Math.floor(allInAmount * 2.5) : 0;

        if (win) {
          await prisma.channelUser.update({
            where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
            data: { points: payout },
          });
        }

        const detail = win
          ? `🔥 ALL-IN x2.5! ${allInAmount} → ${payout}!!!`
          : `💀 ALL-IN VERLOREN! ${allInAmount} Punkte weg!`;
        await logResult("allin", payout, allInAmount, detail);

        const specials: any[] = [];
        const progression = await runProgression("allin", win, payout, allInAmount, specials);
        return {
          success: true,
          data: {
            win,
            amount: allInAmount,
            payout,
            multiplier: 2.5,
            specials,
            ...progression,
          },
        };
      }

      return reply.status(400).send({ success: false, error: "Unbekanntes Spiel" });
    }
  );

  // ── Glücksrad (daily free wheel) ──
  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/gluecksrad",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { spinGluecksrad } = await import("../gambling/specials.js");
      const result = await spinGluecksrad(channel.id, user.twitchId, channelUser.displayName);
      if (!result.success) return reply.status(400).send({ success: false, error: (result as any).error });

      // Track stats + quests for gluecksrad
      const { updateStats } = await import("../casino/stats.js");
      const { updateQuestProgress } = await import("../casino/quests.js");
      const { addXp } = await import("../casino/battlepass.js");
      const stats = await updateStats(channel.id, user.twitchId, {});
      stats.gluecksradSpins++;
      await updateStats(channel.id, user.twitchId, { gluecksradSpins: stats.gluecksradSpins });
      await updateQuestProgress(channel.id, user.twitchId, { isGluecksrad: true });
      await addXp(channel.id, user.twitchId, 10, "gluecksrad");

      return { success: true, data: result };
    }
  );

  // ── Boss Fight status ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/boss",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getBossStatus } = await import("../gambling/specials.js");
      return { success: true, data: await getBossStatus(channel.id) };
    }
  );

  // ── V-Pet ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/pet",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getPet, getCareState, getMoodMultiplier } = await import("../casino/pets.js");
      const pet = await getPet(channel.id, user.twitchId);
      if (pet) {
        const care = await getCareState(channel.id, user.twitchId);
        if (care) (pet as any).careState = care;
        if (pet.care) (pet as any).mood = Math.round(getMoodMultiplier(pet.care) * 100);
      }
      return { success: true, data: pet };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/pet/shop",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getShop } = await import("../casino/pets.js");
      return { success: true, data: await getShop(channel.id, user.twitchId) };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { petId: string; name?: string } }>(
    "/:channelName/casino/pet/buy",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { buyPet } = await import("../casino/pets.js");
      const result = await buyPet(channel.id, user.twitchId, request.body.petId, request.body.name);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result.pet };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { category: string; itemIndex: number } }>(
    "/:channelName/casino/pet/buy-item",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { buyItem } = await import("../casino/pets.js");
      const result = await buyItem(channel.id, user.twitchId, request.body.category, request.body.itemIndex);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { category: string; itemIndex: number } }>(
    "/:channelName/casino/pet/equip",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { equipItem } = await import("../casino/pets.js");
      const result = await equipItem(channel.id, user.twitchId, request.body.category, request.body.itemIndex);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { category: string } }>(
    "/:channelName/casino/pet/unequip",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { unequipItem } = await import("../casino/pets.js");
      await unequipItem(channel.id, user.twitchId, request.body.category);
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/pet/walk",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { walkPet } = await import("../casino/pets.js");
      const result = await walkPet(channel.id, user.twitchId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/pet/feed",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { feedPet } = await import("../casino/pets.js");
      const result = await feedPet(channel.id, user.twitchId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/pet/clean",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { cleanPoop } = await import("../casino/pets.js");
      await cleanPoop(channel.id, user.twitchId);
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { petId: string } }>(
    "/:channelName/casino/pet/activate",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { setActivePet } = await import("../casino/pets.js");
      const result = await setActivePet(channel.id, user.twitchId, request.body.petId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { name: string } }>(
    "/:channelName/casino/pet/rename",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { renamePet } = await import("../casino/pets.js");
      await renamePet(channel.id, user.twitchId, request.body.name);
      return { success: true };
    }
  );

  // ── Login Streak ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/login-streak",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getLoginData } = await import("../casino/login-streak.js");
      const data = await getLoginData(channel.id, user.twitchId);
      return { success: true, data };
    }
  );

  // ── Pet Battles ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/battle",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getOpenBattle, getBattleHistory } = await import("../casino/pet-battles.js");
      const [battle, history] = await Promise.all([
        getOpenBattle(channel.id),
        getBattleHistory(channel.id),
      ]);
      return { success: true, data: { battle, history } };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { bet: number } }>(
    "/:channelName/casino/battle",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { createBattleChallenge } = await import("../casino/pet-battles.js");
      const result = await createBattleChallenge(channel.id, user.twitchId, channelUser.displayName, request.body.bet);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/battle/accept",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { getOpenBattle, acceptBattle } = await import("../casino/pet-battles.js");
      const battle = await getOpenBattle(channel.id);
      if (!battle) return reply.status(400).send({ success: false, error: "Keine offene Herausforderung!" });
      const result = await acceptBattle(channel.id, battle.challengerId, user.twitchId, channelUser.displayName);
      if (!result.success) return reply.status(400).send({ success: false, error: (result as any).error });
      return { success: true, data: result };
    }
  );

  // ── Tournaments ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/tournament",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getTournamentInfo } = await import("../casino/tournaments.js");
      return { success: true, data: await getTournamentInfo(channel.id) };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/tournament/leaderboard",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getTournamentLeaderboard } = await import("../casino/tournaments.js");
      return { success: true, data: await getTournamentLeaderboard(channel.id) };
    }
  );

  // ── Guilds ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/guilds",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { listGuilds } = await import("../casino/guilds.js");
      return { success: true, data: await listGuilds(channel.id) };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/guild",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getPlayerGuild } = await import("../casino/guilds.js");
      return { success: true, data: await getPlayerGuild(channel.id, user.twitchId) };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { name: string; emoji: string } }>(
    "/:channelName/casino/guild/create",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { createGuild } = await import("../casino/guilds.js");
      const result = await createGuild(channel.id, user.twitchId, channelUser.displayName, request.body.name, request.body.emoji);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: { guildId: result.guildId } };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { guildId: string } }>(
    "/:channelName/casino/guild/join",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { joinGuild } = await import("../casino/guilds.js");
      const result = await joinGuild(channel.id, user.twitchId, channelUser.displayName, request.body.guildId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/guild/leave",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { leaveGuild } = await import("../casino/guilds.js");
      const result = await leaveGuild(channel.id, user.twitchId);
      if (!result.success) return reply.status(400).send({ success: false, error: (result as any).error });
      return { success: true };
    }
  );

  // ── Pet Breeding ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/breed",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getBreedInfo } = await import("../casino/pet-breeding.js");
      return { success: true, data: await getBreedInfo(channel.id, user.twitchId) };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { pet1Id: string; pet2Id: string } }>(
    "/:channelName/casino/breed",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { breedPets } = await import("../casino/pet-breeding.js");
      const result = await breedPets(channel.id, user.twitchId, request.body.pet1Id, request.body.pet2Id);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  // ── Bonus Summary ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/bonuses",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getFullBonusSummary } = await import("../casino/bonus-summary.js");
      return { success: true, data: await getFullBonusSummary(channel.id, user.twitchId) };
    }
  );

  // ── Skill Tree ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/skills",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getSkillSummary } = await import("../casino/skilltree.js");
      return { success: true, data: await getSkillSummary(channel.id, user.twitchId) };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { skill: string } }>(
    "/:channelName/casino/skills/upgrade",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { upgradeSkill } = await import("../casino/skilltree.js");
      const result = await upgradeSkill(channel.id, user.twitchId, request.body.skill as any);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  // ── Prestige ──
  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/prestige",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { doPrestige } = await import("../casino/autoflip.js");
      const result = await doPrestige(channel.id, user.twitchId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  // ── Auto-Flip Status ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/autoflip",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getAutoFlipStatus } = await import("../casino/autoflip.js");
      return { success: true, data: await getAutoFlipStatus(channel.id, user.twitchId) };
    }
  );

  // ── Auto-Flip Toggle ──
  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/autoflip/toggle",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { toggleAutoFlip } = await import("../casino/autoflip.js");
      const active = await toggleAutoFlip(channel.id, user.twitchId);
      return { success: true, data: { active } };
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
      const get = async (g: string) => { const c = await redis.get(`free:${g}:${channel.id}:${user.twitchId}`); return Math.max(0, 10 - (c ? parseInt(c) : 0)); };
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

  // ══════════════════════════════════════════════════════════
  // ── Casino Progression Endpoints ──
  // ══════════════════════════════════════════════════════════

  // ── Player Stats ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/stats",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getStats } = await import("../casino/stats.js");
      const stats = await getStats(channel.id, user.twitchId);
      return { success: true, data: stats };
    }
  );

  // ── Daily Quests ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/quests",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getDailyQuests } = await import("../casino/quests.js");
      const quests = await getDailyQuests(channel.id, user.twitchId);
      return { success: true, data: quests };
    }
  );

  // ── Achievements ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/achievements",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getPlayerAchievements, ACHIEVEMENTS } = await import("../casino/achievements.js");
      const { unlocked, total } = await getPlayerAchievements(channel.id, user.twitchId);
      const unlockedSet = new Set(unlocked);
      const all = ACHIEVEMENTS.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        rarity: a.rarity,
        reward: a.reward,
        unlocked: unlockedSet.has(a.id),
      }));
      return { success: true, data: { achievements: all, unlocked: unlocked.length, total } };
    }
  );

  // ── Season / Battle Pass ──
  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/season",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getSeasonProgress } = await import("../casino/battlepass.js");
      const data = await getSeasonProgress(channel.id, user.twitchId);
      return { success: true, data };
    }
  );

  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/season/premium",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { buyPremium } = await import("../casino/battlepass.js");
      const result = await buyPremium(channel.id, user.twitchId);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { level: number } }>(
    "/:channelName/casino/season/claim",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { claimReward } = await import("../casino/battlepass.js");
      const result = await claimReward(channel.id, user.twitchId, request.body.level);
      if (!result.success) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: { reward: result.reward } };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/season/leaderboard",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getSeasonLeaderboard } = await import("../casino/battlepass.js");
      const data = await getSeasonLeaderboard(channel.id);
      return { success: true, data };
    }
  );

  // ── Heists ──
  app.post<{ Params: { channelName: string } }>(
    "/:channelName/casino/heist",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { createHeist } = await import("../casino/heists.js");
      const result = await createHeist(channel.id, user.twitchId, channelUser.displayName);
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });

      // Track heist stat
      const { updateStats, getStats } = await import("../casino/stats.js");
      const stats = await getStats(channel.id, user.twitchId);
      await updateStats(channel.id, user.twitchId, { heistsPlayed: stats.heistsPlayed + 1 });

      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { heistId: string } }>(
    "/:channelName/casino/heist/join",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const channelUser = await prisma.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId: channel.id, twitchUserId: user.twitchId } },
      });
      if (!channelUser) return reply.status(400).send({ success: false, error: "Kein Profil gefunden" });
      const { joinHeist } = await import("../casino/heists.js");
      const result = await joinHeist(channel.id, request.body.heistId, user.twitchId, channelUser.displayName);
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });

      // Track heist stat
      const { updateStats, getStats } = await import("../casino/stats.js");
      const stats = await getStats(channel.id, user.twitchId);
      await updateStats(channel.id, user.twitchId, { heistsPlayed: stats.heistsPlayed + 1 });

      return { success: true, data: result };
    }
  );

  app.get<{ Params: { channelName: string } }>(
    "/:channelName/casino/heist",
    async (request, reply) => {
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { getActiveHeist } = await import("../casino/heists.js");
      const heist = await getActiveHeist(channel.id);
      return { success: true, data: heist };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { heistId: string; game: string } }>(
    "/:channelName/casino/heist/play",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { playHeistRound } = await import("../casino/heists.js");
      const result = await playHeistRound(channel.id, request.body.heistId, user.twitchId, request.body.game);
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { heistId: string } }>(
    "/:channelName/casino/heist/betray",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { chooseBetray } = await import("../casino/heists.js");
      const result = await chooseBetray(channel.id, request.body.heistId, user.twitchId);
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });
      return { success: true, data: result };
    }
  );

  app.post<{ Params: { channelName: string }; Body: { heistId: string } }>(
    "/:channelName/casino/heist/finish",
    async (request, reply) => {
      const user = getUser(request);
      if (!user) return reply.status(401).send({ success: false, error: "Login required" });
      const channel = await viewerService.resolveChannel(request.params.channelName);
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });
      const { finishHeist } = await import("../casino/heists.js");
      const result = await finishHeist(channel.id, request.body.heistId);
      if ("error" in result) return reply.status(400).send({ success: false, error: result.error });

      // Track heist wins for all winners
      const { updateStats, getStats } = await import("../casino/stats.js");
      for (const r of result.results) {
        if (r.payout > 0) {
          const stats = await getStats(channel.id, r.userId);
          await updateStats(channel.id, r.userId, { heistsWon: stats.heistsWon + 1 });
        }
      }

      return { success: true, data: result };
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
