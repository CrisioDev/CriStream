import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { logger } from "../../lib/logger.js";
import { TWITCH_SCOPES, TWITCH_VIEWER_SCOPES } from "@cristream/shared";
import type { JwtPayload } from "../../middleware/jwt-auth.js";
import type { AuthUser, AuthTokens } from "@cristream/shared";
import { addUserToAuthProvider } from "../../twitch/twitch-auth.js";
import { getTwitchApi } from "../../twitch/twitch-api.js";

class AuthService {
  getAuthUrl(viewer = false): string {
    const params = new URLSearchParams({
      client_id: config.twitchClientId,
      redirect_uri: config.twitchRedirectUri,
      response_type: "code",
      scope: (viewer ? TWITCH_VIEWER_SCOPES : TWITCH_SCOPES).join(" "),
    });
    if (viewer) params.set("state", "viewer");
    return `https://id.twitch.tv/oauth2/authorize?${params}`;
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    // Exchange code for tokens
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.twitchClientId,
        client_secret: config.twitchClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.twitchRedirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // Get user info from Twitch
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Client-Id": config.twitchClientId,
      },
    });

    if (!userRes.ok) {
      throw new Error(`Failed to fetch Twitch user: ${userRes.status}`);
    }

    const userData = (await userRes.json()) as {
      data: Array<{
        id: string;
        login: string;
        display_name: string;
        profile_image_url: string;
        email?: string;
      }>;
    };
    const twitchUser = userData.data[0];

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { twitchId: twitchUser.id },
      update: {
        displayName: twitchUser.display_name,
        avatarUrl: twitchUser.profile_image_url,
        email: twitchUser.email ?? "",
        accessTokenEncrypted: encrypt(tokenData.access_token),
        refreshTokenEncrypted: encrypt(tokenData.refresh_token),
      },
      create: {
        twitchId: twitchUser.id,
        displayName: twitchUser.display_name,
        avatarUrl: twitchUser.profile_image_url,
        email: twitchUser.email ?? "",
        accessTokenEncrypted: encrypt(tokenData.access_token),
        refreshTokenEncrypted: encrypt(tokenData.refresh_token),
      },
    });

    // Ensure a channel exists for this user
    await prisma.channel.upsert({
      where: { twitchId: twitchUser.id },
      update: { displayName: twitchUser.display_name },
      create: {
        twitchId: twitchUser.id,
        displayName: twitchUser.display_name,
        ownerId: user.id,
      },
    });

    // Ensure moderation settings exist
    const channel = await prisma.channel.findUnique({ where: { twitchId: twitchUser.id } });
    if (channel) {
      await prisma.moderationSettings.upsert({
        where: { channelId: channel.id },
        update: {},
        create: { channelId: channel.id },
      });
    }

    logger.info({ twitchId: twitchUser.id, displayName: twitchUser.display_name }, "User authenticated");

    // Update auth provider with fresh tokens (includes chat intents)
    try {
      await addUserToAuthProvider(twitchUser.id);
    } catch (err) {
      logger.warn({ err }, "Could not update auth provider after login");
    }

    // Sync moderated channels as editor access (non-blocking)
    this.syncModeratorAccess(user.id, twitchUser.id).catch((err) => {
      logger.warn({ err }, "Failed to sync moderator access");
    });

    return this.issueTokens(user.id, twitchUser.id, twitchUser.display_name, user.isAdmin);
  }

  private async syncModeratorAccess(userId: string, twitchId: string): Promise<void> {
    const api = getTwitchApi();
    const modChannels = await api.moderation.getModeratedChannelsPaginated(twitchId).getAll();
    if (modChannels.length === 0) return;

    const moderatedTwitchIds = modChannels.map((c) => c.id);

    const channels = await prisma.channel.findMany({
      where: {
        twitchId: { in: moderatedTwitchIds },
        ownerId: { not: userId },
      },
    });

    for (const channel of channels) {
      await prisma.channelEditor.upsert({
        where: { channelId_userId: { channelId: channel.id, userId } },
        update: {},
        create: { channelId: channel.id, userId, role: "editor" },
      });
    }

    if (channels.length > 0) {
      logger.info(
        { userId, twitchId, count: channels.length },
        "Synced moderator access for channels"
      );
    }
  }

  private issueTokens(
    userId: string,
    twitchId: string,
    displayName: string,
    isAdmin: boolean
  ): AuthTokens {
    const payload: JwtPayload = { sub: userId, twitchId, displayName, isAdmin };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    const refreshToken = jwt.sign({ sub: userId, type: "refresh" }, config.jwtSecret, {
      expiresIn: "30d" as any,
    });

    return { accessToken, refreshToken };
  }

  async refreshJwt(refreshToken: string): Promise<AuthTokens> {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as { sub: string; type: string };
    if (decoded.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: decoded.sub } });
    return this.issueTokens(user.id, user.twitchId, user.displayName, user.isAdmin);
  }

  async getUser(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      twitchId: user.twitchId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
    };
  }
}

export const authService = new AuthService();
