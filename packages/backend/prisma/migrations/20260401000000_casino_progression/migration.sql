-- CreateTable
CREATE TABLE "ViewerAchievement" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rewards" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonProgress" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "claimedLevels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "SeasonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewerAchievement_channelId_twitchUserId_idx" ON "ViewerAchievement"("channelId", "twitchUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerAchievement_channelId_twitchUserId_achievementId_key" ON "ViewerAchievement"("channelId", "twitchUserId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_channelId_number_key" ON "Season"("channelId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonProgress_channelId_twitchUserId_seasonId_key" ON "SeasonProgress"("channelId", "twitchUserId", "seasonId");

-- AddForeignKey
ALTER TABLE "ViewerAchievement" ADD CONSTRAINT "ViewerAchievement_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonProgress" ADD CONSTRAINT "SeasonProgress_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
