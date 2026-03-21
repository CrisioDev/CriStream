ALTER TABLE "DiscordSettings" ADD COLUMN "notifyFollow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifySub" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifyGiftSub" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifyRaid" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifyHypeTrain" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifyStreamOnline" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DiscordSettings" ADD COLUMN "notifyStreamOffline" BOOLEAN NOT NULL DEFAULT true;
