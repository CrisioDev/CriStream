// ── User Levels ──
export type UserLevel = "everyone" | "subscriber" | "vip" | "moderator" | "broadcaster";

// ── API Response ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  overlayToken: string;
}

// ── Command ──
export interface CommandDto {
  id: string;
  trigger: string;
  response: string;
  cooldownSeconds: number;
  perUserCooldown: boolean;
  userLevel: UserLevel;
  enabled: boolean;
  useCount: number;
  aliases: string[];
  chain: string[];
  channelId: string;
}

export interface CreateCommandDto {
  trigger: string;
  response: string;
  cooldownSeconds?: number;
  perUserCooldown?: boolean;
  userLevel?: UserLevel;
  enabled?: boolean;
  aliases?: string[];
  chain?: string[];
}

export interface UpdateCommandDto {
  trigger?: string;
  response?: string;
  cooldownSeconds?: number;
  perUserCooldown?: boolean;
  userLevel?: UserLevel;
  enabled?: boolean;
  aliases?: string[];
  chain?: string[];
}

// ── Timer ──
export interface TimerDto {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines: number;
  enabled: boolean;
  twitchEnabled: boolean;
  discordEnabled: boolean;
  channelId: string;
}

export interface CreateTimerDto {
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines?: number;
  enabled?: boolean;
  twitchEnabled?: boolean;
  discordEnabled?: boolean;
}

