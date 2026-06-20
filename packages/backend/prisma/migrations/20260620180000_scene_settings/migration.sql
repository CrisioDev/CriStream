-- CreateTable
CREATE TABLE "SceneSettings" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL DEFAULT '',
    "twitchHandle" TEXT NOT NULL DEFAULT '',
    "youtubeHandle" TEXT NOT NULL DEFAULT '',
    "discordHandle" TEXT NOT NULL DEFAULT '',
    "instagramHandle" TEXT NOT NULL DEFAULT '',
    "brbNote" TEXT NOT NULL DEFAULT 'Bin gleich zurück.',
    "startingToday" TEXT NOT NULL DEFAULT 'Heute live',
    "defaultGame" TEXT NOT NULL DEFAULT '',
    "defaultMode" TEXT NOT NULL DEFAULT '',
    "streamPlan" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "SceneSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SceneSettings_channelId_key" ON "SceneSettings"("channelId");

ALTER TABLE "SceneSettings" ADD CONSTRAINT "SceneSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
