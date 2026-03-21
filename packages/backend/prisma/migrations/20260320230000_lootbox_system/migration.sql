CREATE TABLE "LootboxSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cost" INTEGER NOT NULL DEFAULT 100,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 30,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "LootboxSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LootboxSettings_channelId_key" ON "LootboxSettings"("channelId");
ALTER TABLE "LootboxSettings" ADD CONSTRAINT "LootboxSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LootboxItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "weight" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "channelId" TEXT NOT NULL,
    CONSTRAINT "LootboxItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LootboxItem_channelId_name_key" ON "LootboxItem"("channelId", "name");
ALTER TABLE "LootboxItem" ADD CONSTRAINT "LootboxItem_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ViewerInventoryItem" (
    "id" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "ViewerInventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ViewerInventoryItem_channelId_twitchUserId_idx" ON "ViewerInventoryItem"("channelId", "twitchUserId");
CREATE UNIQUE INDEX "ViewerInventoryItem_channelId_twitchUserId_itemId_key" ON "ViewerInventoryItem"("channelId", "twitchUserId", "itemId");
ALTER TABLE "ViewerInventoryItem" ADD CONSTRAINT "ViewerInventoryItem_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewerInventoryItem" ADD CONSTRAINT "ViewerInventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "LootboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ActiveTitle" (
    "id" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ActiveTitle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActiveTitle_channelId_twitchUserId_key" ON "ActiveTitle"("channelId", "twitchUserId");
ALTER TABLE "ActiveTitle" ADD CONSTRAINT "ActiveTitle_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
