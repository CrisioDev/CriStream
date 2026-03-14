// ── User Levels ──
export type UserLevel = "everyone" | "subscriber" | "vip" | "moderator" | "broadcaster";

// ── API Response ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Auth ──
export interface AuthUser {
  id: string;
  twitchId: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Channel ──
export interface ChannelDto {
  id: string;
  twitchId: string;
  displayName: string;
  botJoined: boolean;
  commandPrefix: string;
}

// ── Command ──
export interface CommandDto {
  id: string;
  trigger: string;
  response: string;
  cooldownSeconds: number;
  userLevel: UserLevel;
  enabled: boolean;
  useCount: number;
  channelId: string;
}

export interface CreateCommandDto {
  trigger: string;
  response: string;
  cooldownSeconds?: number;
  userLevel?: UserLevel;
  enabled?: boolean;
}

export interface UpdateCommandDto {
  trigger?: string;
  response?: string;
  cooldownSeconds?: number;
  userLevel?: UserLevel;
  enabled?: boolean;
}

// ── Timer ──
export interface TimerDto {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines: number;
  enabled: boolean;
  channelId: string;
}

export interface CreateTimerDto {
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines?: number;
  enabled?: boolean;
}

export interface UpdateTimerDto {
  name?: string;
  message?: string;
  intervalMinutes?: number;
  minChatLines?: number;
  enabled?: boolean;
}

// ── Moderation ──
export interface ModerationSettingsDto {
  id: string;
  channelId: string;
  linksEnabled: boolean;
  linksTimeoutDuration: number;
  capsEnabled: boolean;
  capsMinLength: number;
  capsThreshold: number;
  capsTimeoutDuration: number;
  symbolsEnabled: boolean;
  symbolsThreshold: number;
  symbolsTimeoutDuration: number;
  emotesEnabled: boolean;
  emotesMaxCount: number;
  emotesTimeoutDuration: number;
}

export interface UpdateModerationSettingsDto {
  linksEnabled?: boolean;
  linksTimeoutDuration?: number;
  capsEnabled?: boolean;
  capsMinLength?: number;
  capsThreshold?: number;
  capsTimeoutDuration?: number;
  symbolsEnabled?: boolean;
  symbolsThreshold?: number;
  symbolsTimeoutDuration?: number;
  emotesEnabled?: boolean;
  emotesMaxCount?: number;
  emotesTimeoutDuration?: number;
}

export type ModerationAction = "timeout" | "ban" | "delete" | "warn";

export interface ModerationActionDto {
  id: string;
  channelId: string;
  targetUser: string;
  filterName: string;
  action: ModerationAction;
  duration: number;
  message: string;
  createdAt: string;
}

// ── WebSocket Events ──
export interface WsEvents {
  "chat:message": {
    channel: string;
    user: string;
    message: string;
    badges: Record<string, string>;
    color?: string;
    timestamp: number;
  };
  "bot:status": {
    connected: boolean;
    channels: string[];
  };
  "moderation:action": ModerationActionDto;
  "command:executed": {
    channel: string;
    user: string;
    command: string;
    response: string;
  };
}

// ── Bot Status ──
export interface BotStatusDto {
  connected: boolean;
  uptime: number;
  channels: string[];
}
