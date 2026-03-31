CREATE TABLE "AccountLink" (
    "id" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    CONSTRAINT "AccountLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountLink_twitchUserId_key" ON "AccountLink"("twitchUserId");
CREATE UNIQUE INDEX "AccountLink_discordUserId_key" ON "AccountLink"("discordUserId");
