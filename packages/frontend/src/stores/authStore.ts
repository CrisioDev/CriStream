import { create } from "zustand";
import type { AuthUser, ChannelDto } from "@streamguard/shared";
import { api } from "@/api/client";

interface AuthState {
  user: AuthUser | null;
  channel: ChannelDto | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  loadFromUrl: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  channel: null,
  token: localStorage.getItem("token"),
  isLoading: true,

  login: () => {
    window.location.href = "/api/auth/twitch";
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    set({ user: null, channel: null, token: null });
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

      // Fetch channel
      const channelsRes = await api.get("/channels");
      const channels = channelsRes.data as ChannelDto[];

      set({ user, channel: channels[0] ?? null, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, channel: null, token: null, isLoading: false });
    }
  },
}));
