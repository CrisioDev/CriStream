-- CreateTable
CREATE TABLE "DiscordSettings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL DEFAULT '',
    "commandChannelId" TEXT NOT NULL DEFAULT '',
    "timerChannelId" TEXT NOT NULL DEFAULT '',
    "summaryChannelId" TEXT NOT NULL DEFAULT '',
    "notifyChannelId" TEXT NOT NULL DEFAULT '',
    "commandsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "summariesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "DiscordSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordSettings_channelId_key" ON "DiscordSettings"("channelId");

-- AddForeignKey
ALTER TABLE "DiscordSettings" ADD CONSTRAINT "DiscordSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
