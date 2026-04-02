CREATE TABLE "CasinoProfile" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "petData" JSONB NOT NULL DEFAULT '{}',
    "skillData" JSONB NOT NULL DEFAULT '{}',
    "statsData" JSONB NOT NULL DEFAULT '{}',
    "breedData" JSONB NOT NULL DEFAULT '{}',
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "autoflipData" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasinoProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CasinoProfile_channelId_twitchUserId_key" ON "CasinoProfile"("channelId", "twitchUserId");
CREATE INDEX "CasinoProfile_channelId_idx" ON "CasinoProfile"("channelId");

ALTER TABLE "CasinoProfile" ADD CONSTRAINT "CasinoProfile_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
