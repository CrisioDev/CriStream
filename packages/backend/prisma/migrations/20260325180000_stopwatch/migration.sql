CREATE TABLE "Stopwatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL DEFAULT '',
    "elapsedMs" INTEGER NOT NULL DEFAULT 0,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "channelId" TEXT NOT NULL,
    CONSTRAINT "Stopwatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Stopwatch_channelId_name_key" ON "Stopwatch"("channelId", "name");
ALTER TABLE "Stopwatch" ADD CONSTRAINT "Stopwatch_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
