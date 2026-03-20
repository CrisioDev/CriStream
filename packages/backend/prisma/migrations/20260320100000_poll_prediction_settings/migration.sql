-- CreateTable
CREATE TABLE "PollPredictionSettings" (
    "id" TEXT NOT NULL,
    "pollEnabled" BOOLEAN NOT NULL DEFAULT true,
    "predictionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "resultDuration" INTEGER NOT NULL DEFAULT 60,
    "position" TEXT NOT NULL DEFAULT 'top-right',
    "backgroundColor" TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.8)',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "accentColor" TEXT NOT NULL DEFAULT '#9147FF',
    "barHeight" INTEGER NOT NULL DEFAULT 28,
    "width" INTEGER NOT NULL DEFAULT 400,
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "PollPredictionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PollPredictionSettings_channelId_key" ON "PollPredictionSettings"("channelId");

-- AddForeignKey
ALTER TABLE "PollPredictionSettings" ADD CONSTRAINT "PollPredictionSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
