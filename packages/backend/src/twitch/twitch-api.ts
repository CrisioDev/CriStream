import { ApiClient } from "@twurple/api";
import { getAuthProvider } from "./twitch-auth.js";
import { logger } from "../lib/logger.js";

let apiClient: ApiClient | null = null;

export function getTwitchApi(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient({ authProvider: getAuthProvider() });
  }
  return apiClient;
}

export async function sendWhisper(
  fromUserId: string,
  toUserId: string,
  message: string
): Promise<void> {
  try {
    const api = getTwitchApi();
    await api.whispers.sendWhisper(fromUserId, toUserId, message);
    logger.info({ fromUserId, toUserId }, "Whisper sent");
  } catch (err) {
    logger.error({ err, fromUserId, toUserId }, "Failed to send whisper");
  }
}
