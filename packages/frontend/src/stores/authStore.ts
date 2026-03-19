import { create } from "zustand";
import type { AuthUser, ChannelDto } from "@streamguard/shared";
import { api } from "@/api/client";

interface AuthState {
  user: AuthUser | null;
  channels: ChannelDto[];
  activeChannel: ChannelDto | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  loadFromUrl: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setActiveChannel: (channel: ChannelDto) => void;
  refreshChannels: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  channels: [],
  activeChannel: null,
  token: localStorage.getItem("token"),
  isLoading: true,

  login: () => {
    window.location.href = "/api/auth/twitch";
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("activeChannelId");
    set({ user: null, channels: [], activeChannel: null, token: null });
  },

  loadFromUrl: async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refresh = params.get("refresh");

    if (token) {
      localStorage.setItem("token", token);
      if (refresh) localStorage.setItem("refreshToken", refresh);
      set({ token });
      window.history.replaceState({}, "", "/");
      await get().fetchUser();
    } else if (get().token) {
      await get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },

  fetchUser: async () => {
    try {
      const res = await api.get("/auth/me");
      const user = res.data as AuthUser;

      // Fetch channels
      const channelsRes = await api.get("/channels");
      const channels = channelsRes.data as ChannelDto[];

      // Restore active channel from localStorage or use first
      const savedId = localStorage.getItem("activeChannelId");
      let activeChannel = channels.find((c) => c.id === savedId) ?? channels[0] ?? null;

      set({ user, channels, activeChannel, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, channels: [], activeChannel: null, token: null, isLoading: false });
    }
  },

  setActiveChannel: (channel: ChannelDto) => {
    localStorage.setItem("activeChannelId", channel.id);
    set({ activeChannel: channel });
  },

  refreshChannels: async () => {
    try {
      const channelsRes = await api.get("/channels");
      const channels = channelsRes.data as ChannelDto[];
      const current = get().activeChannel;
      const activeChannel = channels.find((c) => c.id === current?.id) ?? channels[0] ?? null;
      set({ channels, activeChannel });
    } catch {
      // ignore
    }
  },
}));

// Backwards compatibility alias
export { useAuthStore as default };
