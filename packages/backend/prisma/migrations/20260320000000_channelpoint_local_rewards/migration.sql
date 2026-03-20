-- AlterTable
ALTER TABLE "ChannelPointReward" ADD COLUMN "cost" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "ChannelPointReward" ADD COLUMN "prompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ChannelPointReward" ADD COLUMN "isUserInputRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChannelPointReward" ADD COLUMN "maxPerStream" INTEGER;
ALTER TABLE "ChannelPointReward" ADD COLUMN "maxPerUserPerStream" INTEGER;
ALTER TABLE "ChannelPointReward" ADD COLUMN "globalCooldown" INTEGER;
ALTER TABLE "ChannelPointReward" ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#9147FF';
