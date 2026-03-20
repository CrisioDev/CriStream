-- AlterTable
ALTER TABLE "ChatLog" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'twitch';

-- CreateIndex
CREATE INDEX "ChatLog_channelId_platform_idx" ON "ChatLog"("channelId", "platform");
