import { prisma } from "../../lib/prisma.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";
import type { ChannelEditorDto, EditorRole } from "@cristream/shared";

class EditorService {
  async list(channelId: string): Promise<ChannelEditorDto[]> {
    const editors = await prisma.channelEditor.findMany({
      where: { channelId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return editors.map((e) => ({
      id: e.id,
      channelId: e.channelId,
      userId: e.userId,
      displayName: e.user.displayName,
      avatarUrl: e.user.avatarUrl,
      role: e.role as EditorRole,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async invite(channelId: string, twitchUsername: string, role: EditorRole = "editor"): Promise<ChannelEditorDto> {
    // Lookup user by Twitch username - they must have logged in at least once
    const api = getTwitchApi();
    const twitchUser = await api.users.getUserByName(twitchUsername);
    if (!twitchUser) {
      throw new Error(`Twitch user not found: ${twitchUsername}`);
    }

    const user = await prisma.user.findUnique({ where: { twitchId: twitchUser.id } });
    if (!user) {
      throw new Error(`User "${twitchUsername}" has not logged into CriStream yet.`);
    }

    // Check if already owner
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (channel?.ownerId === user.id) {
      throw new Error("Cannot add channel owner as editor.");
    }

    const editor = await prisma.channelEditor.upsert({
      where: { channelId_userId: { channelId, userId: user.id } },
      update: { role },
      create: { channelId, userId: user.id, role },
      include: { user: true },
    });

    return {
      id: editor.id,
      channelId: editor.channelId,
      userId: editor.userId,
      displayName: editor.user.displayName,
      avatarUrl: editor.user.avatarUrl,
      role: editor.role as EditorRole,
      createdAt: editor.createdAt.toISOString(),
    };
  }

  async updateRole(channelId: string, editorId: string, role: EditorRole): Promise<void> {
    await prisma.channelEditor.update({
      where: { id: editorId, channelId },
      data: { role },
    });
  }

  async remove(channelId: string, editorId: string): Promise<void> {
    await prisma.channelEditor.delete({
      where: { id: editorId, channelId },
    });
  }
}

export const editorService = new EditorService();
