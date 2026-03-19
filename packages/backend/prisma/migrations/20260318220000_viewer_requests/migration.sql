-- CreateTable
CREATE TABLE "ViewerRequest" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "ViewerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewerRequest_channelId_status_idx" ON "ViewerRequest"("channelId", "status");

-- CreateIndex
CREATE INDEX "ViewerRequest_channelId_createdAt_idx" ON "ViewerRequest"("channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "ViewerRequest" ADD CONSTRAINT "ViewerRequest_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
