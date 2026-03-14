import { ApiClient } from "@twurple/api";
import { getAuthProvider } from "./twitch-auth.js";

let apiClient: ApiClient | null = null;

export function getTwitchApi(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient({ authProvider: getAuthProvider() });
  }
  return apiClient;
}
