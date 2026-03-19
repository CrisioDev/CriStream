import { prisma } from "../lib/prisma.js";

export type ChannelAccessRole = "owner" | "editor" | "viewer" | "none";

export async function getChannelAccess(
  channelId: string,
  userId: string
): Promise<ChannelAccessRole> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { ownerId: true },
  });

  if (!channel) return "none";
  if (channel.ownerId === userId) return "owner";

  const editor = await prisma.channelEditor.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });

  if (!editor) return "none";
  return editor.role as ChannelAccessRole;
}

export function canEdit(role: ChannelAccessRole): boolean {
  return role === "owner" || role === "editor";
}

export function isOwner(role: ChannelAccessRole): boolean {
  return role === "owner";
}
