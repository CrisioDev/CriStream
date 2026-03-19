-- Phase 3: Multi-Channel, Roles, EventSub & OBS Alerts

-- Add overlayToken to Channel
ALTER TABLE "Channel" ADD COLUMN "overlayToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX "Channel_overlayToken_key" ON "Channel"("overlayToken");

-- Add perUserCooldown to Command
ALTER TABLE "Command" ADD COLUMN "perUserCooldown" BOOLEAN NOT NULL DEFAULT false;

-- Create ChannelEditor table
CREATE TABLE "ChannelEditor" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChannelEditor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChannelEditor_channelId_userId_key" ON "ChannelEditor"("channelId", "userId");
ALTER TABLE "ChannelEditor" ADD CONSTRAINT "ChannelEditor_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelEditor" ADD CONSTRAINT "ChannelEditor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AlertSettings table
CREATE TABLE "AlertSettings" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "textTemplate" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 5,
    "animationType" TEXT NOT NULL DEFAULT 'fade',
    "soundFileUrl" TEXT NOT NULL DEFAULT '',
    "imageFileUrl" TEXT NOT NULL DEFAULT '',
    "volume" INTEGER NOT NULL DEFAULT 80,
    "minAmount" INTEGER NOT NULL DEFAULT 0,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "AlertSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertSettings_channelId_alertType_key" ON "AlertSettings"("channelId", "alertType");
ALTER TABLE "AlertSettings" ADD CONSTRAINT "AlertSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SoundAlert table
CREATE TABLE "SoundAlert" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL DEFAULT 0,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 30,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "SoundAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SoundAlert_channelId_name_key" ON "SoundAlert"("channelId", "name");
ALTER TABLE "SoundAlert" ADD CONSTRAINT "SoundAlert_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create EventLog table
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventLog_channelId_createdAt_idx" ON "EventLog"("channelId", "createdAt");
CREATE INDEX "EventLog_channelId_eventType_idx" ON "EventLog"("channelId", "eventType");
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
