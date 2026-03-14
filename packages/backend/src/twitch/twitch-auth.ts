import { RefreshingAuthProvider } from "@twurple/auth";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { TWITCH_SCOPES } from "@streamguard/shared";

let authProvider: RefreshingAuthProvider | null = null;

export function getAuthProvider(): RefreshingAuthProvider {
  if (!authProvider) {
    authProvider = new RefreshingAuthProvider({
      clientId: config.twitchClientId,
      clientSecret: config.twitchClientSecret,
    });

    authProvider.onRefresh(async (userId, newTokenData) => {
      logger.debug({ userId }, "Twitch token refreshed");
      await prisma.user.updateMany({
        where: { twitchId: userId },
        data: {
          accessTokenEncrypted: encrypt(newTokenData.accessToken),
          refreshTokenEncrypted: encrypt(newTokenData.refreshToken!),
        },
      });
    });
  }
  return authProvider;
}

export async function addUserToAuthProvider(twitchId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { twitchId } });
  if (!user) throw new Error(`User not found: ${twitchId}`);

  const provider = getAuthProvider();
  provider.addUser(twitchId, {
    accessToken: decrypt(user.accessTokenEncrypted),
    refreshToken: decrypt(user.refreshTokenEncrypted),
    scope: TWITCH_SCOPES,
    expiresIn: 0,
    obtainmentTimestamp: 0,
  }, ["chat"]);
}
