import { prisma } from "../../lib/prisma.js";
import type {
  ViewerProfileDto,
  ViewerInventoryItemDto,
  MarketplaceListingDto,
  TradeOfferDto,
  LootboxItemType,
  LootboxRarity,
} from "@cristream/shared";

class ViewerService {
  async resolveChannel(channelName: string) {
    return prisma.channel.findFirst({
      where: { displayName: { equals: channelName, mode: "insensitive" } },
    });
  }

  // ── Profile ──

  async getProfile(channelId: string, twitchUserId: string): Promise<ViewerProfileDto | null> {
    const channelUser = await prisma.channelUser.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
    });
    if (!channelUser) return null;

    const inventory = await prisma.viewerInventoryItem.findMany({
      where: { channelId, twitchUserId },
      include: { item: true },
      orderBy: { acquiredAt: "desc" },
    });

    const activeTitle = await prisma.activeTitle.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId } },
    });

    // Collection progress
    const allItems = await prisma.lootboxItem.groupBy({
      by: ["rarity"],
      where: { channelId, enabled: true },
      _count: true,
    });
    const ownedByRarity = new Map<string, Set<string>>();
    for (const inv of inventory) {
      const r = inv.item.rarity;
      if (!ownedByRarity.has(r)) ownedByRarity.set(r, new Set());
      ownedByRarity.get(r)!.add(inv.itemId);
    }

    const collectionProgress = allItems.map((g) => ({
      rarity: g.rarity,
      owned: ownedByRarity.get(g.rarity)?.size ?? 0,
      total: g._count,
    }));

    return {
      twitchUserId: channelUser.twitchUserId,
      displayName: channelUser.displayName,
      points: channelUser.points,
      watchMinutes: channelUser.watchMinutes,
      activeTitle: activeTitle?.title ?? null,
      inventory: inventory.map((i) => ({
        id: i.id,
        itemId: i.itemId,
        twitchUserId: i.twitchUserId,
        displayName: i.displayName,
        itemName: i.item.name,
        itemType: i.item.type as LootboxItemType,
        itemRarity: i.item.rarity as LootboxRarity,
        itemConfig: i.item.config as Record<string, unknown>,
        quantity: i.quantity,
        acquiredAt: i.acquiredAt.toISOString(),
      })),
      collectionProgress,
    };
  }

  // ── Marketplace ──

  async getListings(channelId: string): Promise<MarketplaceListingDto[]> {
    const listings = await prisma.marketplaceListing.findMany({
      where: { channelId, status: "active" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return listings.map((l) => ({
      id: l.id,
      sellerId: l.sellerId,
      sellerName: l.sellerName,
      itemName: l.item.name,
      itemType: l.item.type as LootboxItemType,
      itemRarity: l.item.rarity as LootboxRarity,
      itemDescription: l.item.description,
      quantity: l.quantity,
      pricePerUnit: l.pricePerUnit,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async createListing(
    channelId: string,
    sellerId: string,
    sellerName: string,
    itemId: string,
    quantity: number,
    pricePerUnit: number
  ): Promise<MarketplaceListingDto | { error: string }> {
    // Check item is tradeable
    const item = await prisma.lootboxItem.findUnique({ where: { id: itemId } });
    if (!item || !item.tradeable) return { error: "Dieses Item kann nicht gehandelt werden." };

    // Check seller owns enough
    const inv = await prisma.viewerInventoryItem.findUnique({
      where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: sellerId, itemId } },
    });
    if (!inv || inv.quantity < quantity) return { error: "Du hast nicht genug von diesem Item." };

    // Escrow: deduct from inventory
    if (inv.quantity === quantity) {
      await prisma.viewerInventoryItem.delete({ where: { id: inv.id } });
    } else {
      await prisma.viewerInventoryItem.update({
        where: { id: inv.id },
        data: { quantity: { decrement: quantity } },
      });
    }

    const listing = await prisma.marketplaceListing.create({
      data: { channelId, sellerId, sellerName, itemId, quantity, pricePerUnit },
      include: { item: true },
    });

    return {
      id: listing.id,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      itemName: listing.item.name,
      itemType: listing.item.type as LootboxItemType,
      itemRarity: listing.item.rarity as LootboxRarity,
      itemDescription: listing.item.description,
      quantity: listing.quantity,
      pricePerUnit: listing.pricePerUnit,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
    };
  }

  async buyListing(
    channelId: string,
    listingId: string,
    buyerId: string,
    buyerName: string
  ): Promise<{ success: true } | { error: string }> {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
        include: { item: true },
      });
      if (!listing || listing.status !== "active") return { error: "Listing nicht mehr verfügbar." };
      if (listing.sellerId === buyerId) return { error: "Du kannst dein eigenes Listing nicht kaufen." };

      const totalPrice = listing.pricePerUnit * listing.quantity;

      // Check buyer points
      const buyer = await tx.channelUser.findUnique({
        where: { channelId_twitchUserId: { channelId, twitchUserId: buyerId } },
      });
      if (!buyer || buyer.points < totalPrice) return { error: `Nicht genug Punkte! Brauchst ${totalPrice}.` };

      // Deduct points from buyer, add to seller
      await tx.channelUser.update({
        where: { channelId_twitchUserId: { channelId, twitchUserId: buyerId } },
        data: { points: { decrement: totalPrice } },
      });
      await tx.channelUser.updateMany({
        where: { channelId, twitchUserId: listing.sellerId },
        data: { points: { increment: totalPrice } },
      });

      // Transfer item to buyer
      await tx.viewerInventoryItem.upsert({
        where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: buyerId, itemId: listing.itemId } },
        create: { channelId, twitchUserId: buyerId, displayName: buyerName, itemId: listing.itemId, quantity: listing.quantity },
        update: { quantity: { increment: listing.quantity }, displayName: buyerName },
      });

      // Mark listing as sold
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: "sold" },
      });

      return { success: true as const };
    });
  }

  async cancelListing(channelId: string, listingId: string, sellerId: string): Promise<{ error?: string }> {
    const listing = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== sellerId || listing.status !== "active") {
      return { error: "Listing nicht gefunden oder nicht dein Listing." };
    }

    // Return items to seller
    await prisma.viewerInventoryItem.upsert({
      where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: sellerId, itemId: listing.itemId } },
      create: { channelId, twitchUserId: sellerId, displayName: listing.sellerName, itemId: listing.itemId, quantity: listing.quantity },
      update: { quantity: { increment: listing.quantity } },
    });

    await prisma.marketplaceListing.update({ where: { id: listingId }, data: { status: "cancelled" } });
    return {};
  }

  // ── Trading ──

  async createTrade(
    channelId: string,
    senderId: string,
    senderName: string,
    receiverId: string,
    offeredItems: { itemId: string; quantity: number }[],
    requestedItems: { itemId: string; quantity: number }[],
    pointsOffered: number,
    pointsRequested: number
  ): Promise<TradeOfferDto | { error: string }> {
    const receiver = await prisma.channelUser.findUnique({
      where: { channelId_twitchUserId: { channelId, twitchUserId: receiverId } },
    });
    if (!receiver) return { error: "Empfänger nicht gefunden." };

    // Verify sender owns all offered items
    for (const { itemId, quantity } of offeredItems) {
      const inv = await prisma.viewerInventoryItem.findUnique({
        where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: senderId, itemId } },
      });
      if (!inv || inv.quantity < quantity) return { error: "Du hast nicht genug Items zum Anbieten." };
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const trade = await prisma.tradeOffer.create({
      data: {
        channelId,
        senderId,
        senderName,
        receiverId,
        receiverName: receiver.displayName,
        pointsOffered,
        pointsRequested,
        expiresAt,
        offerItems: {
          create: [
            ...offeredItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity, side: "offered" })),
            ...requestedItems.map((i) => ({ itemId: i.itemId, quantity: i.quantity, side: "requested" })),
          ],
        },
      },
      include: { offerItems: { include: { item: true } } },
    });

    return this.toTradeDto(trade);
  }

  async getTrades(channelId: string, twitchUserId: string): Promise<TradeOfferDto[]> {
    const trades = await prisma.tradeOffer.findMany({
      where: {
        channelId,
        OR: [{ senderId: twitchUserId }, { receiverId: twitchUserId }],
      },
      include: { offerItems: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Auto-expire
    const now = new Date();
    return trades.map((t) => {
      if (t.status === "pending" && t.expiresAt < now) {
        prisma.tradeOffer.update({ where: { id: t.id }, data: { status: "expired" } }).catch(() => {});
        return this.toTradeDto({ ...t, status: "expired" });
      }
      return this.toTradeDto(t);
    });
  }

  async acceptTrade(channelId: string, tradeId: string, receiverId: string): Promise<{ error?: string }> {
    return prisma.$transaction(async (tx) => {
      const trade = await tx.tradeOffer.findUnique({
        where: { id: tradeId },
        include: { offerItems: true },
      });
      if (!trade || trade.receiverId !== receiverId || trade.status !== "pending") {
        return { error: "Trade nicht verfügbar." };
      }
      if (trade.expiresAt < new Date()) {
        await tx.tradeOffer.update({ where: { id: tradeId }, data: { status: "expired" } });
        return { error: "Trade abgelaufen." };
      }

      // Verify both sides have items
      for (const oi of trade.offerItems) {
        const ownerId = oi.side === "offered" ? trade.senderId : trade.receiverId;
        const inv = await tx.viewerInventoryItem.findUnique({
          where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: ownerId, itemId: oi.itemId } },
        });
        if (!inv || inv.quantity < oi.quantity) return { error: "Nicht genug Items vorhanden." };
      }

      // Check points
      if (trade.pointsOffered > 0) {
        const sender = await tx.channelUser.findUnique({
          where: { channelId_twitchUserId: { channelId, twitchUserId: trade.senderId } },
        });
        if (!sender || sender.points < trade.pointsOffered) return { error: "Sender hat nicht genug Punkte." };
      }
      if (trade.pointsRequested > 0) {
        const receiver = await tx.channelUser.findUnique({
          where: { channelId_twitchUserId: { channelId, twitchUserId: trade.receiverId } },
        });
        if (!receiver || receiver.points < trade.pointsRequested) return { error: "Du hast nicht genug Punkte." };
      }

      // Swap items
      for (const oi of trade.offerItems) {
        const fromId = oi.side === "offered" ? trade.senderId : trade.receiverId;
        const toId = oi.side === "offered" ? trade.receiverId : trade.senderId;
        const toName = oi.side === "offered" ? trade.receiverName : trade.senderName;

        // Deduct from sender
        const fromInv = await tx.viewerInventoryItem.findUnique({
          where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: fromId, itemId: oi.itemId } },
        });
        if (fromInv!.quantity <= oi.quantity) {
          await tx.viewerInventoryItem.delete({ where: { id: fromInv!.id } });
        } else {
          await tx.viewerInventoryItem.update({ where: { id: fromInv!.id }, data: { quantity: { decrement: oi.quantity } } });
        }

        // Add to receiver
        await tx.viewerInventoryItem.upsert({
          where: { channelId_twitchUserId_itemId: { channelId, twitchUserId: toId, itemId: oi.itemId } },
          create: { channelId, twitchUserId: toId, displayName: toName, itemId: oi.itemId, quantity: oi.quantity },
          update: { quantity: { increment: oi.quantity } },
        });
      }

      // Swap points
      if (trade.pointsOffered > 0) {
        await tx.channelUser.update({ where: { channelId_twitchUserId: { channelId, twitchUserId: trade.senderId } }, data: { points: { decrement: trade.pointsOffered } } });
        await tx.channelUser.update({ where: { channelId_twitchUserId: { channelId, twitchUserId: trade.receiverId } }, data: { points: { increment: trade.pointsOffered } } });
      }
      if (trade.pointsRequested > 0) {
        await tx.channelUser.update({ where: { channelId_twitchUserId: { channelId, twitchUserId: trade.receiverId } }, data: { points: { decrement: trade.pointsRequested } } });
        await tx.channelUser.update({ where: { channelId_twitchUserId: { channelId, twitchUserId: trade.senderId } }, data: { points: { increment: trade.pointsRequested } } });
      }

      await tx.tradeOffer.update({ where: { id: tradeId }, data: { status: "accepted" } });
      return {};
    });
  }

  async declineTrade(tradeId: string, receiverId: string): Promise<void> {
    await prisma.tradeOffer.updateMany({
      where: { id: tradeId, receiverId, status: "pending" },
      data: { status: "declined" },
    });
  }

  async cancelTrade(tradeId: string, senderId: string): Promise<void> {
    await prisma.tradeOffer.updateMany({
      where: { id: tradeId, senderId, status: "pending" },
      data: { status: "cancelled" },
    });
  }

  // ── User search ──

  async searchUsers(channelId: string, query: string) {
    return prisma.channelUser.findMany({
      where: {
        channelId,
        displayName: { contains: query, mode: "insensitive" },
      },
      select: { twitchUserId: true, displayName: true },
      take: 10,
    });
  }

  private toTradeDto(trade: any): TradeOfferDto {
    return {
      id: trade.id,
      senderId: trade.senderId,
      senderName: trade.senderName,
      receiverId: trade.receiverId,
      receiverName: trade.receiverName,
      status: trade.status,
      pointsOffered: trade.pointsOffered,
      pointsRequested: trade.pointsRequested,
      offerItems: (trade.offerItems ?? []).map((oi: any) => ({
        itemName: oi.item?.name ?? "Unknown",
        itemRarity: oi.item?.rarity ?? "common",
        quantity: oi.quantity,
        side: oi.side,
      })),
      expiresAt: trade.expiresAt.toISOString(),
      createdAt: trade.createdAt.toISOString(),
    };
  }
}

export const viewerService = new ViewerService();
