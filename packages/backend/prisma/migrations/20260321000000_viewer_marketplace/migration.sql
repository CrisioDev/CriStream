ALTER TABLE "LootboxItem" ADD COLUMN "tradeable" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricePerUnit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceListing_channelId_status_idx" ON "MarketplaceListing"("channelId", "status");
CREATE INDEX "MarketplaceListing_channelId_sellerId_idx" ON "MarketplaceListing"("channelId", "sellerId");
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LootboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TradeOffer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pointsOffered" INTEGER NOT NULL DEFAULT 0,
    "pointsRequested" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TradeOffer_channelId_receiverId_status_idx" ON "TradeOffer"("channelId", "receiverId", "status");
CREATE INDEX "TradeOffer_channelId_senderId_idx" ON "TradeOffer"("channelId", "senderId");
ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TradeOfferItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "side" TEXT NOT NULL,
    CONSTRAINT "TradeOfferItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TradeOfferItem" ADD CONSTRAINT "TradeOfferItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "TradeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeOfferItem" ADD CONSTRAINT "TradeOfferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LootboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