export interface UpdateTimerDto {
  name?: string;
  message?: string;
  intervalMinutes?: number;
  minChatLines?: number;
  enabled?: boolean;
  twitchEnabled?: boolean;
  discordEnabled?: boolean;
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
  spamEnabled: boolean;
  spamMaxRepeat: number;
  spamWindowSeconds: number;
  spamTimeoutDuration: number;
  bannedWordsEnabled: boolean;
  bannedWordsTimeoutDuration: number;
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
  spamEnabled?: boolean;
  spamMaxRepeat?: number;
  spamWindowSeconds?: number;
  spamTimeoutDuration?: number;
  bannedWordsEnabled?: boolean;
  bannedWordsTimeoutDuration?: number;
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

// ── Banned Words ──
export interface BannedWordDto {
  id: string;
  pattern: string;
  isRegex: boolean;
  channelId: string;
}

export interface CreateBannedWordDto {
  pattern: string;
  isRegex?: boolean;
}

// ── Chat Logs ──
export interface ChatLogDto {
  id: string;
  twitchUserId: string;
  displayName: string;
  message: string;
  platform: string;
  channelId: string;
  createdAt: string;
}

export interface ChatLogSearchParams {
  user?: string;
  keyword?: string;
  from?: string;
  to?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}

// ── Points / Loyalty ──
export interface ChannelUserDto {
  id: string;
  twitchUserId: string;
  displayName: string;
  points: number;
  watchMinutes: number;
  channelId: string;
}

export interface PointsSettingsDto {
  id: string;
  enabled: boolean;
  pointsPerMessage: number;
  pointsPerInterval: number;
  intervalMinutes: number;
  channelId: string;
}

export interface UpdatePointsSettingsDto {
  enabled?: boolean;
  pointsPerMessage?: number;
  pointsPerInterval?: number;
  intervalMinutes?: number;
}

export interface LeaderboardEntry {
  rank: number;
  twitchUserId: string;
  displayName: string;
  points: number;
  watchMinutes: number;
}

// ── Song Requests ──
export interface SongRequestDto {
  id: string;
  title: string;
  url: string;
  duration: number;
  requestedBy: string;
  requestedAt: number;
}

export interface SongRequestSettingsDto {
  id: string;
  enabled: boolean;
  maxQueueSize: number;
  maxDurationSeconds: number;
  userCooldownSeconds: number;
  channelId: string;
}

export interface UpdateSongRequestSettingsDto {
  enabled?: boolean;
  maxQueueSize?: number;
  maxDurationSeconds?: number;
  userCooldownSeconds?: number;
}

// ── Channel Editors / RBAC ──
export type EditorRole = "editor" | "viewer";

export interface ChannelEditorDto {
  id: string;
  channelId: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  role: EditorRole;
  createdAt: string;
}

export interface InviteEditorDto {
  twitchUsername: string;
  role?: EditorRole;
}

// ── Alerts ──
export type AlertType =
  | "follow"
  | "sub"
  | "giftsub"
  | "raid"
  | "hypetrain"
  | "command"
  | "sound";

// ── Channel Points Rewards ──
export type RewardActionType = "sound" | "alert" | "command" | "chat_message" | "tts" | "webhook";

export interface RewardActionSound {
  type: "sound";
  soundFileUrl: string;
  volume: number;
}

export interface RewardActionAlert {
  type: "alert";
  textTemplate: string;
  imageFileUrl: string;
  duration: number;
  animationType: AnimationType;
  volume: number;
  soundFileUrl: string;
  layoutConfig?: OverlayLayoutConfig | null;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsVolume?: number;
  videoMuted?: boolean;
}

export interface RewardActionCommand {
  type: "command";
  commandTrigger: string;
}

export interface RewardActionChatMessage {
  type: "chat_message";
  messageTemplate: string;
}

export interface RewardActionTts {
  type: "tts";
  voice: string;
  maxLength: number;
}

export interface RewardActionWebhook {
  type: "webhook";
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate: string;
}

export type RewardAction =
  | RewardActionSound
  | RewardActionAlert
  | RewardActionCommand
  | RewardActionChatMessage
  | RewardActionTts
  | RewardActionWebhook;

export interface ChannelPointRewardDto {
  id: string;
  rewardId: string;
  rewardTitle: string;
  enabled: boolean;
  actionConfig: RewardAction[];
  cost: number;
  prompt: string;
  isUserInputRequired: boolean;
  maxPerStream: number | null;
  maxPerUserPerStream: number | null;
  globalCooldown: number | null;
  backgroundColor: string;
  isSynced: boolean;
  channelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelPointRewardDto {
  rewardTitle: string;
  enabled?: boolean;
  actionConfig: RewardAction[];
  cost?: number;
  prompt?: string;
  isUserInputRequired?: boolean;
  maxPerStream?: number | null;
  maxPerUserPerStream?: number | null;
  globalCooldown?: number | null;
  backgroundColor?: string;
}

export interface UpdateChannelPointRewardDto {
  rewardTitle?: string;
  enabled?: boolean;
  actionConfig?: RewardAction[];
  cost?: number;
  prompt?: string;
  isUserInputRequired?: boolean;
  maxPerStream?: number | null;
  maxPerUserPerStream?: number | null;
  globalCooldown?: number | null;
  backgroundColor?: string;
}

export type AnimationType = "slide" | "fade" | "bounce" | "zoom";

// ── Overlay Layout ──
export interface OverlayCanvas {
  width: number;
  height: number;
  background: string;
}

export interface OverlayTextElement {
  type: "text";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  textShadow: string;
  textStroke: string;
  backgroundColor: string;
  padding: number;
  borderRadius: number;
}

export interface OverlayImageElement {
  type: "image";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  objectFit: "contain" | "cover" | "fill";
}

export type OverlayElement = OverlayTextElement | OverlayImageElement;

export interface OverlayLayoutConfig {
  version: 1;
  canvas: OverlayCanvas;
  elements: OverlayElement[];
}

export interface AlertSettingsDto {
  id: string;
  alertType: AlertType;
  enabled: boolean;
  textTemplate: string;
  duration: number;
  animationType: AnimationType;
  soundFileUrl: string;
  imageFileUrl: string;
  volume: number;
  minAmount: number;
  channelId: string;
  layoutConfig: OverlayLayoutConfig | null;
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsVolume: number;
  videoMuted: boolean;
}

export interface UpdateAlertSettingsDto {
  enabled?: boolean;
  textTemplate?: string;
  duration?: number;
  animationType?: AnimationType;
  soundFileUrl?: string;
  imageFileUrl?: string;
  volume?: number;
  minAmount?: number;
  layoutConfig?: OverlayLayoutConfig | null;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsVolume?: number;
  videoMuted?: boolean;
}

// ── Sound Alerts ──
export interface SoundAlertDto {
  id: string;
  name: string;
  fileUrl: string;
  pointsCost: number;
  cooldownSeconds: number;
  volume: number;
  enabled: boolean;
  channelId: string;
}

export interface CreateSoundAlertDto {
  name: string;
  fileUrl: string;
  pointsCost?: number;
  cooldownSeconds?: number;
  volume?: number;
  enabled?: boolean;
}

export interface UpdateSoundAlertDto {
  name?: string;
  fileUrl?: string;
  pointsCost?: number;
  cooldownSeconds?: number;
  volume?: number;
  enabled?: boolean;
}

// ── Event Log ──
export interface EventLogDto {
  id: string;
  eventType: string;
  data: Record<string, unknown>;
  channelId: string;
  createdAt: string;
}

// ── Viewer Requests ──
export type RequestStatus = "open" | "done" | "rejected";

export interface ViewerRequestDto {
  id: string;
  displayName: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  channelId: string;
}

export interface CreateViewerRequestDto {
  displayName: string;
  message: string;
}

// ── Overlay ──
export interface OverlayAlertPayload {
  alertType: AlertType;
  text: string;
  duration: number;
  animationType: AnimationType;
  soundUrl: string;
  imageUrl: string;
  volume: number;
  layoutConfig?: OverlayLayoutConfig | null;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsVolume?: number;
  videoMuted?: boolean;
}

// ── WebSocket Events ──
export interface WsEvents {
  "chat:message": {
    channelId: string;
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
    channelId: string;
    channel: string;
    user: string;
    command: string;
    response: string;
  };
  "chatlog:flushed": {
    channelId: string;
    count: number;
  };
  "points:update": {
    channelId: string;
    twitchUserId: string;
    displayName: string;
    points: number;
  };
  "songrequest:added": {
    channelId: string;
    request: SongRequestDto;
  };
  "songrequest:skipped": {
    channelId: string;
  };
  "songrequest:queue": {
    channelId: string;
    queue: SongRequestDto[];
  };
  "alert:trigger": {
    channelId: string;
    payload: OverlayAlertPayload;
  };
  "songrequest:play": {
    channelId: string;
    song: SongRequestDto | null;
  };
  "songrequest:ended": {
    channelId: string;
  };
  "songrequest:volume": {
    channelId: string;
    volume: number;
  };
  "request:new": {
    channelId: string;
    request: ViewerRequestDto;
  };
  "request:update": {
    channelId: string;
    request: ViewerRequestDto;
  };
  "sound:play": {
    channelId: string;
    soundUrl: string;
    volume: number;
  };
  "eventsub:follow": {
    channelId: string;
    user: string;
  };
  "eventsub:sub": {
    channelId: string;
    user: string;
    tier: string;
  };
  "eventsub:giftsub": {
    channelId: string;
    user: string;
    amount: number;
    tier: string;
  };
  "eventsub:raid": {
    channelId: string;
    fromUser: string;
    viewers: number;
  };
  "eventsub:hypetrain": {
    channelId: string;
    level: number;
  };
  "eventsub:redemption": {
    channelId: string;
    user: string;
    rewardTitle: string;
    userInput: string;
  };
  "poll:update": {
    channelId: string;
    status: "active" | "ended";
    pollId: string;
    title: string;
    choices: Array<{ id: string; title: string; votes: number; channelPointsVotes: number }>;
    totalVotes: number;
    endsAt: string | null;
    endedAt: string | null;
  };
  "prediction:update": {
    channelId: string;
    status: "active" | "locked" | "ended";
    predictionId: string;
    title: string;
    outcomes: Array<{ id: string; title: string; color: string; users: number; channelPoints: number }>;
    locksAt: string | null;
    winningOutcomeId: string | null;
  };
}

// ── Twitch Channel Point Rewards (from Twitch API) ──
export interface TwitchRewardDto {
  id: string;
  title: string;
  cost: number;
  prompt: string;
  isEnabled: boolean;
  isPaused: boolean;
  isUserInputRequired: boolean;
  maxPerStream: number | null;
  maxPerUserPerStream: number | null;
  globalCooldown: number | null;
  backgroundColor: string;
  isManaged: boolean;
}

export interface CreateTwitchRewardDto {
  title: string;
  cost: number;
  prompt?: string;
  isEnabled?: boolean;
  isUserInputRequired?: boolean;
  maxPerStream?: number | null;
  maxPerUserPerStream?: number | null;
  globalCooldown?: number | null;
  backgroundColor?: string;
}

export interface UpdateTwitchRewardDto {
  title?: string;
  cost?: number;
  prompt?: string;
  isEnabled?: boolean;
  isPaused?: boolean;
  isUserInputRequired?: boolean;
  maxPerStream?: number | null;
  maxPerUserPerStream?: number | null;
  globalCooldown?: number | null;
  backgroundColor?: string;
}

// ── Discord Settings ──
export interface DiscordSettingsDto {
  id: string;
  channelId: string;
  guildId: string;
  commandChannelId: string;
  timerChannelId: string;
  summaryChannelId: string;
  notifyChannelId: string;
  commandsEnabled: boolean;
  timersEnabled: boolean;
  summariesEnabled: boolean;
  notificationsEnabled: boolean;
  hasBotToken: boolean;
  discordClientId: string;
}

export interface UpdateDiscordSettingsDto {
  guildId?: string;
  commandChannelId?: string;
  timerChannelId?: string;
  summaryChannelId?: string;
  notifyChannelId?: string;
  commandsEnabled?: boolean;
  timersEnabled?: boolean;
  summariesEnabled?: boolean;
  notificationsEnabled?: boolean;
}

// ── Poll & Prediction Settings ──
export interface PollPredictionSettingsDto {
  id: string;
  pollEnabled: boolean;
  predictionEnabled: boolean;
  resultDuration: number;
  position: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  barHeight: number;
  width: number;
  fontSize: number;
  channelId: string;
}

export interface UpdatePollPredictionSettingsDto {
  pollEnabled?: boolean;
  predictionEnabled?: boolean;
  resultDuration?: number;
  position?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  barHeight?: number;
  width?: number;
  fontSize?: number;
}

// ── Bot Status ──
export interface BotStatusDto {
  connected: boolean;
  uptime: number;
  channels: string[];
}
